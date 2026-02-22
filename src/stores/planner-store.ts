/**
 * Proactive Planner Store
 * 智能规划系统的状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlannerState,
  PlannerEvent,
  PlannerEventType,
  HealthMetrics,
  Intervention,
  InterventionTriggerType,
  ConversationMessage,
  ConversationContext,
  MoSCoWSuggestion,
  TaskReflection,
  PeriodSummary,
} from '../types/planner';
import { DEFAULT_TRIGGERS } from '../config/intervention-triggers';
import { createPrefixedId } from '../lib/id';

// ==================== 初始状态 ====================

const initialHealthMetrics: HealthMetrics = {
  timeSinceLastCompletion: 0,
  todayCompletionRate: 100,
  todayCompletedCount: 0,
  todayTotalCount: 0,
  weightedCompletionRate: 100, // 一二三方法加权完成率
  overdueTasksCount: 0,
  overdueQuestsCount: 0, // 逾期副本数量
  overdueChaptersCount: 0, // 逾期章节数量
  inconsistentDeadlinesCount: 0, // DDL 不一致数量
  deadlinePostponeMap: {},
  atRiskQuests: [],
  weeklyTrend: 'stable',
  energyPattern: 'medium',
  overallStatus: 'green',
  statusReasons: [],
  lastUpdated: new Date().toISOString(),
};

const initialState: PlannerState = {
  monitoring: {
    isActive: false,
    lastCheckTime: null,
    status: 'idle',
  },
  healthMetrics: initialHealthMetrics,
  eventStream: [],
  triggers: DEFAULT_TRIGGERS,
  currentIntervention: null,
  interventionHistory: [],
  conversation: {
    isOpen: false,
    mode: 'friend',
    messages: [],
    context: null,
  },
  moscowSuggestions: {},
  reflections: [],
  summaries: [],
  deadlinePostponeMap: {},
};

// ==================== Store Actions ====================

interface PlannerActions {
  // 监测控制
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateMonitoringStatus: (status: PlannerState['monitoring']['status']) => void;

  // 健康指标
  updateHealthMetrics: (metrics: Partial<HealthMetrics>) => void;
  setOverallStatus: (status: 'green' | 'yellow' | 'red', reasons: string[]) => void;

  // 事件系统
  addEvent: (
    type: PlannerEventType,
    entity: PlannerEvent['entity'],
    payload: Record<string, unknown>,
    metadata?: Partial<PlannerEvent['metadata']>
  ) => string; // returns event ID
  getRecentEvents: (count?: number) => PlannerEvent[];
  getEventsByType: (type: PlannerEventType) => PlannerEvent[];
  getEventsByEntity: (entityType: string, entityId: string) => PlannerEvent[];

  // 干预系统
  triggerIntervention: (triggerId: string, triggerType: InterventionTriggerType) => void;
  acknowledgeIntervention: () => void;
  escalateIntervention: () => void;
  resolveIntervention: (resolution: Intervention['resolution']) => void;
  dismissIntervention: () => void;
  updateTriggerCooldown: (triggerId: string) => void;

  // 对话系统
  openConversation: (mode: 'friend' | 'coach', context?: ConversationContext) => void;
  closeConversation: () => void;
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void;
  confirmAction: (messageId: string, actionId: string, params: Record<string, unknown>) => void;

  // MoSCoW 系统
  addMoSCoWSuggestion: (suggestion: Omit<MoSCoWSuggestion, 'suggestedAt'>) => void;
  confirmMoSCoWSuggestion: (taskId: string) => void;
  dismissMoSCoWSuggestion: (taskId: string) => void;

  // 复盘系统
  addReflection: (reflection: TaskReflection) => void;
  addSummary: (summary: PeriodSummary) => void;
  updateSummary: (id: string, updates: Partial<PeriodSummary>) => void;
  getSummariesByType: (type: PeriodSummary['type']) => PeriodSummary[];
  getSummaryById: (id: string) => PeriodSummary | undefined;

  // DDL 追踪
  recordDeadlinePostpone: (taskId: string) => number; // returns new count
  clearDeadlinePostpone: (taskId: string) => void;

  // 数据管理
  exportPlannerData: () => string;
  resetPlannerData: () => void;
}

// ==================== Store Implementation ====================

export const usePlannerStore = create<PlannerState & PlannerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== 监测控制 ==========

      startMonitoring: () => {
        set({
          monitoring: {
            ...get().monitoring,
            isActive: true,
            status: 'watching',
          },
        });
        get().addEvent('system.monitor_tick', { type: 'system', id: 'monitor', name: 'Monitor' }, { action: 'start' });
      },

      stopMonitoring: () => {
        set({
          monitoring: {
            ...get().monitoring,
            isActive: false,
            status: 'idle',
          },
        });
      },

      updateMonitoringStatus: (status) => {
        const prev = get().monitoring.status;
        if (prev !== status) {
          set({
            monitoring: {
              ...get().monitoring,
              status,
              lastCheckTime: new Date().toISOString(),
            },
          });
          get().addEvent('system.status_changed', { type: 'system', id: 'monitor' }, { from: prev, to: status });
        }
      },

      // ========== 健康指标 ==========

      updateHealthMetrics: (metrics) => {
        set({
          healthMetrics: {
            ...get().healthMetrics,
            ...metrics,
            lastUpdated: new Date().toISOString(),
          },
        });
      },

      setOverallStatus: (status, reasons) => {
        const prev = get().healthMetrics.overallStatus;
        set({
          healthMetrics: {
            ...get().healthMetrics,
            overallStatus: status,
            statusReasons: reasons,
            lastUpdated: new Date().toISOString(),
          },
        });

        // 更新监测状态
        if (status === 'red') {
          get().updateMonitoringStatus('alert');
        } else if (status === 'yellow') {
          get().updateMonitoringStatus('watching');
        }

        // 记录状态变化事件
        if (prev !== status) {
          get().addEvent('system.status_changed', { type: 'system', id: 'health' }, { from: prev, to: status, reasons }, { importance: status === 'red' ? 'critical' : 'medium' });
        }
      },

      // ========== 事件系统 ==========

      addEvent: (type, entity, payload, metadata = {}) => {
        const id = createPrefixedId('evt', 9);
        const event: PlannerEvent = {
          id,
          type,
          timestamp: new Date().toISOString(),
          entity,
          payload,
          metadata: {
            source: metadata.source || 'system',
            importance: metadata.importance || 'low',
            causedBy: metadata.causedBy,
            relatedEvents: metadata.relatedEvents,
          },
        };

        set((state) => ({
          eventStream: [event, ...state.eventStream].slice(0, 1000), // 保留最近 1000 条
        }));

        return id;
      },

      getRecentEvents: (count = 50) => {
        return get().eventStream.slice(0, count);
      },

      getEventsByType: (type) => {
        return get().eventStream.filter((e) => e.type === type);
      },

      getEventsByEntity: (entityType, entityId) => {
        return get().eventStream.filter(
          (e) => e.entity.type === entityType && e.entity.id === entityId
        );
      },

      // ========== 干预系统 ==========

      triggerIntervention: (triggerId, triggerType) => {
        const trigger = get().triggers.find((t) => t.id === triggerId);
        if (!trigger) return;

        const intervention: Intervention = {
          id: `int_${Date.now()}`,
          triggerId,
          triggerType,
          startedAt: new Date().toISOString(),
          status: 'pending',
          currentLevel: trigger.response.level,
        };

        set({
          currentIntervention: intervention,
          monitoring: { ...get().monitoring, status: 'intervention' },
        });

        get().addEvent(
          'intervention.triggered',
          { type: 'system', id: intervention.id },
          { triggerId, triggerType, level: trigger.response.level },
          { importance: 'high' }
        );

        // 自动打开对话
        if (trigger.response.level !== 'popup') {
          get().openConversation(trigger.response.level as 'friend' | 'coach', {
            trigger: { type: triggerType, metrics: get().healthMetrics },
            relatedTaskIds: [],
            relatedQuestIds: [],
            userProfile: {
              recentPatterns: [],
              preferredStyle: 'gentle',
              knownBlockers: [],
            },
          });

          // 添加初始消息
          get().addMessage({
            role: trigger.response.level as 'friend' | 'coach',
            content: trigger.response.message,
          });
        }
      },

      acknowledgeIntervention: () => {
        const current = get().currentIntervention;
        if (!current) return;

        set({
          currentIntervention: {
            ...current,
            status: 'acknowledged',
            acknowledgedAt: new Date().toISOString(),
          },
        });

        get().addEvent(
          'intervention.acknowledged',
          { type: 'system', id: current.id },
          { triggerType: current.triggerType }
        );
      },

      escalateIntervention: () => {
        const current = get().currentIntervention;

        // 如果有活跃干预，升级干预等级
        if (current && current.currentLevel !== 'coach') {
          set({
            currentIntervention: {
              ...current,
              currentLevel: 'coach',
              status: 'in_progress',
            },
          });

          get().addEvent(
            'intervention.escalated',
            { type: 'system', id: current.id },
            { from: current.currentLevel, to: 'coach' },
            { importance: 'high' }
          );
        }

        // 无论是否有活跃干预，只要当前不是 Coach 模式，都切换到 Coach 模式
        if (get().conversation.mode !== 'coach') {
          set({
            conversation: {
              ...get().conversation,
              mode: 'coach',
            },
          });
        }
      },

      resolveIntervention: (resolution) => {
        const current = get().currentIntervention;
        if (!current) return;

        const resolved: Intervention = {
          ...current,
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          resolution,
        };

        set((state) => ({
          currentIntervention: null,
          interventionHistory: [resolved, ...state.interventionHistory].slice(0, 100),
          monitoring: { ...state.monitoring, status: 'watching' },
        }));

        get().closeConversation();
        get().updateTriggerCooldown(current.triggerId);

        get().addEvent(
          'intervention.resolved',
          { type: 'system', id: current.id },
          { resolution },
          { importance: 'medium' }
        );
      },

      dismissIntervention: () => {
        const current = get().currentIntervention;
        if (!current) return;

        const dismissed: Intervention = {
          ...current,
          status: 'dismissed',
          resolvedAt: new Date().toISOString(),
        };

        set((state) => ({
          currentIntervention: null,
          interventionHistory: [dismissed, ...state.interventionHistory].slice(0, 100),
          monitoring: { ...state.monitoring, status: 'watching' },
        }));

        get().closeConversation();
        get().updateTriggerCooldown(current.triggerId);

        get().addEvent(
          'intervention.dismissed',
          { type: 'system', id: current.id },
          { triggerType: current.triggerType }
        );
      },

      updateTriggerCooldown: (triggerId) => {
        set((state) => ({
          triggers: state.triggers.map((t) =>
            t.id === triggerId ? { ...t, lastTriggered: new Date().toISOString() } : t
          ),
        }));
      },

      // ========== 对话系统 ==========

      openConversation: (mode, context) => {
        set({
          conversation: {
            isOpen: true,
            mode,
            messages: [],
            context: context ?? null,
          },
        });

        get().addEvent(
          'conversation.started',
          { type: 'system', id: 'conversation' },
          { mode, hasContext: !!context }
        );
      },

      closeConversation: () => {
        const conversation = get().conversation;

        set({
          conversation: {
            ...initialState.conversation,
          },
        });

        if (conversation.messages.length > 0) {
          get().addEvent(
            'conversation.ended',
            { type: 'system', id: 'conversation' },
            { messageCount: conversation.messages.length, mode: conversation.mode }
          );
        }
      },

      addMessage: (message) => {
        const id = createPrefixedId('msg', 6);
        const fullMessage: ConversationMessage = {
          ...message,
          id,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          conversation: {
            ...state.conversation,
            messages: [...state.conversation.messages, fullMessage],
          },
        }));

        // 记录事件
        const eventType = message.role === 'user' ? 'conversation.user_message' : 'conversation.ai_response';
        get().addEvent(eventType, { type: 'system', id: 'conversation' }, { role: message.role, hasActions: !!message.suggestedActions?.length });
      },

      confirmAction: (messageId, actionId, params) => {
        set((state) => ({
          conversation: {
            ...state.conversation,
            messages: state.conversation.messages.map((m) =>
              m.id === messageId
                ? { ...m, confirmedAction: { actionId, params } }
                : m
            ),
          },
        }));

        get().addEvent(
          'conversation.action_taken',
          { type: 'system', id: 'conversation' },
          { actionId, params },
          { importance: 'medium' }
        );
      },

      // ========== MoSCoW 系统 ==========

      addMoSCoWSuggestion: (suggestion) => {
        set((state) => ({
          moscowSuggestions: {
            ...state.moscowSuggestions,
            [suggestion.taskId]: {
              ...suggestion,
              suggestedAt: new Date().toISOString(),
            },
          },
        }));
      },

      confirmMoSCoWSuggestion: (taskId) => {
        set((state) => ({
          moscowSuggestions: {
            ...state.moscowSuggestions,
            [taskId]: {
              ...state.moscowSuggestions[taskId],
              confirmedByUser: true,
            },
          },
        }));
      },

      dismissMoSCoWSuggestion: (taskId) => {
        set((state) => {
          const { [taskId]: _, ...rest } = state.moscowSuggestions;
          return { moscowSuggestions: rest };
        });
      },

      // ========== 复盘系统 ==========

      addReflection: (reflection) => {
        set((state) => ({
          reflections: [reflection, ...state.reflections].slice(0, 500),
        }));

        get().addEvent(
          'reflection.task_completed',
          { type: 'task', id: reflection.taskId, name: reflection.taskName },
          { satisfaction: reflection.satisfactionScore, energyState: reflection.energyState }
        );
      },

      addSummary: (summary) => {
        set((state) => ({
          summaries: [...state.summaries, summary].sort(
            (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          ),
        }));

        get().addEvent(
          'summary.generated',
          { type: 'system', id: summary.id },
          { summaryType: summary.type, startDate: summary.startDate, endDate: summary.endDate, stats: summary.stats }
        );
      },

      updateSummary: (id, updates) =>
        set((state) => ({
          summaries: state.summaries.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      getSummariesByType: (type) => {
        return get().summaries.filter(s => s.type === type);
      },

      getSummaryById: (id) => {
        return get().summaries.find(s => s.id === id);
      },

      // ========== DDL 追踪 ==========

      recordDeadlinePostpone: (taskId) => {
        const current = get().deadlinePostponeMap[taskId] || 0;
        const newCount = current + 1;

        set((state) => ({
          deadlinePostponeMap: {
            ...state.deadlinePostponeMap,
            [taskId]: newCount,
          },
        }));

        return newCount;
      },

      clearDeadlinePostpone: (taskId) => {
        set((state) => {
          const { [taskId]: _, ...rest } = state.deadlinePostponeMap;
          return { deadlinePostponeMap: rest };
        });
      },

      // ========== 数据管理 ==========

      exportPlannerData: () => {
        const state = get();
        const {
          startMonitoring, stopMonitoring, updateMonitoringStatus,
          updateHealthMetrics, setOverallStatus,
          addEvent, getRecentEvents, getEventsByType, getEventsByEntity,
          triggerIntervention, acknowledgeIntervention, escalateIntervention,
          resolveIntervention, dismissIntervention, updateTriggerCooldown,
          openConversation, closeConversation, addMessage, confirmAction,
          addMoSCoWSuggestion, confirmMoSCoWSuggestion, dismissMoSCoWSuggestion,
          addReflection, addSummary,
          recordDeadlinePostpone, clearDeadlinePostpone,
          exportPlannerData, resetPlannerData,
          ...data
        } = state;
        return JSON.stringify(data, null, 2);
      },

      resetPlannerData: () => {
        set(initialState);
      },
    }),
    {
      name: 'earth-online-planner',
      partialize: (state) => {
        // 只持久化数据，不持久化 actions
        const {
          startMonitoring, stopMonitoring, updateMonitoringStatus,
          updateHealthMetrics, setOverallStatus,
          addEvent, getRecentEvents, getEventsByType, getEventsByEntity,
          triggerIntervention, acknowledgeIntervention, escalateIntervention,
          resolveIntervention, dismissIntervention, updateTriggerCooldown,
          openConversation, closeConversation, addMessage, confirmAction,
          addMoSCoWSuggestion, confirmMoSCoWSuggestion, dismissMoSCoWSuggestion,
          addReflection, addSummary,
          recordDeadlinePostpone, clearDeadlinePostpone,
          exportPlannerData, resetPlannerData,
          ...data
        } = state;
        return data;
      },
      // Merge function to ensure new triggers are added to existing persisted triggers
      merge: (persistedState: unknown, currentState: PlannerState & PlannerActions) => {
        const persisted = persistedState as Partial<PlannerState>;

        // Merge triggers: keep user preferences (enabled/disabled) but add new triggers
        const persistedTriggers = persisted.triggers || [];
        const persistedTriggerIds = new Set(persistedTriggers.map(t => t.id));

        // Find new triggers that don't exist in persisted state
        const newTriggers = DEFAULT_TRIGGERS.filter(t => !persistedTriggerIds.has(t.id));

        if (newTriggers.length > 0) {
          console.log('[PlannerStore] Adding new triggers:', newTriggers.map(t => t.id));
        }

        return {
          ...currentState,
          ...persisted,
          // Merge triggers: persisted + new ones
          triggers: [...persistedTriggers, ...newTriggers],
        };
      },
    }
  )
);

export default usePlannerStore;
