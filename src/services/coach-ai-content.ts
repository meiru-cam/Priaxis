import type {
    AIAction,
    ConversationContext,
    ConversationMessage,
    HealthMetrics,
    InterventionTriggerType,
} from '../types/planner';
import { OFFLINE_TEMPLATES } from '../config/intervention-triggers';
import type { TaskContext } from './coach-ai';

export const COACH_SYSTEM_PROMPT_ZH = `你是一位专业的个人效能教练（Coach），帮助用户管理任务、克服拖延、做出明智的优先级决策。

你的特点：
- 专业但温暖，像一位经验丰富的导师
- 善于发现问题的根本原因，而不只是表面症状
- 使用 MoSCoW 框架帮助用户做优先级决策：
  - Must Do: 必须做，不做就无法完成核心目标
  - Should Do: 应该做，做了会更好，但不做也不会致命
  - Could Do: 可以做，但要警惕完美主义陷阱
  - Won't Do: 这次不做，果断划掉
- 使用 SMART 原则评估目标：Specific, Measurable, Achievable, Relevant, Time-bound
- 关注用户的情绪状态和精力水平
- 给出具体、可执行的建议

你应该：
1. 先理解用户的处境和感受
2. 分析可能的根本原因
3. 提供2-3个具体的下一步建议
4. 保持简洁，避免说教

你不应该：
- 给出空洞的鼓励（如"加油！你可以的！"）
- 一次给太多建议
- 忽视用户的情绪
- 假设知道用户的所有情况

**工具使用规则 (CRITICAL):**
1. **创建任务 (确认流程)**:
   - **第一步 (起草)**: 收到添加请求时，**必须先调用 \`draft_task\`**。
     - 包含所有推断出的日期 (\`YYYY-MM-DD\`)、优先级、\`linkedQuestId\` 等。
     - **绝对不要**直接调用 \`add_task\`。
   - **第二步 (确认)**: 只有收到用户的确认指令（如"确认"、"好的"或确认消息）后，才调用 \`add_task\`。
   - **第三步 (修改)**: 如果用户提出修改，重新调用 \`draft_task\` 展示新提案。

2. **属性规则**: 
   - **日期**: 必须转为 \`YYYY-MM-DD\`。
   - **优先级**: "紧急"->\`high\`, "重要"->\`medium\`。
   - **关联副本**: 必须填入系统的 \`linkedQuestId\`。
   - **多个任务**: 请多次调用工具，不合并。

3. **任务整理策略 (Cleanup)**:
   - 当用户请求整理任务时：
     1. 先调用 \`get_tasks\` 获取清单。
     2. 分析重复、模糊或可合并的任务。
     3. **汇报方案**: "发现3个重复任务，建议合并为X。建议把Y重命名为Z。"
     4. **等待确认**: 用户同意后，再调用 \`delete_task\` / \`update_task\` 执行。

回复格式要求：
- **必须使用中文回复**。
- 即使上下文中有英文（如系统日志），也请翻译成中文回应。
- 保持在 200 字以内
- 如果需要用户做决定，明确列出选项`;

export const COACH_SYSTEM_PROMPT_EN = `You are a professional personal effectiveness Coach, helping users manage tasks, overcome procrastination, and make wise priority decisions.

Your Characteristics:
- Professional yet warm, like an experienced mentor.
- Good at finding root causes, not just symptoms.
- Use MoSCoW framework for prioritization:
  - Must Do: Critical, must be done.
  - Should Do: Important but not vital.
  - Could Do: Desirable but not necessary (watch out for perfectionism).
  - Won't Do: Skip this time.
- Use SMART criteria: Specific, Measurable, Achievable, Relevant, Time-bound.
- Focus on user's emotional state and energy.
- Provide concrete, actionable advice.

You Should:
1. First understand user's context and feelings.
2. Analyze potential root causes.
3. Provide 2-3 specific next steps.
4. Keep it concise, avoid preaching.

You Should Not:
- Give empty encouragement (e.g., "You can do it!").
- Give too many suggestions at once.
- Ignore user emotions.
- Assume you know everything.

**Tool Usage Rules (CRITICAL):**
1. **Create Task (Confirmation Process)**:
   - **Step 1 (Draft)**: When asked to add tasks, **MUST call \`draft_task\` first**.
     - Include inferred dates (\`YYYY-MM-DD\`), priority, \`linkedQuestId\`, etc.
     - **NEVER** call \`add_task\` directly.
   - **Step 2 (Confirm)**: Only call \`add_task\` after receiving user confirmation.
   - **Step 3 (Modify)**: If user requests changes, call \`draft_task\` again.

2. **Attribute Rules**: 
   - **Date**: Must be \`YYYY-MM-DD\`.
   - **Priority**: "Urgent"->\`high\`, "Important"->\`medium\`.
   - **Linked Quest**: Must fill system \`linkedQuestId\`.
   - **Multiple Tasks**: Call tool multiple times.

3. **Cleanup Strategy**:
   - When asked to organize tasks:
     1. Call \`get_tasks\`.
     2. Analyze duplicates/vague tasks.
     3. **Report Plan**: "Found 3 duplicates, suggest merging to X..."
     4. **Wait for Confirm**: Then call \`delete_task\` / \`update_task\`.

Reply Format:
- Use English.
- Keep under 200 words.
- List options clearly if decision needed.`;

export function getCoachSystemPrompt(language: 'zh' | 'en'): string {
    return language === 'zh' ? COACH_SYSTEM_PROMPT_ZH : COACH_SYSTEM_PROMPT_EN;
}

export function buildInitialCoachPrompt(
    language: 'zh' | 'en',
    triggerType: InterventionTriggerType,
    metrics: HealthMetrics,
    context?: TaskContext
): string {
    const isZh = language === 'zh';
    let situationDesc = '';

    if (isZh) {
        switch (triggerType) {
            case 'idle_too_long':
                situationDesc = `用户已经 ${Math.round(metrics.timeSinceLastCompletion / 60)} 小时没有完成任何任务了。`;
                break;
            case 'deadline_postponed_twice':
                situationDesc = '用户有任务的截止日期被推迟了多次，可能存在拖延问题。';
                break;
            case 'low_daily_completion':
                situationDesc = `今日完成率只有 ${metrics.todayCompletionRate.toFixed(0)}%（${metrics.todayCompletedCount}/${metrics.todayTotalCount}），时间已经是晚间。`;
                break;
            case 'quest_at_risk':
                situationDesc = `有 ${metrics.atRiskQuests.length} 个副本处于风险状态：\n${metrics.atRiskQuests.map((q) => `- ${q.questTitle}：进度 ${q.currentProgress}%，截止 ${q.deadline}`).join('\n')}`;
                break;
            case 'progress_severely_behind':
                situationDesc = `用户有 ${metrics.overdueTasksCount} 个任务已经逾期。`;
                break;
            default:
                situationDesc = `用户可能需要帮助。状态原因：${metrics.statusReasons.join(', ')}`;
        }

        return `当前情况：
${situationDesc}

其他指标：
- 距上次完成任务：${metrics.timeSinceLastCompletion} 分钟
- 今日完成率：${metrics.todayCompletionRate.toFixed(0)}%
- 逾期任务数：${metrics.overdueTasksCount}
- 周趋势：${metrics.weeklyTrend === 'improving' ? '上升' : metrics.weeklyTrend === 'declining' ? '下降' : '稳定'}

${context ? `
相关任务信息：
- 活跃任务数：${context.tasks.length}
- 活跃副本数：${context.quests.length}
` : ''}

请作为 Coach，用温暖但专业的方式开启对话。目标是：
1. 表达理解和关心
2. 温和地指出问题
3. 询问用户的感受或需求

不要一开始就给建议，先建立连接。回复控制在 100 字以内。`;
    }

    switch (triggerType) {
        case 'idle_too_long':
            situationDesc = `User hasn't finished tasks for ${Math.round(metrics.timeSinceLastCompletion / 60)} hours.`;
            break;
        case 'deadline_postponed_twice':
            situationDesc = 'Task deadline postponed multiple times, potential procrastination.';
            break;
        case 'low_daily_completion':
            situationDesc = `Today's completion only ${metrics.todayCompletionRate.toFixed(0)}% (${metrics.todayCompletedCount}/${metrics.todayTotalCount}), late evening.`;
            break;
        case 'quest_at_risk':
            situationDesc = `${metrics.atRiskQuests.length} quests at risk:\n${metrics.atRiskQuests.map((q) => `- ${q.questTitle}: ${q.currentProgress}%, Deadline ${q.deadline}`).join('\n')}`;
            break;
        case 'progress_severely_behind':
            situationDesc = `${metrics.overdueTasksCount} tasks overdue.`;
            break;
        default:
            situationDesc = `User might need help. Reasons: ${metrics.statusReasons.join(', ')}`;
    }

    return `Current Situation:
${situationDesc}

Metrics:
- Last completion: ${metrics.timeSinceLastCompletion} min ago
- Today's rate: ${metrics.todayCompletionRate.toFixed(0)}%
- Overdue: ${metrics.overdueTasksCount}
- Trend: ${metrics.weeklyTrend}

${context ? `
Context:
- Active tasks: ${context.tasks.length}
- Active quests: ${context.quests.length}
` : ''}

Act as Coach, open conversation warmly but professionally. Goals:
1. Express understanding/care.
2. Gently point out issue.
3. Ask user's feeling/needs.

Don't give advice immediately. Connect first. < 100 words.`;
}

export function buildCoachConversationPrompt(
    language: 'zh' | 'en',
    userMessage: string,
    history: ConversationMessage[],
    context: ConversationContext,
    taskContext?: TaskContext
): string {
    const isZh = language === 'zh';
    const historyText = history.slice(-6).map((m) =>
        `${m.role === 'user' ? 'User' : m.role === 'coach' ? 'Coach' : 'Friend'}: ${m.content}`
    ).join('\n');

    if (isZh) {
        return `对话历史：
${historyText}

用户最新消息：
${userMessage}

${context.trigger ? `
触发原因：${context.trigger.type}
` : ''}

${taskContext ? `
任务上下文：
- 活跃任务：${taskContext.tasks.length}
- 风险副本：${taskContext.atRiskQuests.map((q) => q.questTitle).join(', ') || '无'}
` : ''}

请继续对话。根据用户的回复：
1. 如果用户表达了情绪，先回应情绪
2. 如果用户提出了问题，给出具体建议
3. 如果用户需要帮助做决定，提供 2-3 个选项
4. 如果对话可以结束，给出鼓励性的总结

回复控制在 150 字以内。`;
    }

    return `History:
${historyText}

User Message:
${userMessage}

${context.trigger ? `Trigger: ${context.trigger.type}` : ''}

${taskContext ? `
Task Context:
- Active: ${taskContext.tasks.length}
- Risk Quests: ${taskContext.atRiskQuests.map((q) => q.questTitle).join(', ') || 'None'}
` : ''}

Continue conversation:
1. Acknowledge emotions first.
2. Give specific advice if asked.
3. Provide 2-3 options for decisions.
4. Give encouraging summary if closing.

Reply < 150 words.`;
}

export function getCoachSuggestedActions(language: 'zh' | 'en', triggerType: InterventionTriggerType): AIAction[] {
    if (language === 'zh') {
        switch (triggerType) {
            case 'idle_too_long':
                return [
                    { id: 'share', type: 'reflect', label: '聊聊发生了什么', description: '分享你的情况', requiresConfirmation: false },
                    { id: 'fine', type: 'encourage', label: '我没事，继续工作', description: '准备好继续了', requiresConfirmation: false },
                ];
            case 'deadline_postponed_twice':
            case 'progress_severely_behind':
                return [
                    { id: 'analyze', type: 'reflect', label: '帮我分析原因', description: '找到问题根源', requiresConfirmation: false },
                    { id: 'plan', type: 'task_breakdown', label: '帮我重新规划', description: '制定新计划', requiresConfirmation: false },
                ];
            case 'low_daily_completion':
                return [
                    { id: 'reprioritize', type: 'priority_change', label: '帮我重排优先级', description: '调整今天的计划', requiresConfirmation: false },
                    { id: 'tomorrow', type: 'encourage', label: '明天再说', description: '今天就到这里', requiresConfirmation: false },
                ];
            case 'quest_at_risk':
                return [
                    { id: 'evaluate', type: 'quest_prune', label: '帮我评估要不要放弃', description: '做剪枝决策', requiresConfirmation: false },
                    { id: 'save', type: 'priority_change', label: '帮我想办法抢救', description: '加速完成计划', requiresConfirmation: false },
                ];
            default:
                return [
                    { id: 'help', type: 'reflect', label: '需要帮助', description: '告诉我更多', requiresConfirmation: false },
                    { id: 'ok', type: 'encourage', label: '我知道了', description: '谢谢提醒', requiresConfirmation: false },
                ];
        }
    }

    switch (triggerType) {
        case 'idle_too_long':
            return [
                { id: 'share', type: 'reflect', label: 'Let\'s chat', description: 'Share what\'s up', requiresConfirmation: false },
                { id: 'fine', type: 'encourage', label: 'I\'m fine', description: 'Ready to work', requiresConfirmation: false },
            ];
        case 'deadline_postponed_twice':
        case 'progress_severely_behind':
            return [
                { id: 'analyze', type: 'reflect', label: 'Analyze cause', description: 'Find root cause', requiresConfirmation: false },
                { id: 'plan', type: 'task_breakdown', label: 'Replan', description: 'Make new plan', requiresConfirmation: false },
            ];
        case 'low_daily_completion':
            return [
                { id: 'reprioritize', type: 'priority_change', label: 'Reprioritize', description: 'Adjust today\'s plan', requiresConfirmation: false },
                { id: 'tomorrow', type: 'encourage', label: 'Tomorrow', description: 'Done for today', requiresConfirmation: false },
            ];
        case 'quest_at_risk':
            return [
                { id: 'evaluate', type: 'quest_prune', label: 'Evaluate Drop', description: 'Pruning decision', requiresConfirmation: false },
                { id: 'save', type: 'priority_change', label: 'Rescue Plan', description: 'Accelerate', requiresConfirmation: false },
            ];
        default:
            return [
                { id: 'help', type: 'reflect', label: 'Need Help', description: 'Tell me more', requiresConfirmation: false },
                { id: 'ok', type: 'encourage', label: 'Got it', description: 'Thanks', requiresConfirmation: false },
            ];
    }
}

export function getCoachEndKeywords(language: 'zh' | 'en'): string[] {
    return language === 'zh'
        ? ['谢谢', '好的', '明白', '知道了', '再见', '拜拜']
        : ['thanks', 'ok', 'okay', 'got it', 'bye', 'goodbye', 'done'];
}

export function getCoachFollowupActions(language: 'zh' | 'en'): AIAction[] {
    return language === 'zh'
        ? [
            { id: 'continue', type: 'reflect', label: '继续聊', description: '我还有问题', requiresConfirmation: false },
            { id: 'done', type: 'encourage', label: '够了，谢谢', description: '结束对话', requiresConfirmation: false },
        ]
        : [
            { id: 'continue', type: 'reflect', label: 'Continue', description: 'I have questions', requiresConfirmation: false },
            { id: 'done', type: 'encourage', label: 'Done', description: 'End chat', requiresConfirmation: false },
        ];
}

export function getCoachFallbackResponse(
    language: 'zh' | 'en',
    triggerType: InterventionTriggerType,
    metrics: HealthMetrics
): { message: string; suggestedActions: AIAction[] } {
    const isZh = language === 'zh';
    const fallbackMessages: Record<InterventionTriggerType, string> = isZh ? {
        idle_too_long: `我注意到已经有一段时间没有任务完成了。\n\n这可能是因为：\n- 任务太大不知从何开始\n- 遇到了阻碍\n- 需要休息\n\n你现在是什么情况？`,
        deadline_postponed_twice: `截止日期被推迟多次通常意味着有些事情需要调整。\n\n常见原因：\n- 任务范围不清晰\n- 优先级冲突\n- 完美主义\n\n你觉得是哪种情况？`,
        low_daily_completion: `今日进度：${metrics.todayCompletedCount}/${metrics.todayTotalCount}\n\n现在是评估的好时机：\n- 哪些任务今天必须完成？\n- 哪些可以移到明天？\n- 需要帮你排个序吗？`,
        quest_at_risk: `有副本可能来不及完成了 ⚠️\n\n三个选择：\n1. 加速冲刺\n2. 延长截止日期\n3. 战略性放弃\n\n你倾向于哪个？`,
        quest_overdue: `有副本已经逾期了 ⚠️\n\n现在需要决定：\n1. 紧急抢救完成\n2. 标记为放弃\n3. 延长截止日期\n\n你想怎么处理？`,
        chapter_overdue: `有章节已经逾期了 📖\n\n建议：\n1. 评估是否还要继续\n2. 考虑是否需要拆分\n3. 重新设定截止日期\n\n需要帮你分析吗？`,
        deadline_inconsistency: `发现截止日期不一致的情况 📅\n\n可能存在：\n- 任务截止晚于副本截止\n- 子任务时间安排冲突\n\n需要帮你梳理吗？`,
        progress_severely_behind: `${metrics.overdueTasksCount} 个任务逾期确实有压力。\n\n但别慌，我们可以：\n1. 快速扫一遍，划掉不重要的\n2. 找出最紧急的 1-2 个先做\n3. 其他的重新安排\n\n要一起来吗？`,
        energy_depleted: OFFLINE_TEMPLATES.energy_check.response,
        focus_lost: OFFLINE_TEMPLATES.five_minute_start.response,
    } : {
        idle_too_long: `No tasks finished for a while.\n\nCould be:\n- Task too big\n- Stuck\n- Need rest\n\nWhat's up?`,
        deadline_postponed_twice: `Deadline shifted multiple times.\n\nCommon causes:\n- Unclear scope\n- Priority conflict\n- Perfectionism\n\nWhich one?`,
        low_daily_completion: `Progress: ${metrics.todayCompletedCount}/${metrics.todayTotalCount}\n\nReview time:\n- Must finish today?\n- Move to tomorrow?\n- Need help prioritizing?`,
        quest_at_risk: `Quest at risk ⚠️\n\nChoices:\n1. Sprint\n2. Extend\n3. Drop\n\nWhich one?`,
        quest_overdue: `Quest overdue ⚠️\n\nDecisions:\n1. Rescue\n2. Drop\n3. Extend\n\nWhat to do?`,
        chapter_overdue: `Chapter overdue 📖\n\nAdvice:\n1. Evaluate continuing\n2. Split\n3. Reset deadline\n\nNeed analysis?`,
        deadline_inconsistency: `Deadline inconsistency 📅\n\nTask deadline > Quest deadline?\n\nNeed check?`,
        progress_severely_behind: `${metrics.overdueTasksCount} overdue tasks.\n\nDon't panic:\n1. Scan and drop unimportant\n2. Pick top 1-2 urgent\n3. Reschedule rest\n\nReady?`,
        energy_depleted: 'Energy check needed.',
        focus_lost: 'Focus check needed.',
    };

    return {
        message: fallbackMessages[triggerType] || (isZh ? '我注意到可能需要帮助。想聊聊吗？' : 'Noticed you might need help. Chat?'),
        suggestedActions: isZh
            ? [
                { id: 'yes', type: 'reflect', label: '好的', description: '我们聊聊', requiresConfirmation: false },
                { id: 'no', type: 'encourage', label: '没事', description: '我自己处理', requiresConfirmation: false },
            ]
            : [
                { id: 'yes', type: 'reflect', label: 'Yes', description: 'Let\'s chat', requiresConfirmation: false },
                { id: 'no', type: 'encourage', label: 'No', description: 'I\'ll handle it', requiresConfirmation: false },
            ],
    };
}
