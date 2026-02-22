/**
 * Proactive Planner Type Definitions
 * 智能规划系统的核心类型
 */

// ==================== Event Types ====================

/**
 * 事件类型枚举
 */
export type PlannerEventType =
  // 任务生命周期
  | 'task.created'
  | 'task.started'
  | 'task.paused'
  | 'task.resumed'
  | 'task.completed'
  | 'task.checklist_tick' // DoD 进度更新
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
  | 'intervention.escalated'
  | 'intervention.resolved'
  | 'intervention.dismissed'

  // AI 会话事件
  | 'conversation.started'
  | 'conversation.user_message'
  | 'conversation.ai_response'
  | 'conversation.action_taken'
  | 'conversation.ended'

  // 复盘事件
  | 'reflection.task_completed'
  | 'reflection.quest_completed'
  | 'summary.weekly_generated'
  | 'summary.monthly_generated'
  | 'summary.generated'

  // 系统事件
  | 'system.monitor_tick'
  | 'system.status_changed'
  | 'system.daily_reset';

/**
 * 核心事件结构
 */
export interface PlannerEvent {
  id: string;
  type: PlannerEventType;
  timestamp: string; // ISO 8601

  entity: {
    type: 'task' | 'quest' | 'chapter' | 'season' | 'system' | 'user';
    id: string;
    name?: string;
  };

  payload: Record<string, unknown>;

  metadata: {
    source: 'user' | 'system' | 'ai_friend' | 'ai_coach';
    importance: 'low' | 'medium' | 'high' | 'critical';
    causedBy?: string;
    relatedEvents?: string[];
  };
}

// ==================== Health Metrics ====================

/**
 * 风险副本信息
 */
export interface AtRiskQuest {
  questId: string;
  questTitle: string;
  deadline: string;
  currentProgress: number;
  requiredDailyProgress: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'accelerate' | 'prune' | 'delegate' | 'extend';
}

/**
 * 健康指标（红绿灯系统）
 */
export interface HealthMetrics {
  // 实时指标
  timeSinceLastCompletion: number; // 分钟
  todayCompletionRate: number; // 0-100
  todayCompletedCount: number;
  todayTotalCount: number;
  weightedCompletionRate: number; // 0-100, 按一二三方法加权（创造 80%, 税收 15%, 维护 5%）

  // 风险指标
  overdueTasksCount: number;
  overdueQuestsCount: number; // 逾期副本数量
  overdueChaptersCount: number; // 逾期章节数量
  inconsistentDeadlinesCount: number; // DDL 不一致数量（任务 DDL > 副本 DDL 等）
  deadlinePostponeMap: Record<string, number>; // taskId -> postpone count
  atRiskQuests: AtRiskQuest[];

  // 趋势指标
  weeklyTrend: 'improving' | 'stable' | 'declining';
  energyPattern: 'high' | 'medium' | 'low';

  // 综合状态
  overallStatus: 'green' | 'yellow' | 'red';
  statusReasons: string[];

  // 最后更新时间
  lastUpdated: string;
}

// ==================== Intervention System ====================

/**
 * 干预触发器类型
 */
export type InterventionTriggerType =
  | 'idle_too_long'
  | 'deadline_postponed_twice'
  | 'progress_severely_behind'
  | 'low_daily_completion'
  | 'quest_at_risk'
  | 'quest_overdue'
  | 'chapter_overdue'
  | 'deadline_inconsistency'
  | 'energy_depleted'
  | 'focus_lost';

/**
 * 干预触发器配置
 */
export interface InterventionTrigger {
  id: string;
  type: InterventionTriggerType;

  condition: {
    metric: keyof HealthMetrics | 'custom';
    operator: '>' | '<' | '==' | '>=' | '<=' | 'has_items';
    threshold: number | string;
    timeWindow?: {
      start: string; // "18:00"
      end: string;   // "23:00"
    };
  };

  response: {
    level: 'popup' | 'friend' | 'coach';
    message: string;
    escalateAfter?: number; // 分钟
    coachPrompt?: string;
  };

  cooldown: number; // 分钟
  lastTriggered?: string;
  enabled: boolean;
}

/**
 * 干预实例
 */
export interface Intervention {
  id: string;
  triggerId: string;
  triggerType: InterventionTriggerType;

  startedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;

  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  currentLevel: 'popup' | 'friend' | 'coach';

  conversationId?: string;

  resolution?: {
    action: string;
    outcome: 'success' | 'partial' | 'deferred';
    userFeedback?: string;
  };
}

// ==================== Conversation System ====================

/**
 * 对话消息
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'friend' | 'coach' | 'system';
  content: string;
  timestamp: string;

  // AI 建议的动作
  suggestedActions?: AIAction[];

  // 用户确认的动作
  confirmedAction?: {
    actionId: string;
    params: Record<string, unknown>;
  };
}

/**
 * AI 可执行的动作
 */
export interface AIAction {
  id: string;
  type: 'task_breakdown' | 'priority_change' | 'deadline_extend' | 'quest_prune' | 'moscow_update' | 'encourage' | 'reflect';
  label: string;
  description: string;
  params?: Record<string, unknown>;
  requiresConfirmation: boolean;
}

/**
 * 对话上下文
 */
export interface ConversationContext {
  trigger?: {
    type: InterventionTriggerType;
    metrics: Partial<HealthMetrics>;
  };

  relatedTaskIds: string[];
  relatedQuestIds: string[];

  userProfile: {
    recentPatterns: string[];
    preferredStyle: 'direct' | 'gentle' | 'analytical';
    knownBlockers: string[];
  };
}

// ==================== MoSCoW System ====================

/**
 * MoSCoW 优先级
 */
export type MoSCoWPriority = 'must' | 'should' | 'could' | 'wont';

/**
 * MoSCoW 建议
 */
export interface MoSCoWSuggestion {
  taskId: string;
  suggestedPriority: MoSCoWPriority;
  currentPriority?: MoSCoWPriority;
  reason: string;
  confidence: number; // 0-1
  confirmedByUser: boolean;
  suggestedAt: string;
}

// ==================== Reflection System ====================

/**
 * 任务复盘数据
 */
export interface TaskReflection {
  taskId: string;
  taskName: string;
  completedAt: string;

  satisfactionScore: 1 | 2 | 3 | 4 | 5;
  goodPoints: string;
  improvements: string;
  delayReason?: string;
  energyState: 'high' | 'medium' | 'low';
  blockerAction?: string;

  // AI 分析结果
  aiAnalysis?: {
    summary: string;
    beliefPatterns?: string[];
    limitingBeliefAlerts?: string[];
    reframeSuggestions?: string[];
    emotionalInsights?: string[];
    growthSuggestions?: string[];
    affirmation?: string;
    attributeGains?: { attribute: string; reason: string }[];
    skillProgress?: { skill: string; reason: string }[];
  };
}

/**
 * 周期总结
 */
export interface PeriodSummary {
  id: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  generatedAt: string;

  stats: {
    tasksCompleted: number;
    tasksCreated: number;
    completionRate: number;
    avgSatisfaction: number;
    totalFocusTime: number;
  };

  insights: {
    topAccomplishments: string[];
    commonBlockers: string[];
    growthAreas: string[];
    recommendations: string[];

    // Qualitative Data
    narrativeProgress?: {
      seasonTitle: string;
      chapters: string[];
    }[];
    questHighlights?: {
      completedCount: number;
      toughestQuest?: { title: string; duration: number }; // duration in days
      quickestQuest?: { title: string; duration: number };
    };
  };

  // 用于未来 RL 训练
  rawData: {
    taskReflections: TaskReflection[];
    interventionCount: number;
    statusChanges: { from: string; to: string; timestamp: string }[];
  };

  // User input
  userNotes?: string;
}

// ==================== Store State ====================

/**
 * Planner Store 状态
 */
export interface PlannerState {
  // 监测状态
  monitoring: {
    isActive: boolean;
    lastCheckTime: string | null;
    status: 'idle' | 'watching' | 'alert' | 'intervention';
  };

  // 健康指标
  healthMetrics: HealthMetrics;

  // 事件流（最近 1000 条）
  eventStream: PlannerEvent[];

  // 干预
  triggers: InterventionTrigger[];
  currentIntervention: Intervention | null;
  interventionHistory: Intervention[];

  // 对话
  conversation: {
    isOpen: boolean;
    mode: 'friend' | 'coach';
    messages: ConversationMessage[];
    context: ConversationContext | null;
  };

  // MoSCoW 建议
  moscowSuggestions: Record<string, MoSCoWSuggestion>;

  // 复盘数据
  reflections: TaskReflection[];
  summaries: PeriodSummary[];

  // DDL 推迟追踪
  deadlinePostponeMap: Record<string, number>;
}
