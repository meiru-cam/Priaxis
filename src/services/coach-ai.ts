/**
 * Coach AI Service
 * Support OpenAI and Gemini dual modes "Coach" layer - Deep analysis and smart advice
 */

import { BaseAIService } from './ai-base';
import { useGameStore } from '../stores/game-store';
import type {
  HealthMetrics,
  InterventionTriggerType,
  AIAction,
  ConversationMessage,
  ConversationContext,
  AtRiskQuest,
} from '../types/planner';
import type { CustomTask, MainQuest } from '../types/task';
import { OFFLINE_TEMPLATES } from '../config/intervention-triggers';
import {
  buildCoachConversationPrompt,
  buildInitialCoachPrompt,
  getCoachEndKeywords,
  getCoachFallbackResponse,
  getCoachFollowupActions,
  getCoachSuggestedActions,
  getCoachSystemPrompt,
} from './coach-ai-content';

// ==================== Types ====================

export interface CoachResponse {
  message: string;
  suggestedActions?: AIAction[];
  analysis?: {
    rootCause?: string;
    patterns?: string[];
    recommendations?: string[];
  };
  shouldClose?: boolean;
}

export interface TaskContext {
  tasks: CustomTask[];
  quests: MainQuest[];
  atRiskQuests: AtRiskQuest[];
}

// ==================== Coach AI Class ====================

export class CoachAI extends BaseAIService {
  private language: 'zh' | 'en' = 'zh';

  constructor() {
    super({
      role: 'coach',
      systemPrompt: getCoachSystemPrompt('zh')
    });
  }

  setLanguage(lang: 'zh' | 'en') {
    this.language = lang;
    this.setSystemPrompt(getCoachSystemPrompt(lang));
  }

  /**
   * General chat method - Supports Function Calling and multi-turn conversation
   */
  async chat(
    userMessage: string,
    history: Array<{ role: 'user' | 'model'; content: string; toolsExecuted?: Array<{ name: string; result: unknown }> }> = []
  ): Promise<{ message: string; toolsExecuted: { name: string; result: unknown }[] }> {
    if (!this.checkAvailability()) {
      return {
        message: this.language === 'zh' ? '抱歉，AI Coach 暂时不可用。请稍后再试。' : 'Sorry, AI Coach is temporarily unavailable. Please try again later.',
        toolsExecuted: []
      };
    }

    try {
      // Inject Game State Context (Quests)
      const state = useGameStore.getState();
      const activeQuests = state.mainQuests.filter(q => q.status === 'active');
      const isZh = this.language === 'zh';

      let contextPrefix = '';
      if (activeQuests.length > 0) {
        const questList = activeQuests.map(q => `ID: "${q.id}" (${isZh ? '标题' : 'Title'}: "${q.title}")`).join('; ');
        contextPrefix += `[${isZh ? '系统上下文: 当前活跃副本/主线' : 'System Context: Active Quests'}: ${questList}]\n`;
      }
      const beliefs = state.beliefSystem.mode === 'profile' && state.beliefSystem.profileBeliefs.length > 0
        ? state.beliefSystem.profileBeliefs
        : (isZh
          ? ['先完成再优化', '行动产生反馈', '小步快跑更可持续', '尊重精力边界', '长期主义']
          : ['Done before perfect', 'Action creates feedback', 'Small steps compound', 'Respect energy limits', 'Think long-term']);
      contextPrefix += `[${isZh ? '系统上下文: 生效信念' : 'System Context: Effective Beliefs'}: ${beliefs.join(isZh ? '；' : '; ')}]\n`;
      contextPrefix += `[${isZh ? '系统上下文: 世界观档案' : 'System Context: Lore Profile'}: theme=${state.loreProfile.worldTheme}, archetype=${state.loreProfile.playerArchetype}, tone=${state.loreProfile.preferredTone}]\n`;

      // Inject Incomplete Tasks
      const incompleteTasks = state.customTasks.filter(t => !t.completed && t.status !== 'completed').slice(0, 15);
      if (incompleteTasks.length > 0) {
        const taskList = incompleteTasks.map(t => `- ${t.name} (${isZh ? '优先级' : 'Priority'}: ${t.importance})`).join('\n');
        contextPrefix += `[${isZh ? '系统上下文: 当前待办任务 (Top 15)' : 'System Context: Pending Tasks (Top 15)'}]\n${taskList}\n\n`;
      }

      // Convert history to Gemini Content[] format (limit to last 10 messages)
      const conversationHistory = history.slice(-10).map(msg => {
        let text = msg.content;
        if (msg.role === 'model' && msg.toolsExecuted && msg.toolsExecuted.length > 0) {
          const logs = msg.toolsExecuted.map(t =>
            `[System Log: Tool '${t.name}' executed. Result: ${JSON.stringify(t.result)}]`
          ).join('\n');
          text += `\n${logs}`;
        }
        return {
          role: msg.role as 'user' | 'model',
          parts: [{ text }]
        };
      });

      const result = await this.callAIWithTools(contextPrefix + userMessage, conversationHistory);

      if (this.isRateLimited) {
        return {
          message: isZh
            ? '从服务器接收数据的通道拥堵 (API 限流)。请休息一分钟后再试。⏳'
            : 'Data channel congested (Rate Limited). Please rest for a minute. ⏳',
          toolsExecuted: []
        };
      }

      return {
        message: result.textResponse || (isZh ? '抱歉，我没有理解你的意思。可以换个方式说吗？' : 'Sorry, I didn\'t understand. Could you rephrase?'),
        toolsExecuted: result.toolsExecuted
      };
    } catch (error) {
      console.error('[CoachAI] Chat failed:', error);
      return {
        message: this.language === 'zh' ? '处理消息时遇到了问题，请稍后重试。' : 'Problem processing message, please try again.',
        toolsExecuted: []
      };
    }
  }

  /**
   * Generate initial intervention response
   */
  async getInitialResponse(
    triggerType: InterventionTriggerType,
    metrics: HealthMetrics,
    context?: TaskContext
  ): Promise<CoachResponse> {
    if (!this.checkAvailability()) {
      return this.getFallbackResponse(triggerType, metrics);
    }

    try {
      // Reset conversation for new intervention
      this.resetConversation();

      const prompt = buildInitialCoachPrompt(this.language, triggerType, metrics, context);
      const response = await this.callAI(prompt, false);

      if (!response) {
        return this.getFallbackResponse(triggerType, metrics);
      }

      return this.parseCoachResponse(response, triggerType);
    } catch (error) {
      console.error('[CoachAI] Initial response failed:', error);
      return this.getFallbackResponse(triggerType, metrics);
    }
  }

  /**
   * Handle user response
   */
  async respondToUser(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    context: ConversationContext,
    taskContext?: TaskContext
  ): Promise<CoachResponse> {
    if (!this.checkAvailability()) {
      return this.getFallbackUserResponse(userMessage);
    }

    try {
      const prompt = buildCoachConversationPrompt(this.language, userMessage, conversationHistory, context, taskContext);
      // Continue the conversation if we have history
      const continueConversation = conversationHistory.length > 0;
      const response = await this.callAI(prompt, continueConversation);

      if (!response) {
        return this.getFallbackUserResponse(userMessage);
      }

      return this.parseUserResponse(response, userMessage);
    } catch (error) {
      console.error('[CoachAI] User response failed:', error);
      return this.getFallbackUserResponse(userMessage);
    }
  }

  /**
   * Task breakdown suggestion
   */
  async breakdownTask(
    task: CustomTask | MainQuest,
    userContext?: string
  ): Promise<CoachResponse> {
    const isZh = this.language === 'zh';
    const fallbackResponse = {
      message: isZh
        ? '让我帮你思考如何拆分这个任务 📝\n\n建议的步骤：\n1. 明确最终目标是什么\n2. 列出达到目标需要的主要阶段\n3. 每个阶段再分成30分钟内可完成的小任务\n4. 给每个小任务设定明确的完成标准\n\n你想从哪个方面开始？'
        : 'Let me help you break this down 📝\n\nSuggested steps:\n1. Define the goal\n2. List major phases\n3. Break phases into 30-min tasks\n4. Set clear criteria for each\n\nWhere to start?',
      suggestedActions: isZh ? [
        { id: 'goal', type: 'reflect' as const, label: '先明确目标', description: '理清最终要达到什么', requiresConfirmation: false },
        { id: 'steps', type: 'task_breakdown' as const, label: '列出步骤', description: '分解成小任务', requiresConfirmation: false },
      ] : [
        { id: 'goal', type: 'reflect' as const, label: 'Define Goal', description: 'Clarify end state', requiresConfirmation: false },
        { id: 'steps', type: 'task_breakdown' as const, label: 'List Steps', description: 'Break into tasks', requiresConfirmation: false },
      ],
    };

    if (!this.checkAvailability()) {
      return fallbackResponse;
    }

    try {
      // Reset conversation for new task breakdown
      this.resetConversation();

      const prompt = isZh ? `用户有一个任务需要拆分：

任务名称：${'name' in task ? task.name : task.title}
任务描述：${task.description || '(无描述)'}
${userContext ? `用户补充：${userContext}` : ''}

请帮助用户将这个任务拆分成更小、更可执行的步骤。

要求：
1. 分析这个任务的核心目标
2. 提供 3-5 个子任务，每个应该：
   - 可以在 30 分钟到 2 小时内完成
   - 有明确的完成标准
   - 按逻辑顺序排列
3. 对每个子任务给出简短说明
4. 如果任务不够清晰，先问一个关键问题来澄清

用简洁的列表格式回复，总字数不超过 300 字。` : `User has a task to breakdown:

Task Name: ${'name' in task ? task.name : task.title}
Description: ${task.description || '(None)'}
${userContext ? `User input: ${userContext}` : ''}

Help break this into smaller, actionable steps.

Requirements:
1. Analyze core goal.
2. Provide 3-5 subtasks, each should:
   - Be doable in 30min - 2h
   - Have clear criteria
   - Be in logical order
3. Brief explanation for each.
4. If unclear, ask a key clarification question.

Reply in concise list format, < 300 words.`;

      const response = await this.callAI(prompt, false);

      if (!response) {
        return fallbackResponse;
      }

      return {
        message: response,
        suggestedActions: isZh ? [
          { id: 'create_tasks', type: 'task_breakdown', label: '创建这些子任务', description: '将建议转化为实际任务', requiresConfirmation: true },
          { id: 'modify', type: 'reflect', label: '需要调整', description: '修改拆分方案', requiresConfirmation: false },
          { id: 'good', type: 'encourage', label: '这样就好', description: '我自己来创建', requiresConfirmation: false },
        ] : [
          { id: 'create_tasks', type: 'task_breakdown', label: 'Create Tasks', description: 'Convert to tasks', requiresConfirmation: true },
          { id: 'modify', type: 'reflect', label: 'Adjust', description: 'Modify plan', requiresConfirmation: false },
          { id: 'good', type: 'encourage', label: 'Looks Good', description: 'I\'ll create them', requiresConfirmation: false },
        ],
      };
    } catch (error) {
      console.error('[CoachAI] Task breakdown failed:', error);
      return {
        message: isZh
          ? '抱歉，分析时遇到了问题。让我用简单的方法帮你：\n\n把这个任务想象成做一道菜，你需要：\n1. 准备食材（收集必要的信息/工具）\n2. 处理食材（前置准备工作）\n3. 烹饪（核心工作）\n4. 装盘（收尾和检查）\n\n你的任务对应哪些步骤？'
          : 'Sorry, problem analyzing. Try this simple method:\n\nImagine cooking a meal:\n1. Prep ingredients (resources)\n2. Process (prep work)\n3. Cook (core work)\n4. Plate (finish/check)\n\nWhich steps apply to your task?',
      };
    }
  }

  /**
   * MoSCoW prioritization suggestion
   */
  async suggestMoSCoW(
    tasks: (CustomTask | MainQuest)[],
    deadline?: string
  ): Promise<CoachResponse> {
    const isZh = this.language === 'zh';
    const fallbackResponse = {
      message: isZh
        ? '让我帮你用 MoSCoW 框架分析这些任务 📊\n\n问自己：\n- 哪些是 **Must Do**（不做就失败）？\n- 哪些是 **Should Do**（做了更好）？\n- 哪些是 **Could Do**（锦上添花）？\n- 哪些是 **Won\'t Do**（这次不做）？\n\n通常 Must Do 不应超过总任务的 20%。'
        : 'Let\'s analyze with MoSCoW 📊\n\nAsk yourself:\n- **Must Do** (Fail if not done)?\n- **Should Do** (Better if done)?\n- **Could Do** (Nice to have)?\n- **Won\'t Do** (Skip)?\n\nKeep Must Do under 20%.',
    };

    if (!this.checkAvailability()) {
      return fallbackResponse;
    }

    try {
      // Reset conversation for new MoSCoW analysis
      this.resetConversation();

      const taskList = tasks.map((t, i) =>
        `${i + 1}. ${'name' in t ? t.name : t.title}${t.deadline ? ` (截止: ${t.deadline})` : ''}`
      ).join('\n');

      const prompt = isZh ? `用户需要帮助确定以下任务的优先级：

${taskList}
${deadline ? `整体截止日期：${deadline}` : ''}

请使用 MoSCoW 框架分析，给出建议：

1. 对每个任务建议其 MoSCoW 分类
2. 解释为什么这样分类（简短）
3. 如果有任务信息不足，指出需要澄清的地方
4. 给出一句总结性建议

记住：
- Must Do 通常不超过 20%
- 警惕完美主义（过多的 Must）
- 有些任务可能其实是 Won't Do

用清晰的格式回复，总字数不超过 400 字。` : `User needs prioritization help:

${taskList}
${deadline ? `Overall Deadline: ${deadline}` : ''}

Analyze using MoSCoW framework:

1. Suggest MoSCoW category for each task.
2. Briefly explain why.
3. Identify unclear tasks.
4. Summary advice.

Remember:
- Must Do < 20%
- Watch out for perfectionism
- Some tasks might be Won't Do

Reply in clear format, < 400 words.`;

      const response = await this.callAI(prompt, false);

      if (!response) {
        return fallbackResponse;
      }

      return {
        message: response,
        suggestedActions: isZh ? [
          { id: 'apply', type: 'moscow_update', label: '应用这个分类', description: '更新任务优先级', requiresConfirmation: true },
          { id: 'discuss', type: 'reflect', label: '再讨论一下', description: '我有不同想法', requiresConfirmation: false },
        ] : [
          { id: 'apply', type: 'moscow_update', label: 'Apply', description: 'Update priorities', requiresConfirmation: true },
          { id: 'discuss', type: 'reflect', label: 'Discuss', description: 'I have other ideas', requiresConfirmation: false },
        ],
      };
    } catch (error) {
      console.error('[CoachAI] MoSCoW suggestion failed:', error);
      return {
        message: isZh
          ? '抱歉，分析时遇到了问题。你可以自己快速做个判断：\n\n对每个任务问一个问题："如果这个任务不做，最坏会发生什么？"\n\n- 如果答案是"灾难性后果" → Must Do\n- 如果答案是"有点麻烦但能接受" → Should Do\n- 如果答案是"其实没什么" → Could Do 或 Won\'t Do'
          : 'Analysis problem. Quick self-check:\n\nAsk "What\'s the worst if I skip this?"\n\n- "Disaster" → Must Do\n- "Annoying but manageable" → Should Do\n- "Not much" → Could Do / Won\'t Do',
      };
    }
  }

  /**
   * Pruning decision support
   */
  async evaluatePruning(
    quest: MainQuest,
    metrics: HealthMetrics
  ): Promise<CoachResponse> {
    const isZh = this.language === 'zh';
    const fallbackResponse = {
      message: isZh
        ? `关于「${quest.title}」的剪枝决策 ✂️\n\n当前进度：${quest.progress || 0}%\n截止日期：${quest.deadline || '未设置'}\n\n问自己：\n1. 这个副本对我的长期目标有多重要？\n2. 如果放弃，最坏的结果是什么？\n3. 继续投入是否值得？\n\n有时候，战略性放弃比坚持更明智。`
        : `Pruning decision for "${quest.title}" ✂️\n\nProgress: ${quest.progress || 0}%\nDeadline: ${quest.deadline || 'None'}\n\nAsk yourself:\n1. How important is this for long-term goals?\n2. Worst case if dropped?\n3. Is it worth continuing?\n\nSometimes quitting is smarter.`,
      suggestedActions: isZh ? [
        { id: 'prune', type: 'quest_prune' as const, label: '放弃这个副本', description: '聚焦更重要的事', requiresConfirmation: true },
        { id: 'extend', type: 'deadline_extend' as const, label: '延长截止日期', description: '给自己更多时间', requiresConfirmation: true },
        { id: 'keep', type: 'encourage' as const, label: '继续坚持', description: '我要完成它', requiresConfirmation: false },
      ] : [
        { id: 'prune', type: 'quest_prune' as const, label: 'Drop Quest', description: 'Focus on other things', requiresConfirmation: true },
        { id: 'extend', type: 'deadline_extend' as const, label: 'Extend Deadline', description: 'More time', requiresConfirmation: true },
        { id: 'keep', type: 'encourage' as const, label: 'Keep Going', description: 'I want to finish', requiresConfirmation: false },
      ],
    };

    if (!this.checkAvailability()) {
      return fallbackResponse;
    }

    try {
      // Reset conversation for new pruning evaluation
      this.resetConversation();

      const prompt = isZh ? `用户有一个副本（大型任务/项目）可能需要剪枝：

副本名称：${quest.title}
描述：${quest.description || '(无)'}
当前进度：${quest.progress || 0}%
截止日期：${quest.deadline || '未设置'}
状态：${quest.status}

当前用户状态：
- 逾期任务数：${metrics.overdueTasksCount}
- 今日完成率：${metrics.todayCompletionRate.toFixed(0)}%
- 风险副本数：${metrics.atRiskQuests.length}

请帮助用户做剪枝决策：

1. 分析继续这个副本的利弊
2. 分析放弃/降级的利弊
3. 给出你的建议（继续/放弃/修改）
4. 如果建议继续，给出如何加速的建议
5. 如果建议放弃，帮用户减轻心理负担

用温和但直接的方式回复，总字数不超过 250 字。` : `User might need to prune a Quest:

Quest: ${quest.title}
Description: ${quest.description || '(None)'}
Progress: ${quest.progress || 0}%
Deadline: ${quest.deadline || 'None'}
Status: ${quest.status}

User Status:
- Overdue tasks: ${metrics.overdueTasksCount}
- Today's completion: ${metrics.todayCompletionRate.toFixed(0)}%
- Risk Quests: ${metrics.atRiskQuests.length}

Help make a decision:

1. Pros/cons of continuing.
2. Pros/cons of dropping.
3. Your advice (Continue/Drop/Modify).
4. If continue, how to accelerate?
5. If drop, relieve guilt.

Reply gently but directly, < 250 words.`;

      const response = await this.callAI(prompt, false);

      if (!response) {
        return fallbackResponse;
      }

      return {
        message: response,
        suggestedActions: isZh ? [
          { id: 'prune', type: 'quest_prune', label: '放弃', description: '接受建议放弃', requiresConfirmation: true },
          { id: 'extend', type: 'deadline_extend', label: '延期', description: '延长截止日期', requiresConfirmation: true },
          { id: 'accelerate', type: 'priority_change', label: '加速', description: '集中精力完成', requiresConfirmation: false },
          { id: 'think', type: 'reflect', label: '再想想', description: '我需要更多时间考虑', requiresConfirmation: false },
        ] : [
          { id: 'prune', type: 'quest_prune', label: 'Drop', description: 'Accept advice', requiresConfirmation: true },
          { id: 'extend', type: 'deadline_extend', label: 'Extend', description: 'Extend deadline', requiresConfirmation: true },
          { id: 'accelerate', type: 'priority_change', label: 'Accelerate', description: 'Focus', requiresConfirmation: false },
          { id: 'think', type: 'reflect', label: 'Thinking', description: 'More time needed', requiresConfirmation: false },
        ],
      };
    } catch (error) {
      console.error('[CoachAI] Pruning evaluation failed:', error);
      return {
        message: isZh
          ? `关于「${quest.title}」，让我分享一个思考框架 🤔\n\n**沉没成本谬误**：已经投入的时间不应该影响你的决定。重要的是：从现在开始，继续投入是否值得？\n\n你觉得继续做这个副本，能带来的价值是什么？`
          : `For "${quest.title}", consider this 🤔\n\n**Sunk Cost Fallacy**: Don't let past effort bias you. Question is: Is future effort worth it?\n\nWhat value does continuing this quest bring?`,
        suggestedActions: isZh ? [
          { id: 'valuable', type: 'encourage', label: '很有价值', description: '我要继续', requiresConfirmation: false },
          { id: 'not_sure', type: 'reflect', label: '不太确定', description: '帮我分析', requiresConfirmation: false },
          { id: 'not_valuable', type: 'quest_prune', label: '其实不那么重要', description: '考虑放弃', requiresConfirmation: true },
        ] : [
          { id: 'valuable', type: 'encourage', label: 'Valuable', description: 'Continue', requiresConfirmation: false },
          { id: 'not_sure', type: 'reflect', label: 'Not Sure', description: 'Help analyze', requiresConfirmation: false },
          { id: 'not_valuable', type: 'quest_prune', label: 'Not Important', description: 'Consider dropping', requiresConfirmation: true },
        ],
      };
    }
  }

  // ==================== Private Methods ====================

  private parseCoachResponse(response: string, triggerType: InterventionTriggerType): CoachResponse {
    return {
      message: response,
      suggestedActions: getCoachSuggestedActions(this.language, triggerType),
    };
  }

  private parseUserResponse(response: string, userMessage: string): CoachResponse {
    const endKeywords = getCoachEndKeywords(this.language);
    const shouldClose = endKeywords.some(k => userMessage.toLowerCase().includes(k)) && response.length < 100;

    return {
      message: response,
      suggestedActions: shouldClose ? [] : getCoachFollowupActions(this.language),
      shouldClose,
    };
  }

  private getFallbackResponse(triggerType: InterventionTriggerType, metrics: HealthMetrics): CoachResponse {
    return getCoachFallbackResponse(this.language, triggerType, metrics);
  }

  private getFallbackUserResponse(userMessage: string): CoachResponse {
    // Check for specific keywords
    if (userMessage.includes('拆分') || userMessage.includes('分解') || userMessage.includes('break') || userMessage.includes('split')) {
      return {
        message: OFFLINE_TEMPLATES.five_minute_start.response,
      };
    }

    if (userMessage.includes('焦虑') || userMessage.includes('担心') || userMessage.includes('worry') || userMessage.includes('anxious')) {
      return {
        message: OFFLINE_TEMPLATES.worry_vs_facts.response,
      };
    }

    if (userMessage.includes('卡住') || userMessage.includes('阻碍') || userMessage.includes('stuck') || userMessage.includes('block')) {
      return {
        message: OFFLINE_TEMPLATES.blocker_checklist.response,
      };
    }

    return {
      message: OFFLINE_TEMPLATES.coach_unavailable.response,
    };
  }
}

// Singleton export
export const coachAI = new CoachAI();
