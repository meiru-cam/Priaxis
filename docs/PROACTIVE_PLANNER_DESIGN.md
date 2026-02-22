# Proactive AI Planner - 架构设计文档

**版本**: v1.0
**日期**: 2026-01-20
**状态**: 设计阶段

---

## 🎯 核心理念

> **"Stockfish for Life"** - 一个实时计算生活局势的智能引擎

### 双层 Agent 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Chat Interface                        │ │
│  │              (对话式交互，非弹窗)                         │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │  🐱 The Friend   │         │   🧠 The Coach (Gemini)  │  │
│  │                  │         │                          │  │
│  │  - 温和提醒      │ ──升级──▶│  - 深度拆解             │  │
│  │  - 轻量监测      │         │  - 策略调整             │  │
│  │  - 状态觉察      │         │  - 心理建设             │  │
│  │  - 本地规则      │         │  - SMART 检测           │  │
│  └──────────────────┘         └──────────────────────────┘  │
│           │                              │                   │
│           └──────────────┬───────────────┘                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Monitor Engine (后台循环)                   │ │
│  │                                                          │ │
│  │   Event Stream ──▶ Health Metrics ──▶ Trigger Check     │ │
│  │                                              │            │ │
│  │                                              ▼            │ │
│  │                                      Intervention         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 State 架构设计

### 1. Proactive Planner Store

```typescript
// src/stores/planner-store.ts

interface PlannerState {
  // ===== 监测状态 =====
  monitoring: {
    isActive: boolean;
    lastCheckTime: string | null;
    status: 'idle' | 'watching' | 'alert' | 'intervention';
  };

  // ===== 健康指标 (实时计算) =====
  healthMetrics: HealthMetrics;

  // ===== 事件流 =====
  eventStream: PlannerEvent[];
  
  // ===== 当前干预 =====
  currentIntervention: Intervention | null;
  interventionHistory: CompletedIntervention[];

  // ===== AI 会话 =====
  conversation: {
    isOpen: boolean;
    mode: 'friend' | 'coach';
    messages: ConversationMessage[];
    context: ConversationContext | null;
  };

  // ===== MoSCoW 建议缓存 =====
  moscowSuggestions: Map<string, MoSCoWSuggestion>; // taskId -> suggestion
}

interface HealthMetrics {
  // === 实时指标 ===
  timeSinceLastCompletion: number;  // 分钟
  todayCompletionRate: number;      // 0-100
  todayCompletedCount: number;
  todayTotalCount: number;
  
  // === 风险指标 ===
  overdueTasksCount: number;
  deadlinePostponeMap: Record<string, number>;  // taskId -> postpone count
  atRiskQuests: AtRiskQuest[];
  
  // === 趋势指标 ===
  weeklyTrend: 'improving' | 'stable' | 'declining';
  energyPattern: 'high' | 'medium' | 'low';
  
  // === 综合状态 (红绿灯) ===
  overallStatus: 'green' | 'yellow' | 'red';
  statusReasons: string[];
}

interface AtRiskQuest {
  questId: string;
  questTitle: string;
  deadline: string;
  currentProgress: number;
  requiredDailyProgress: number;  // 每天需要完成多少才能按时
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'accelerate' | 'prune' | 'delegate' | 'extend';
}
```

### 2. Event Schema

```typescript
// src/types/planner-events.ts

// ===== 事件类型枚举 =====
type PlannerEventType =
  // 任务生命周期
  | 'task.created'
  | 'task.started'
  | 'task.paused'
  | 'task.resumed'
  | 'task.completed'
  | 'task.deleted'
  | 'task.deadline_changed'
  | 'task.priority_changed'
  | 'task.moscow_changed'
  
  // 副本生命周期
  | 'quest.created'
  | 'quest.started'
  | 'quest.progress_updated'
  | 'quest.completed'
  | 'quest.pruned'
  | 'quest.deadline_extended'
  
  // 干预事件
  | 'intervention.triggered'
  | 'intervention.acknowledged'
  | 'intervention.escalated'  // Friend -> Coach
  | 'intervention.resolved'
  | 'intervention.dismissed'
  
  // AI 会话事件
  | 'conversation.started'
  | 'conversation.user_message'
  | 'conversation.ai_response'
  | 'conversation.action_taken'  // AI 建议被采纳
  | 'conversation.ended'
  
  // 复盘事件
  | 'reflection.task_completed'
  | 'reflection.quest_completed'
  | 'summary.weekly_generated'
  | 'summary.monthly_generated'
  
  // 系统事件
  | 'system.monitor_tick'
  | 'system.status_changed'
  | 'system.daily_reset';

// ===== 核心事件结构 =====
interface PlannerEvent {
  id: string;                    // evt_<timestamp>_<random>
  type: PlannerEventType;
  timestamp: string;             // ISO 8601
  
  // 关联实体
  entity: {
    type: 'task' | 'quest' | 'chapter' | 'season' | 'system' | 'user';
    id: string;
    name?: string;
  };
  
  // 事件负载 (根据 type 不同而不同)
  payload: EventPayload;
  
  // 元数据
  metadata: {
    source: 'user' | 'system' | 'ai_friend' | 'ai_coach';
    importance: 'low' | 'medium' | 'high' | 'critical';
    causedBy?: string;           // 触发此事件的事件 ID
    relatedEvents?: string[];    // 相关事件 ID
  };
}

// ===== 特定事件的 Payload 类型 =====

interface TaskCompletedPayload {
  taskId: string;
  taskName: string;
  linkedQuestId?: string;
  actualDuration: number;        // 分钟
  estimatedDuration: number;
  xpGained: number;
  
  // 复盘数据 (用户填写)
  reflection?: TaskReflection;
}

interface TaskReflection {
  satisfactionScore: 1 | 2 | 3 | 4 | 5;
  goodPoints: string;
  improvements: string;
  delayReason?: string;
  energyState: 'high' | 'medium' | 'low';
  blockerAction?: string;        // 什么推动了卡点
}

interface DeadlineChangedPayload {
  taskId: string;
  previousDeadline: string;
  newDeadline: string;
  reason?: string;
  postponeCount: number;         // 累计推迟次数
}

interface InterventionTriggeredPayload {
  triggerId: string;
  triggerType: InterventionTriggerType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: Partial<HealthMetrics>;
  suggestedResponse: 'popup' | 'friend_chat' | 'coach_intervention';
}

interface ConversationActionPayload {
  conversationId: string;
  actionType: 'task_breakdown' | 'priority_change' | 'deadline_extend' | 'quest_prune' | 'moscow_update';
  actionDetails: Record<string, unknown>;
  userConfirmed: boolean;
}
```

### 3. Intervention System

```typescript
// src/types/intervention.ts

type InterventionTriggerType =
  | 'idle_too_long'              // 2小时无产出
  | 'deadline_postponed_twice'   // DDL 推迟 2 次
  | 'progress_severely_behind'   // 进度严重滞后
  | 'low_daily_completion'       // 今日完成度 < 60% 且时间晚
  | 'quest_at_risk'              // 副本可能无法按时完成
  | 'energy_depleted'            // 精力耗尽
  | 'focus_lost';                // 频繁切换任务

interface InterventionTrigger {
  id: string;
  type: InterventionTriggerType;
  
  // 触发条件
  condition: {
    metric: keyof HealthMetrics;
    operator: '>' | '<' | '==' | '>=' | '<=';
    threshold: number | string;
    
    // 可选：时间窗口
    timeWindow?: {
      start: string;  // "18:00"
      end: string;    // "23:00"
    };
  };
  
  // 响应配置
  response: {
    level: 'popup' | 'friend' | 'coach';
    message: string;           // Friend 的初始消息
    escalateAfter?: number;    // 分钟后升级到 Coach
    coachPrompt?: string;      // Coach 的 system prompt 补充
  };
  
  // 冷却时间 (避免重复触发)
  cooldown: number;  // 分钟
  lastTriggered?: string;
}

interface Intervention {
  id: string;
  triggerId: string;
  triggerType: InterventionTriggerType;
  
  startedAt: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  
  // 当前处理层级
  currentLevel: 'friend' | 'coach';
  
  // 关联的会话 ID
  conversationId?: string;
  
  // 结果
  resolution?: {
    action: string;
    outcome: 'success' | 'partial' | 'deferred';
    userFeedback?: string;
  };
}
```

---

## 🚦 红绿灯监测机制

### Monitor Loop 设计

```typescript
// src/services/monitor-engine.ts

class MonitorEngine {
  private intervalId: number | null = null;
  private readonly CHECK_INTERVAL = 600_000; // 10 分钟

  // ===== 主循环 =====
  start() {
    this.intervalId = setInterval(() => this.tick(), this.CHECK_INTERVAL);
    this.tick(); // 立即执行一次
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async tick() {
    // 1. 收集指标
    const metrics = this.collectMetrics();
    
    // 2. 计算综合状态
    const status = this.evaluateStatus(metrics);
    
    // 3. 检查触发器
    const triggeredInterventions = this.checkTriggers(metrics, status);
    
    // 4. 执行干预
    if (triggeredInterventions.length > 0) {
      this.executeIntervention(triggeredInterventions[0]); // 一次只处理优先级最高的
    }
    
    // 5. 记录事件
    this.logSystemEvent('system.monitor_tick', { metrics, status });
  }

  // ===== 指标收集 =====
  private collectMetrics(): HealthMetrics {
    const state = usePlannerStore.getState();
    const gameState = useGameStore.getState();
    
    const now = new Date();
    const todayStart = startOfDay(now);
    
    // 计算最后完成时间
    const lastCompletion = this.getLastCompletionTime(state.eventStream);
    const timeSinceLastCompletion = lastCompletion 
      ? differenceInMinutes(now, lastCompletion)
      : Infinity;
    
    // 计算今日完成率
    const todayTasks = gameState.customTasks.filter(t => 
      t.createdAt && isAfter(new Date(t.createdAt), todayStart)
    );
    const completedToday = todayTasks.filter(t => t.completed).length;
    const todayCompletionRate = todayTasks.length > 0 
      ? (completedToday / todayTasks.length) * 100 
      : 100;
    
    // 检查风险副本
    const atRiskQuests = this.analyzeQuestRisks(gameState.mainQuests);
    
    // 统计逾期和推迟
    const overdueTasksCount = gameState.customTasks.filter(t => 
      !t.completed && t.deadline && isPast(new Date(t.deadline))
    ).length;
    
    return {
      timeSinceLastCompletion,
      todayCompletionRate,
      todayCompletedCount: completedToday,
      todayTotalCount: todayTasks.length,
      overdueTasksCount,
      deadlinePostponeMap: state.deadlinePostponeMap || {},
      atRiskQuests,
      weeklyTrend: this.calculateWeeklyTrend(state.eventStream),
      energyPattern: this.inferEnergyPattern(state.eventStream),
      overallStatus: 'green', // 将在 evaluateStatus 中计算
      statusReasons: [],
    };
  }

  // ===== 状态评估 (红绿灯) =====
  private evaluateStatus(metrics: HealthMetrics): 'green' | 'yellow' | 'red' {
    const reasons: string[] = [];
    let score = 0; // 0 = green, 1-2 = yellow, 3+ = red
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // 规则 1: 2小时无产出
    if (metrics.timeSinceLastCompletion > 120) {
      score += 1;
      reasons.push(`已 ${Math.round(metrics.timeSinceLastCompletion / 60)} 小时无任务完成`);
    }
    
    // 规则 2: 今日完成率低 + 时间已晚
    if (currentHour >= 18 && metrics.todayCompletionRate < 60) {
      score += 2;
      reasons.push(`今日完成率仅 ${metrics.todayCompletionRate.toFixed(0)}%`);
    }
    
    // 规则 3: 有高风险副本
    const criticalQuests = metrics.atRiskQuests.filter(q => q.riskLevel === 'critical');
    if (criticalQuests.length > 0) {
      score += 2;
      reasons.push(`${criticalQuests.length} 个副本处于危险状态`);
    }
    
    // 规则 4: DDL 被推迟多次
    const frequentPostpones = Object.entries(metrics.deadlinePostponeMap)
      .filter(([_, count]) => count >= 2);
    if (frequentPostpones.length > 0) {
      score += 1;
      reasons.push(`${frequentPostpones.length} 个任务 DDL 被推迟多次`);
    }
    
    // 规则 5: 逾期任务
    if (metrics.overdueTasksCount >= 3) {
      score += 2;
      reasons.push(`有 ${metrics.overdueTasksCount} 个逾期任务`);
    } else if (metrics.overdueTasksCount > 0) {
      score += 1;
    }
    
    metrics.statusReasons = reasons;
    
    if (score >= 3) return 'red';
    if (score >= 1) return 'yellow';
    return 'green';
  }

  // ===== 触发器检查 =====
  private checkTriggers(
    metrics: HealthMetrics, 
    status: 'green' | 'yellow' | 'red'
  ): InterventionTrigger[] {
    const triggers = this.getActiveTriggers();
    const triggered: InterventionTrigger[] = [];
    
    for (const trigger of triggers) {
      if (this.isOnCooldown(trigger)) continue;
      
      if (this.evaluateTriggerCondition(trigger, metrics)) {
        triggered.push(trigger);
      }
    }
    
    // 按严重程度排序
    return triggered.sort((a, b) => 
      this.severityScore(b.response.level) - this.severityScore(a.response.level)
    );
  }
}
```

### 默认触发器配置

```typescript
// src/config/intervention-triggers.ts

export const DEFAULT_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'idle-2h',
    type: 'idle_too_long',
    condition: {
      metric: 'timeSinceLastCompletion',
      operator: '>',
      threshold: 120, // 2 小时
    },
    response: {
      level: 'friend',
      message: '嘿，好像有一段时间没动静了？需要聊聊吗？',
      escalateAfter: 30, // 30 分钟后升级到 Coach
    },
    cooldown: 60, // 1 小时冷却
  },
  
  {
    id: 'deadline-postponed',
    type: 'deadline_postponed_twice',
    condition: {
      metric: 'deadlinePostponeMap',
      operator: '>=',
      threshold: 2,
    },
    response: {
      level: 'coach',
      message: '我注意到这个任务的 DDL 被推迟了好几次。我们来聊聊是什么阻碍了你？',
      coachPrompt: 'User has postponed a task deadline multiple times. Help analyze blockers and suggest solutions.',
    },
    cooldown: 120,
  },
  
  {
    id: 'low-daily-completion-evening',
    type: 'low_daily_completion',
    condition: {
      metric: 'todayCompletionRate',
      operator: '<',
      threshold: 60,
      timeWindow: { start: '18:00', end: '23:59' },
    },
    response: {
      level: 'coach',
      message: '今天的进度有点落后了。我们来看看能不能调整一下计划？',
      coachPrompt: 'Daily completion rate is low. Help user prioritize remaining tasks or accept that some should be moved to tomorrow.',
    },
    cooldown: 180,
  },
  
  {
    id: 'quest-at-risk',
    type: 'quest_at_risk',
    condition: {
      metric: 'atRiskQuests',
      operator: '>',
      threshold: 0,
    },
    response: {
      level: 'coach',
      message: '有些副本可能来不及按时完成了。我们需要做一些取舍决定。',
      coachPrompt: 'Some quests are at risk of not completing on time. Help user decide on pruning, delegation, or deadline extension.',
    },
    cooldown: 240,
  },
];
```

---

## 💬 对话系统设计

### Conversation Context

```typescript
// src/types/conversation.ts

interface ConversationContext {
  // 触发原因
  trigger: {
    type: InterventionTriggerType;
    metrics: Partial<HealthMetrics>;
  };
  
  // 相关任务/副本
  relatedEntities: {
    tasks: CustomTask[];
    quests: MainQuest[];
  };
  
  // 用户档案 (用于个性化)
  userProfile: {
    recentPatterns: string[];      // 最近的行为模式
    preferredCommunicationStyle: 'direct' | 'gentle' | 'analytical';
    knownBlockers: string[];       // 已知的阻碍因素
  };
  
  // AI 可采取的行动
  availableActions: AIAction[];
}

interface AIAction {
  id: string;
  type: 'task_breakdown' | 'priority_change' | 'deadline_extend' | 'quest_prune' | 'moscow_update' | 'encourage' | 'reflect';
  label: string;
  description: string;
  requiresConfirmation: boolean;
  execute: (params: unknown) => void;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'friend' | 'coach' | 'system';
  content: string;
  timestamp: string;
  
  // AI 消息附加
  suggestedActions?: AIAction[];
  
  // 用户确认的动作
  confirmedAction?: {
    actionId: string;
    params: unknown;
  };
}
```

### Friend vs Coach Prompt 设计

```typescript
// src/services/ai-prompts.ts

export const FRIEND_SYSTEM_PROMPT = `
你是用户的 "小伙伴"（The Friend），一个温和、关心用户的 AI 助手。

你的角色：
- 温和地提醒和陪伴
- 觉察用户的状态变化
- 轻量级的支持和鼓励
- 如果情况复杂，建议升级到 Coach

你的语气：
- 友好、轻松、不带压力
- 使用第二人称（你）
- 可以用一些 emoji 😊

你不会：
- 强迫用户做任何事
- 深入分析复杂问题（那是 Coach 的工作）
- 给出长篇大论

当前状况：
{context}

请用 2-3 句话回应用户。如果用户表示"太难了"、"不想做"、"焦虑"等，建议："要不要让 Coach 来帮忙分析一下？"
`;

// ===== 离线模式固定模板 =====
export const OFFLINE_TEMPLATES = {
  // 当 Coach 不可用时，Friend 使用这些模板
  worry_vs_facts: {
    trigger: ['焦虑', '担心', '害怕', '压力'],
    response: `
我注意到你可能有些担忧。让我们试试 "Worry vs Facts" 练习：

📝 **写下你的担忧**：
   _________________________

🔍 **这是事实还是想象？**
   - 这个担忧有证据支持吗？
   - 最坏的情况真的会发生吗？
   - 有没有其他可能的解释？

💡 **如果担忧成真，你能做什么？**
   - 第一步是什么？
   - 你之前是怎么处理类似情况的？

🌟 **此刻你可以控制的是什么？**
    `,
  },
  
  five_minute_start: {
    trigger: ['不想做', '拖延', '太难', '没动力'],
    response: `
我懂，有时候开始是最难的部分。试试 "5 分钟起步法"？

⏱️ **只承诺 5 分钟**
   - 设个 5 分钟的计时器
   - 就做 5 分钟，然后可以停下来
   - 没有压力，没有期待

🎯 **选一个最小的第一步**
   - 打开文档？
   - 写一句话？
   - 找到需要的资料？

通常，开始之后会比想象中容易。但如果 5 分钟后还是不想做，那也完全 OK 👌
    `,
  },
  
  blocker_checklist: {
    trigger: ['卡住', '不知道', '怎么办'],
    response: `
让我们检查一下常见的阻碍因素：

□ **任务太大？** → 能拆成更小的步骤吗？
□ **不清楚下一步？** → 具体要做什么？
□ **缺少信息？** → 需要问谁或查什么？
□ **精力不足？** → 需要先休息一下吗？
□ **完美主义？** → "完成"比"完美"更重要
□ **害怕失败？** → 最坏的情况是什么？
□ **外部依赖？** → 在等谁？能催一下吗？

哪一个最符合你的情况？
    `,
  },
  
  energy_check: {
    trigger: ['累', '困', '没精神'],
    response: `
看起来精力有点低。让我们做个快速检查：

🔋 **身体状态**
   - 上次吃东西是什么时候？
   - 喝够水了吗？
   - 需要站起来活动一下吗？

😴 **休息需求**
   - 昨晚睡够了吗？
   - 需要小睡 15 分钟吗？
   - 或者出去走走？

🎯 **调整计划**
   - 现在的精力适合做什么任务？
   - 有没有更轻松的任务可以先做？

有时候最高效的做法是先照顾好自己 💚
    `,
  },
  
  coach_unavailable: {
    trigger: [],
    response: `
🔌 **Coach 暂时不可用**（网络问题）

不过没关系，我（Friend）还在这里！

你可以：
1. 告诉我你的感受，我会尽力帮忙
2. 使用上面的工具自我分析
3. 等网络恢复后再和 Coach 深入讨论

现在有什么我能帮到你的吗？
    `,
  },
};

export const COACH_SYSTEM_PROMPT = `
你是用户的 "教练"（The Coach），一个专业的 AI 策略顾问。

你的能力：
1. **任务拆解**：将大任务分解为可执行的小步骤
2. **优先级分析**：使用 MoSCoW + 四象限帮助用户排序
3. **SMART 检测**：分析目标是否符合 SMART 原则
4. **剪枝建议**：在时间不够时，建议放弃或推迟哪些任务
5. **心理建设**：帮助用户处理拖延、焦虑、完美主义

你的原则：
- **Human-in-the-loop**：你是顾问，用户是决策者
- 给出建议时，明确标注"建议"，并等待用户确认
- 不要自动执行任何修改用户数据的操作

你的输出格式：
当你要建议采取行动时，使用以下格式：
[ACTION: action_type]
{参数的 JSON}
[/ACTION]

例如：
[ACTION: task_breakdown]
{"taskId": "xxx", "subtasks": ["步骤1", "步骤2", "步骤3"]}
[/ACTION]

用户需要明确回复"确认"才会执行。

当前用户状况：
{context}

任务/副本列表：
{entities}

请帮助用户解决当前问题。
`;
```

---

## 📁 文件结构

```
src/
├── stores/
│   ├── game-store.ts           # 现有游戏数据
│   ├── planner-store.ts        # 新增：Proactive Planner 状态
│   └── ui-store.ts             # 现有 UI 状态
│
├── types/
│   ├── planner-events.ts       # 事件类型定义
│   ├── intervention.ts         # 干预系统类型
│   └── conversation.ts         # 对话系统类型
│
├── services/
│   ├── monitor-engine.ts       # 监测引擎
│   ├── intervention-manager.ts # 干预管理器
│   ├── ai-client.ts            # Gemini API 客户端
│   └── ai-prompts.ts           # Prompt 模板
│
├── config/
│   └── intervention-triggers.ts # 触发器配置
│
├── features/
│   └── planner/
│       ├── PlannerProvider.tsx       # Context Provider
│       ├── components/
│       │   ├── ChatInterface.tsx     # 对话界面
│       │   ├── StatusIndicator.tsx   # 红绿灯指示器
│       │   ├── InterventionPopup.tsx # 干预弹窗
│       │   └── MoSCoWSuggestion.tsx  # MoSCoW 建议卡片
│       └── hooks/
│           ├── useMonitor.ts         # 监测 Hook
│           └── useConversation.ts    # 对话 Hook
│
└── components/
    └── ui/
        └── ChatBubble.tsx            # 聊天气泡组件
```

---

## 🔜 实现路线图

### Phase 4.1: 基础设施 (Week 1)
- [ ] 创建 `planner-store.ts`
- [ ] 定义事件类型和结构
- [ ] 实现 `MonitorEngine` 基础循环
- [ ] 创建 `StatusIndicator` 组件

### Phase 4.2: 干预系统 (Week 2)
- [ ] 实现触发器评估逻辑
- [ ] 创建 `ChatInterface` 组件
- [ ] 实现 Friend 对话逻辑（本地规则）
- [ ] 集成 Gemini API for Coach

### Phase 4.3: 策略引擎 (Week 3)
- [ ] 实现 MoSCoW 建议算法
- [ ] 实现 SMART 检测
- [ ] 实现剪枝建议逻辑
- [ ] 创建 Human-in-the-loop 确认流程

### Phase 4.4: 复盘系统 (Week 4)
- [ ] 创建任务完成复盘问卷
- [ ] 实现副本总结生成
- [ ] 实现周期总结
- [ ] 数据结构为未来 RL 预留

---

## ✅ 设计决策

1. **API Key 管理**：仅存储在 bridge 服务端 `.env` 文件中，不进入前端 bundle
   ```
   GEMINI_API_KEY=your_key_here
   ```

2. **离线模式**：使用固定模板作为 Friend 的回复，例如：
   - "Worry vs Facts" 分析框架
   - "5 分钟起步法" 提示
   - 常见阻碍因素检查清单
   - Coach 不可用时显示提示

3. **通知方式**：
   - 🔴 Red 状态 → 浏览器原生通知（即使最小化也能看到）
   - 🟡 Yellow 状态 → 应用内通知
   - 首次使用时请求通知权限

4. **数据隐私**：任务详情直接发送给 Gemini，不需要脱敏

---

**下一步**：确认此设计后，我将开始实现 Phase 4.1 的代码。
