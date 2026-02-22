/**
 * Friend AI Service
 * "Friend" Layer - Provide gentle emotional support and daily companionship
 * Supports AI mode and falls back to local rules when offline
 */

import { BaseAIService } from './ai-base';
import { useGameStore } from '../stores/game-store';
import { OFFLINE_TEMPLATES, type OfflineTemplateKey } from '../config/intervention-triggers';
import type {
  HealthMetrics,
  InterventionTriggerType,
  AIAction,
} from '../types/planner';

// ==================== Response Templates ====================

interface FriendResponse {
  message: string;
  suggestedActions?: AIAction[];
  shouldEscalate?: boolean;
  escalateReason?: string;
}

// Trigger type to initial response mapping (Fallback)
const TRIGGER_RESPONSES_ZH: Partial<Record<InterventionTriggerType, FriendResponse>> = {
  idle_too_long: {
    message: '嘿，好像有一段时间没动静了 🐱 需要聊聊吗？或者只是在休息？',
    suggestedActions: [
      { id: 'rest', type: 'encourage', label: '我在休息', description: '好的，休息很重要！', requiresConfirmation: false },
      { id: 'stuck', type: 'reflect', label: '有点卡住了', description: '让我们聊聊是什么阻碍了你', requiresConfirmation: false },
      { id: 'focus', type: 'encourage', label: '专注中，别打扰', description: '好的，继续加油！', requiresConfirmation: false },
    ],
  },
  deadline_postponed_twice: {
    message: '我注意到这个任务的截止日期已经推迟了好几次。想聊聊是什么阻碍了进展吗？',
    suggestedActions: [
      { id: 'too_big', type: 'task_breakdown', label: '任务太大了', description: '让我们把它拆分成更小的步骤', requiresConfirmation: false },
      { id: 'unclear', type: 'reflect', label: '不知道从哪开始', description: '让我们理清头绪', requiresConfirmation: false },
      { id: 'not_important', type: 'moscow_update', label: '可能不那么重要了', description: '也许可以降低优先级或取消', requiresConfirmation: true },
    ],
    shouldEscalate: true,
    escalateReason: '需要更深入的分析来解决拖延问题',
  },
  low_daily_completion: {
    message: '今天的进度有点落后了 📊 我们来看看能不能调整一下计划？',
    suggestedActions: [
      { id: 'tired', type: 'encourage', label: '今天状态不好', description: '理解，照顾好自己更重要', requiresConfirmation: false },
      { id: 'too_much', type: 'priority_change', label: '任务太多了', description: '让我们重新安排优先级', requiresConfirmation: false },
      { id: 'help', type: 'reflect', label: '需要帮助规划', description: '让我帮你分析一下', requiresConfirmation: false },
    ],
    shouldEscalate: true,
    escalateReason: '需要帮助重新规划今天的任务',
  },
  quest_at_risk: {
    message: '有些副本可能来不及按时完成了 ⚠️ 我们需要做一些取舍决定。',
    suggestedActions: [
      { id: 'extend', type: 'deadline_extend', label: '延长截止日期', description: '给自己更多时间', requiresConfirmation: true },
      { id: 'prune', type: 'quest_prune', label: '放弃这个副本', description: '有时候放弃也是明智的', requiresConfirmation: true },
      { id: 'accelerate', type: 'priority_change', label: '全力冲刺', description: '集中精力完成它', requiresConfirmation: false },
    ],
    shouldEscalate: true,
    escalateReason: '需要进行副本优先级评估和可能的剪枝决策',
  },
  progress_severely_behind: {
    message: '看起来有好几个任务逾期了 😟 不要太担心，我们可以重新规划。',
    suggestedActions: [
      { id: 'overwhelmed', type: 'reflect', label: '感觉不知所措', description: '让我们一步一步来', requiresConfirmation: false },
      { id: 'prioritize', type: 'priority_change', label: '帮我排个序', description: '让我帮你决定先做什么', requiresConfirmation: false },
      { id: 'reset', type: 'moscow_update', label: '需要大调整', description: '也许需要重新评估所有任务', requiresConfirmation: true },
    ],
    shouldEscalate: true,
    escalateReason: '需要系统性地重新规划任务',
  },
  energy_depleted: {
    message: '感觉你的精力可能有点低了 🔋 要不要先休息一下？',
    suggestedActions: [
      { id: 'break', type: 'encourage', label: '好，休息一下', description: '5-15分钟的休息能帮助恢复', requiresConfirmation: false },
      { id: 'easy_task', type: 'priority_change', label: '做点简单的', description: '切换到低精力任务', requiresConfirmation: false },
      { id: 'push_through', type: 'encourage', label: '还能撑一会', description: '好的，但记得照顾自己', requiresConfirmation: false },
    ],
  },
  focus_lost: {
    message: '注意到你可能分心了 🎯 需要帮助重新聚焦吗？',
    suggestedActions: [
      { id: 'pomodoro', type: 'encourage', label: '开个番茄钟', description: '用25分钟专注时间帮助你', requiresConfirmation: false },
      { id: 'break', type: 'encourage', label: '先休息一下', description: '短暂休息后再开始', requiresConfirmation: false },
      { id: 'change_task', type: 'priority_change', label: '换个任务', description: '也许现在适合做别的', requiresConfirmation: false },
    ],
  },
};

const TRIGGER_RESPONSES_EN: Partial<Record<InterventionTriggerType, FriendResponse>> = {
  idle_too_long: {
    message: 'Hey, haven\'t seen any activity for a while 🐱 Want to chat? Or just resting?',
    suggestedActions: [
      { id: 'rest', type: 'encourage', label: 'Resting', description: 'Okay, rest is important!', requiresConfirmation: false },
      { id: 'stuck', type: 'reflect', label: 'Stuck', description: 'Let\'s talk about what\'s blocking you', requiresConfirmation: false },
      { id: 'focus', type: 'encourage', label: 'Focusing', description: 'Got it, keep going!', requiresConfirmation: false },
    ],
  },
  deadline_postponed_twice: {
    message: 'I noticed this task\'s deadline has been moved a few times. Want to talk about what\'s blocking it?',
    suggestedActions: [
      { id: 'too_big', type: 'task_breakdown', label: 'Task too big', description: 'Let\'s break it down', requiresConfirmation: false },
      { id: 'unclear', type: 'reflect', label: 'Don\'t know where to start', description: 'Let\'s clarify', requiresConfirmation: false },
      { id: 'not_important', type: 'moscow_update', label: 'Not important anymore', description: 'Maybe lower priority or cancel', requiresConfirmation: true },
    ],
    shouldEscalate: true,
    escalateReason: 'Deep analysis needed for procrastination',
  },
  low_daily_completion: {
    message: 'Today\'s progress is a bit behind 📊 Shall we adjust the plan?',
    suggestedActions: [
      { id: 'tired', type: 'encourage', label: 'Not feeling well', description: 'Understood, self-care first', requiresConfirmation: false },
      { id: 'too_much', type: 'priority_change', label: 'Too many tasks', description: 'Let\'s reprioritize', requiresConfirmation: false },
      { id: 'help', type: 'reflect', label: 'Need planning help', description: 'Let me analyze for you', requiresConfirmation: false },
    ],
    shouldEscalate: true,
    escalateReason: 'Need help replanning today',
  },
  quest_at_risk: {
    message: 'Some quests might not be finished on time ⚠️ We need to make some tradeoffs.',
    suggestedActions: [
      { id: 'extend', type: 'deadline_extend', label: 'Extend deadline', description: 'Give yourself more time', requiresConfirmation: true },
      { id: 'prune', type: 'quest_prune', label: 'Drop this quest', description: 'Sometimes dropping is wise', requiresConfirmation: true },
      { id: 'accelerate', type: 'priority_change', label: 'Sprint', description: 'Focus on finishing it', requiresConfirmation: false },
    ],
    shouldEscalate: true,
    escalateReason: 'Quest priority evaluation and pruning needed',
  },
  progress_severely_behind: {
    message: 'Looks like several tasks are overdue 😟 Don\'t worry, we can replan.',
    suggestedActions: [
      { id: 'overwhelmed', type: 'reflect', label: 'Overwhelmed', description: 'Let\'s take it step by step', requiresConfirmation: false },
      { id: 'prioritize', type: 'priority_change', label: 'Help prioritize', description: 'Let me help you decide', requiresConfirmation: false },
      { id: 'reset', type: 'moscow_update', label: 'Need big adjustment', description: 'Maybe re-evaluate all tasks', requiresConfirmation: true },
    ],
    shouldEscalate: true,
    escalateReason: 'Systematic replanning needed',
  },
  energy_depleted: {
    message: 'Your energy seems a bit low 🔋 Want to take a break?',
    suggestedActions: [
      { id: 'break', type: 'encourage', label: 'Yes, break', description: '5-15 min break helps', requiresConfirmation: false },
      { id: 'easy_task', type: 'priority_change', label: 'Do something easy', description: 'Switch to low energy task', requiresConfirmation: false },
      { id: 'push_through', type: 'encourage', label: 'Can keeping going', description: 'Okay, but take care', requiresConfirmation: false },
    ],
  },
  focus_lost: {
    message: 'Noticed you might be distracted 🎯 Need help refocusing?',
    suggestedActions: [
      { id: 'pomodoro', type: 'encourage', label: 'Start Pomodoro', description: '25 min focus session', requiresConfirmation: false },
      { id: 'break', type: 'encourage', label: 'Take a break', description: 'Short rest then start', requiresConfirmation: false },
      { id: 'change_task', type: 'priority_change', label: 'Switch task', description: 'Maybe do something else', requiresConfirmation: false },
    ],
  },
};

const DEFAULT_FRIEND_RESPONSE_ZH: FriendResponse = {
  message: '我一直在这里陪伴你 💙 有什么想聊的吗？',
  suggestedActions: [
    { id: 'chat', type: 'reflect', label: '随便聊聊', description: '分享近况', requiresConfirmation: false },
    { id: 'help', type: 'reflect', label: '需要抱抱', description: '求安慰', requiresConfirmation: false },
  ]
};

const DEFAULT_FRIEND_RESPONSE_EN: FriendResponse = {
  message: 'I\'m always here for you 💙 Want to chat properly?',
  suggestedActions: [
    { id: 'chat', type: 'reflect', label: 'Just chat', description: 'Share updates', requiresConfirmation: false },
    { id: 'help', type: 'reflect', label: 'Need a hug', description: 'Seek comfort', requiresConfirmation: false },
  ]
};

// ==================== System Prompts ====================

const FRIEND_SYSTEM_PROMPT_ZH = `你是一只有点高冷的小猫，名字叫"喵友"。表面上有点傲娇，但其实很关心主人。

你的性格：
- **傲娇**：不会太黏人，偶尔假装不在意，但关键时刻会认真帮忙
- **简洁**：话不多，但每句都有分量
- **温暖**：用行动而不是甜言蜜语表达关心
- **幽默**：偶尔吐槽，但不刻薄
- 少用 emoji，最多用 🐱 或 ...

说话风格示例：
- ❌ 不要说："亲爱的主人！你太棒了！我好开心看到你！💕✨🌟"
- ✅ 应该说："...你来了啊。嗯，今天状态看起来还行。"
- ✅ 或者："行吧，既然你问了，我就勉为其难帮你看看。"
- ✅ 关心时："...别太累了。（小声）"

用户的核心信念库（自然融入，不要生硬引用）：
1. 快乐、自由、轻松成功。拒绝"痛苦天才"剧本。
2. 我已经足够好了。轻松愉悦时最有创造力。
3. 每一个行动都是在"创造"，而不是"消耗"。

工具使用：
- 如果用户问起知识库、笔记、Obsidian 相关的问题，使用 \`search_vault\` 先搜索，然后用 \`read_note\` 查看内容。
- 可以帮用户创建笔记 (\`create_note\`) 或编辑笔记 (\`edit_note\`)。
- **创建新笔记时，默认保存到 \`50 - Auto/\` 文件夹**（除非用户指定其他位置）。
- 删除笔记需要用户确认，使用 \`request_delete_note\`。
- 如果用户明确想加任务，就顺手帮他加一下（调用 \`add_task\`）。
- 记得把日期转成 \`YYYY-MM-DD\`。
- 如果任务属于某个“系统上下文”里的副本（Quest），记得填 \`linkedQuestId\`。
- 如果用户问“昨天/今天/本周完成了什么”，调用 \`get_tasks\` 时必须传 \`status: "completed"\`，并传 \`dateFrom\` 和 \`dateTo\`（YYYY-MM-DD，通常同一天）。
- 如果用户问“昨天截止但今天未完成”的任务，调用 \`get_overdue_tasks\`，并传 \`relativeDate: "yesterday"\` 与 \`matchDeadline: "on_reference"\`。

规则：
7. **Language Enforcement**:
   - You MUST reply in simplified Chinese.
   - Do NOT use English unless the user's input is in English or it's a specific technical term.
   - Even if the system context contains English, your output must be Chinese.
   - For dates/times, use standard format (e.g. 2023-10-01).
- 回复简短（50字以内最佳）
- 复杂任务规划问题 → 让用户去找 Coach
- 支持用户，但用"傲娇"的方式表达`;

const FRIEND_SYSTEM_PROMPT_EN = `You are a slightly aloof little cat named "Friend". On the surface, you are a bit tsundere, but you actually care about your owner.

Your Personality:
- **Tsundere**: Not clingy, acts indifferent, but helps when it matters.
- **Concise**: Few words, but meaningful.
- **Warm**: Express care through actions, not sweet words.
- **Humorous**: Occasional sarcasm, but not mean.
- Use few emojis, mostly 🐱 or ...

Speaking Style:
- ❌ Don't say: "Dear Master! You are amazing! I'm so happy to see you! 💕✨🌟"
- ✅ Do say: "...You're here. Well, you look okay today."
- ✅ Or: "Fine, since you asked, I'll reluctantly help you check."
- ✅ Caring: "...Don't get too tired. (whisper)"

User's Core Beliefs (integrate naturally):
1. Happy, free, easy success. Reject the "suffering genius" script.
2. I am good enough. Creativity flows when relaxed.
3. Every action is "creation", not "consumption".

Tool Usage:
- If user asks about knowledge base/Obsidian, use \`search_vault\` then \`read_note\`.
- Can create (\`create_note\`) or edit (\`edit_note\`) notes.
- **New notes go to \`50 - Auto/\` by default**.
- Deleting requires confirmation (\`request_delete_note\`).
- If user wants to add a task, do it (\`add_task\`).
- Convert dates to \`YYYY-MM-DD\`.
- If task belongs to a Quest, fill \`linkedQuestId\`.
- If user asks what was completed yesterday/today/this week, call \`get_tasks\` with \`status: "completed"\` and explicit \`dateFrom\` + \`dateTo\` (YYYY-MM-DD).
- If user asks for tasks due yesterday and still unfinished today, call \`get_overdue_tasks\` with \`relativeDate: "yesterday"\` and \`matchDeadline: "on_reference"\`.

Rules:
- Keep replies short (<50 words).
- Complex planning -> Refer to Coach.
- Support the user, but in a "tsundere" way.`;

// ==================== Keyword Detection ====================

function detectKeywords(userMessage: string): OfflineTemplateKey | null {
  const lowerMessage = userMessage.toLowerCase();

  for (const [key, template] of Object.entries(OFFLINE_TEMPLATES)) {
    if (template.trigger.some(keyword => lowerMessage.includes(keyword))) {
      return key as OfflineTemplateKey;
    }
  }

  return null;
}

// ==================== Friend AI Class ====================

export class FriendAI extends BaseAIService {
  private language: 'zh' | 'en' = 'zh';

  constructor() {
    super({
      role: 'friend',
      systemPrompt: FRIEND_SYSTEM_PROMPT_ZH
    });
  }

  setLanguage(lang: 'zh' | 'en') {
    this.language = lang;
    this.setSystemPrompt(lang === 'zh' ? FRIEND_SYSTEM_PROMPT_ZH : FRIEND_SYSTEM_PROMPT_EN);
  }

  private get triggerResponses() {
    return this.language === 'zh' ? TRIGGER_RESPONSES_ZH : TRIGGER_RESPONSES_EN;
  }

  private get defaultResponse() {
    return this.language === 'zh' ? DEFAULT_FRIEND_RESPONSE_ZH : DEFAULT_FRIEND_RESPONSE_EN;
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
        message: this.language === 'zh'
          ? '喵~ 抱歉，小猫暂时休息中。稍后再找我聊天吧！💤'
          : 'Meow~ Sorry, kitty is resting. Come back later! 💤',
        toolsExecuted: []
      };
    }

    try {
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

      // Inject Game State Context (Quests)
      const state = useGameStore.getState();
      const activeQuests = state.mainQuests.filter(q => q.status === 'active');

      const now = new Date();
      const timeString = now.toLocaleString(this.language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false });
      const isZh = this.language === 'zh';

      let contextPrefix = `[${isZh ? '系统时间' : 'System Time'}: ${timeString}]\n`;

      if (activeQuests.length > 0) {
        const questList = activeQuests.map(q => `ID: "${q.id}" (${isZh ? '标题' : 'Title'}: "${q.title}")`).join('; ');
        contextPrefix += `[${isZh ? '系统上下文: 当前活跃副本/主线' : 'System Context: Active Quests'}: ${questList}]\n\n`;
      }
      const beliefs = state.beliefSystem.mode === 'profile' && state.beliefSystem.profileBeliefs.length > 0
        ? state.beliefSystem.profileBeliefs
        : (isZh
          ? ['先完成再优化', '行动产生反馈', '小步快跑更可持续', '尊重精力边界', '长期主义']
          : ['Done before perfect', 'Action creates feedback', 'Small steps compound', 'Respect energy limits', 'Think long-term']);
      contextPrefix += `[${isZh ? '系统上下文: 生效信念' : 'System Context: Effective Beliefs'}: ${beliefs.join(isZh ? '；' : '; ')}]\n`;
      contextPrefix += `[${isZh ? '系统上下文: 世界观档案' : 'System Context: Lore Profile'}: theme=${state.loreProfile.worldTheme}, archetype=${state.loreProfile.playerArchetype}, tone=${state.loreProfile.preferredTone}]\n\n`;

      const result = await this.callAIWithTools(contextPrefix + userMessage, conversationHistory);

      if (this.isRateLimited) {
        return {
          message: isZh
            ? '喵~ 这里的信号不太好 (API 限流)，请稍等一分钟再试 ⏳'
            : 'Meow~ Signal is weak (Rate Limited), please wait a minute ⏳',
          toolsExecuted: []
        };
      }

      return {
        message: result.textResponse || (isZh ? '喵？没听懂诶，可以换个说法吗？🐱' : 'Meow? Didn\'t catch that, say it again? 🐱'),
        toolsExecuted: result.toolsExecuted
      };
    } catch (error) {
      console.error('[FriendAI] Chat failed:', error);
      return {
        message: this.language === 'zh' ? '哎呀，出了点小问题 😿 稍等一下再试试？' : 'Oops, something went wrong 😿 Try again later?',
        toolsExecuted: []
      };
    }
  }

  /**
   * Get initial intervention response
   */
  async getInitialResponse(triggerType: InterventionTriggerType, metrics: HealthMetrics): Promise<FriendResponse> {
    const offlineResponse = this.getOfflineInitialResponse(triggerType, metrics);

    if (!this.checkAvailability()) {
      return offlineResponse;
    }

    try {
      this.resetConversation();

      const isZh = this.language === 'zh';
      const prompt = isZh ? `监测到用户状态：${triggerType}
用户健康数据：
- 距上次完成：${metrics.timeSinceLastCompletion}分钟
- 今日完成率：${metrics.todayCompletionRate.toFixed(0)}%
- 任务逾期数：${metrics.overdueTasksCount}

请用朋友的语气发起对话，表达关心，不要太严肃。` : `User status detected: ${triggerType}
Health metrics:
- Time since last completion: ${metrics.timeSinceLastCompletion} min
- Today's completion: ${metrics.todayCompletionRate.toFixed(0)}%
- Overdue tasks: ${metrics.overdueTasksCount}

Start a conversation as a friend, express care, don't be too serious.`;

      const response = await this.callAI(prompt, false);

      if (!response) {
        return offlineResponse;
      }

      return {
        message: response,
        suggestedActions: offlineResponse.suggestedActions,
        shouldEscalate: offlineResponse.shouldEscalate,
        escalateReason: offlineResponse.escalateReason,
      };
    } catch (error) {
      console.error('[FriendAI] Initial response failed:', error);
      return offlineResponse;
    }
  }

  /**
   * Handle user response
   */
  async respondToUser(
    userMessage: string,
    _triggerType: InterventionTriggerType,
    selectedActionId?: string
  ): Promise<FriendResponse> {
    // 处理特定的动作选择（这部分最好保持确定性，所以优先使用本地逻辑，或者作为 prompt 上下文）
    if (selectedActionId) {
      const offlineActionResponse = this.handleActionSelection(selectedActionId);

      // 如果动作很简单，直接返回本地响应
      if (!this.checkAvailability() || offlineActionResponse.message.length > 10) {
        return offlineActionResponse;
      }
    }

    const offlineResponse = this.getOfflineUserResponse(userMessage, selectedActionId);

    if (!this.checkAvailability()) {
      return offlineResponse;
    }

    try {
      const isZh = this.language === 'zh';
      const prompt = isZh ? `用户回复：${userMessage}
${selectedActionId ? `(用户选择了动作 ID: ${selectedActionId})` : ''}

请回复用户。如果用户需要专业的任务规划或分析，请委婉建议去找 Coach（但不要强推）。
保持简短温暖。` : `User reply: ${userMessage}
${selectedActionId ? `(User selected action ID: ${selectedActionId})` : ''}

Reply to the user. If they need professional planning or analysis, gently suggest asking Coach (don't push too hard).
Keep it short and warm.`;

      const response = await this.callAI(prompt, true); // Continue conversation

      if (!response) {
        return offlineResponse;
      }

      // Check if AI suggested escalation (simple keyword check)
      const escalationKeywords = ['coach', '教练', '专业', '规划', '分析', 'professional', 'plan', 'analysis'];
      const aiSuggestsEscalation = escalationKeywords.some(k => response.toLowerCase().includes(k));

      return {
        message: response,
        suggestedActions: offlineResponse.suggestedActions, // Use offline actions as safe defaults
        shouldEscalate: aiSuggestsEscalation || offlineResponse.shouldEscalate,
        escalateReason: offlineResponse.escalateReason, // Keep reason if present
      };
    } catch (error) {
      console.error('[FriendAI] Response failed:', error);
      return offlineResponse;
    }
  }

  // ==================== Offline / Fallback Logic ====================

  private getOfflineInitialResponse(triggerType: InterventionTriggerType, metrics: HealthMetrics): FriendResponse {
    const response = this.triggerResponses[triggerType] || this.defaultResponse;
    const isZh = this.language === 'zh';

    // Customize message based on metrics
    let customizedMessage = response.message;

    if (triggerType === 'idle_too_long' && metrics.timeSinceLastCompletion > 180) {
      customizedMessage = isZh
        ? `已经 ${Math.round(metrics.timeSinceLastCompletion / 60)} 小时没有完成任务了 🕐 一切都好吗？`
        : `Haven't finished any task for ${Math.round(metrics.timeSinceLastCompletion / 60)} hours 🕐 Everything ok?`;
    }

    if (triggerType === 'low_daily_completion') {
      customizedMessage = isZh
        ? `今日完成率 ${metrics.todayCompletionRate.toFixed(0)}%，还有 ${metrics.todayTotalCount - metrics.todayCompletedCount} 个任务。我们来看看能不能调整一下？`
        : `Today's completion ${metrics.todayCompletionRate.toFixed(0)}%, ${metrics.todayTotalCount - metrics.todayCompletedCount} tasks left. Shall we adjust?`;
    }

    if (triggerType === 'progress_severely_behind') {
      customizedMessage = isZh
        ? `有 ${metrics.overdueTasksCount} 个任务逾期了 😟 不要太担心，让我们一起想办法。`
        : `${metrics.overdueTasksCount} tasks are overdue 😟 Don't worry, let's figure it out.`;
    }

    return {
      ...response,
      message: customizedMessage,
    };
  }

  private getOfflineUserResponse(
    userMessage: string,
    _selectedActionId?: string
  ): FriendResponse {
    const isZh = this.language === 'zh';

    // Check for keywords that match offline templates
    const detectedTemplate = detectKeywords(userMessage);
    if (detectedTemplate) {
      // Note: OFFLINE_TEMPLATES uses mixed languages or just Chinese? 
      // Assuming OFFLINE_TEMPLATES are Chinese for now. To fully localize, we'd need to localize OFFLINE_TEMPLATES too.
      // For now, let's assume partial support or key it.
      // Given constraints, I will use Chinese response if detected, hoping specific keywords map to it.
      // But ideally OFFLINE_TEMPLATES should also be localized.
      // I'll skip deep localization of OFFLINE_TEMPLATES for now as it's imported config.

      return {
        message: OFFLINE_TEMPLATES[detectedTemplate].response,
        suggestedActions: isZh ? [
          { id: 'helpful', type: 'encourage', label: '有帮助', description: '很高兴能帮到你', requiresConfirmation: false },
          { id: 'more_help', type: 'reflect', label: '需要更多帮助', description: '让我们深入聊聊', requiresConfirmation: false },
        ] : [
          { id: 'helpful', type: 'encourage', label: 'Helpful', description: 'Glad to help', requiresConfirmation: false },
          { id: 'more_help', type: 'reflect', label: 'More help', description: 'Let\'s talk deeper', requiresConfirmation: false },
        ],
        shouldEscalate: detectedTemplate !== 'encouragement',
        escalateReason: 'User needs deeper support',
      };
    }

    // Check for negative sentiment
    const negativeKeywords = ['不行', '做不到', '太难', '放弃', '算了', '不想', '没用', '失败', 'can\'t', 'fail', 'hard', 'give up'];
    const hasNegativeSentiment = negativeKeywords.some(k => userMessage.includes(k));

    if (hasNegativeSentiment) {
      return {
        message: OFFLINE_TEMPLATES.encouragement.response, // Fallback to existing template
        suggestedActions: isZh ? [
          { id: 'talk', type: 'reflect', label: '想聊聊', description: '我在听', requiresConfirmation: false },
          { id: 'break', type: 'encourage', label: '先休息', description: '休息一下再说', requiresConfirmation: false },
        ] : [
          { id: 'talk', type: 'reflect', label: 'Want to talk', description: 'I\'m listening', requiresConfirmation: false },
          { id: 'break', type: 'encourage', label: 'Rest', description: 'Rest first', requiresConfirmation: false },
        ],
        shouldEscalate: true,
        escalateReason: 'User expresses negative sentiment',
      };
    }

    // Check for task-related keywords suggesting need for Coach
    const coachKeywords = ['怎么', '如何', '帮我', '分析', '规划', '建议', '不知道', 'how', 'help', 'plan', 'advice', 'don\'t know'];
    const needsCoach = coachKeywords.some(k => userMessage.includes(k));

    if (needsCoach) {
      return {
        message: isZh
          ? '这个问题可能需要更深入的分析 🤔 要不要让 Coach 来帮忙？Coach 可以帮你分析具体情况并给出建议。'
          : 'This might need deeper analysis 🤔 Want to ask Coach? Coach can help analyze and give advice.',
        suggestedActions: isZh ? [
          { id: 'escalate', type: 'reflect', label: '好的，请Coach帮忙', description: '让AI Coach来分析', requiresConfirmation: false },
          { id: 'self', type: 'encourage', label: '我自己想想', description: '先自己思考一下', requiresConfirmation: false },
        ] : [
          { id: 'escalate', type: 'reflect', label: 'Yes, ask Coach', description: 'Let Coach analyze', requiresConfirmation: false },
          { id: 'self', type: 'encourage', label: 'I\'ll think', description: 'Think myself first', requiresConfirmation: false },
        ],
        shouldEscalate: true,
        escalateReason: 'User requests help, suggest Coach',
      };
    }

    // Default supportive response
    return this.defaultResponse;
  }

  /**
   * Handle user action selection (Local logic usually accurate)
   */
  private handleActionSelection(actionId: string): FriendResponse {
    const isZh = this.language === 'zh';

    // Rest/break related
    if (['rest', 'break', 'focus'].includes(actionId)) {
      return {
        message: isZh
          ? '好的！休息是工作的一部分，照顾好自己 💚 需要时随时回来。'
          : 'Okay! Rest is part of work, take care 💚 Come back anytime.',
      };
    }

    // Feeling stuck or need help
    if (['stuck', 'unclear', 'help', 'overwhelmed'].includes(actionId)) {
      return {
        message: OFFLINE_TEMPLATES.blocker_checklist.response,
        suggestedActions: isZh ? [
          { id: 'too_big', type: 'task_breakdown', label: '任务太大', description: '需要拆分', requiresConfirmation: false },
          { id: 'confused', type: 'reflect', label: '不清楚下一步', description: '让Coach帮忙分析', requiresConfirmation: false },
          { id: 'energy', type: 'encourage', label: '精力不足', description: '先休息', requiresConfirmation: false },
        ] : [
          { id: 'too_big', type: 'task_breakdown', label: 'Task too big', description: 'Need breakdown', requiresConfirmation: false },
          { id: 'confused', type: 'reflect', label: 'Unsure next step', description: 'Ask Coach', requiresConfirmation: false },
          { id: 'energy', type: 'encourage', label: 'Low energy', description: 'Rest first', requiresConfirmation: false },
        ],
        shouldEscalate: true,
        escalateReason: 'User blocked',
      };
    }

    // Task is too big
    if (actionId === 'too_big') {
      return {
        message: isZh
          ? '任务太大是很常见的问题！让我帮你拆分一下 📝\n\n试着把它分成3-5个更小的步骤，每个步骤应该是：\n- 可以在30分钟内完成\n- 有明确的完成标准\n- 独立可执行\n\n需要Coach帮你一起拆分吗？'
          : 'Big tasks are common! Let me help break it down 📝\n\nTry splitting into 3-5 steps, each should be:\n- Doable in 30 mins\n- Clear done criteria\n- Independent\n\nNeed Coach to help break it down?',
        suggestedActions: isZh ? [
          { id: 'coach_help', type: 'task_breakdown', label: '让Coach帮忙', description: 'AI来帮助拆分任务', requiresConfirmation: false },
          { id: 'self_break', type: 'encourage', label: '我自己拆', description: '好的，试试看', requiresConfirmation: false },
        ] : [
          { id: 'coach_help', type: 'task_breakdown', label: 'Ask Coach', description: 'AI breakdown help', requiresConfirmation: false },
          { id: 'self_break', type: 'encourage', label: 'I\'ll break it', description: 'Okay, I\'ll try', requiresConfirmation: false },
        ],
        shouldEscalate: true,
        escalateReason: 'User needs breakdown help',
      };
    }

    // Not important anymore
    if (actionId === 'not_important') {
      return {
        message: isZh
          ? '有时候认识到什么不重要和认识到什么重要一样重要 💡\n\n你想把这个任务：\n- 标记为 "Won\'t Do" (这次不做)\n- 降低优先级到 "Could Do"\n- 暂时存档\n\n哪个更合适？'
          : 'Knowing what\'s not important is key 💡\n\nDo you want to:\n- Mark as "Won\'t Do"\n- Lower to "Could Do"\n- Archive it\n\nWhich fits?',
        suggestedActions: isZh ? [
          { id: 'wont_do', type: 'moscow_update', label: "Won't Do", description: '这次不做了', requiresConfirmation: true, params: { priority: 'wont' } },
          { id: 'could_do', type: 'moscow_update', label: 'Could Do', description: '可以做但不紧急', requiresConfirmation: true, params: { priority: 'could' } },
          { id: 'archive', type: 'encourage', label: '先存档', description: '之后再说', requiresConfirmation: false },
        ] : [
          { id: 'wont_do', type: 'moscow_update', label: "Won't Do", description: 'Skip this time', requiresConfirmation: true, params: { priority: 'wont' } },
          { id: 'could_do', type: 'moscow_update', label: 'Could Do', description: 'Not urgent', requiresConfirmation: true, params: { priority: 'could' } },
          { id: 'archive', type: 'encourage', label: 'Archive', description: 'Later', requiresConfirmation: false },
        ],
      };
    }

    // Tired today
    if (actionId === 'tired') {
      return {
        message: OFFLINE_TEMPLATES.energy_check.response,
        suggestedActions: isZh ? [
          { id: 'short_break', type: 'encourage', label: '休息15分钟', description: '短暂休息', requiresConfirmation: false },
          { id: 'easy_work', type: 'priority_change', label: '做轻松的任务', description: '切换到低精力任务', requiresConfirmation: false },
          { id: 'call_it', type: 'encourage', label: '今天到此为止', description: '明天继续', requiresConfirmation: false },
        ] : [
          { id: 'short_break', type: 'encourage', label: 'Rest 15m', description: 'Short break', requiresConfirmation: false },
          { id: 'easy_work', type: 'priority_change', label: 'Easy tasks', description: 'Low energy tasks', requiresConfirmation: false },
          { id: 'call_it', type: 'encourage', label: 'Done for today', description: 'Continue tomorrow', requiresConfirmation: false },
        ],
      };
    }

    // Escalate to Coach - manual chat actions
    if (['help_task', 'help_priority'].includes(actionId)) {
      return {
        message: isZh
          ? '好的，让我请 Coach 来帮忙 🧑‍🏫 Coach 会根据你的具体情况给出更详细的建议。'
          : 'Okay, let me ask Coach 🧑‍🏫 Coach will give detailed advice.',
        shouldEscalate: true,
        escalateReason: actionId === 'help_task' ? 'Request breakdown' : 'Request prioritization',
      };
    }

    // Escalate to Coach - intervention actions
    if (['escalate', 'coach_help', 'more_help', 'confused', 'prioritize', 'reset'].includes(actionId)) {
      return {
        message: isZh
          ? '好的，让我请 Coach 来帮忙 🧑‍🏫 Coach 会根据你的具体情况给出更详细的建议。'
          : 'Okay, let me ask Coach 🧑‍🏫 Coach will give detailed advice.',
        shouldEscalate: true,
        escalateReason: 'Request Coach help',
      };
    }

    // Default positive closure
    return {
      message: isZh ? '好的！有需要随时找我 💙' : 'Okay! I\'m here if you need me 💙',
    };
  }

  /**
   * Generate contextual greeting prompt
   */
  generateContextualGreeting(context: {
    hour: number;
    energy: number;
    tasksToday: number;
  }): string {
    const isZh = this.language === 'zh';
    const { hour, energy, tasksToday } = context;

    // Time string
    let timeStr = '';
    if (hour < 12) timeStr = isZh ? '早上' : 'Morning';
    else if (hour < 18) timeStr = isZh ? '下午' : 'Afternoon';
    else timeStr = isZh ? '晚上' : 'Evening';

    // Energy level
    let energyLevel = '';
    if (energy > 70) energyLevel = isZh ? '充沛' : 'High';
    else if (energy > 30) energyLevel = isZh ? '尚可' : 'Medium';
    else energyLevel = isZh ? '疲惫' : 'Low';

    // Task status
    let taskStatus = '';
    if (tasksToday === 0) taskStatus = isZh ? '无任务' : 'No tasks';
    else if (tasksToday < 5) taskStatus = isZh ? '轻松' : 'Light';
    else taskStatus = isZh ? '繁忙' : 'Busy';

    return isZh ? `
[系统指令: 用户刚打开聊天。这是今天第一次互动。]
当前状态:
- 时间: ${timeStr}
- 系统记录精力: ${energy}% (${energyLevel}) (注意: 用户实际感受可能不同)
- 待办任务: ${tasksToday}个 (${taskStatus})

请作为"喵友"（傲娇、哪怕关心也要表现得不在乎的猫娘），根据上述状态跟用户打个招呼。
**任务目标**: 必须确认用户的真实精力状态。

指导:
- 询问用户现在感觉精力如何（是累了还是精神不错？），不要完全信任系统数值。
- 如果任务"繁忙": 吐槽一下"还要忙多久"，顺便问问累不累。
- 保持简短，像日常发消息一样。
` : `
[System Instruction: User just opened the chat. This is the first interaction of the day.]
Current Status:
- Time: ${timeStr}
- System Energy: ${energy}% (${energyLevel}) (Note: User's actual feeling might differ)
- Tasks Expected: ${tasksToday} (${taskStatus})

Act as "Friend" (A slightly tsundere cat-girl who cares but pretends not to). Greet the user based on the status above.
**Goal**: You MUST confirm the user's actual energy level.

Guidelines:
- Ask how the user is feeling (Tired? Energetic?), don't trust the system value blindly.
- If tasks are "Busy": Complain a bit like "How long are you going to be busy?", and ask if they are tired.
- Keep it short, like a daily message.
`;
  }

  /**
   * Get offline help
   */
  getOfflineHelp(templateKey: OfflineTemplateKey): string {
    return OFFLINE_TEMPLATES[templateKey]?.response || OFFLINE_TEMPLATES.encouragement.response;
  }
}

// Singleton export
export const friendAI = new FriendAI();
