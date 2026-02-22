/**
 * Monitor Engine
 * 后台监测引擎 - 定期检查健康指标并触发干预
 */

import { usePlannerStore } from '../stores/planner-store';
import { useGameStore } from '../stores/game-store';
import type {
  HealthMetrics,
  AtRiskQuest,
  InterventionTrigger,
  PlannerEvent,
  TaskReflection,
} from '../types/planner';
import type { MainQuest, Season, Chapter } from '../types/task';

// ==================== 配置 ====================

const CHECK_INTERVAL = 10 * 60 * 1000; // 10 分钟

// ==================== MonitorEngine Class ====================

class MonitorEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  // ========== 生命周期 ==========

  start() {
    if (this.isRunning) {
      console.log('[Monitor] Already running');
      return;
    }

    console.log('[Monitor] Starting...');
    this.isRunning = true;

    // 立即执行一次
    this.tick();

    // 设置定时器
    this.intervalId = setInterval(() => this.tick(), CHECK_INTERVAL);

    // 更新 store 状态
    usePlannerStore.getState().startMonitoring();
  }

  stop() {
    if (!this.isRunning) return;

    console.log('[Monitor] Stopping...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    usePlannerStore.getState().stopMonitoring();
  }

  isActive() {
    return this.isRunning;
  }

  // ========== 主循环 ==========

  private async tick() {
    console.log('[Monitor] Tick at', new Date().toISOString());

    try {
      // 1. 收集指标
      const metrics = this.collectMetrics();

      // 2. 评估状态
      const { status, reasons } = this.evaluateStatus(metrics);

      // 3. 更新 store
      const plannerStore = usePlannerStore.getState();
      plannerStore.updateHealthMetrics(metrics);
      plannerStore.setOverallStatus(status, reasons);

      // 4. 检查触发器
      const triggeredTrigger = this.checkTriggers(metrics, status);

      // 5. 执行干预（如果有）
      if (triggeredTrigger && !plannerStore.currentIntervention) {
        plannerStore.triggerIntervention(triggeredTrigger.id, triggeredTrigger.type);
      }

      // 6. 记录系统事件
      plannerStore.addEvent(
        'system.monitor_tick',
        { type: 'system', id: 'monitor' },
        {
          status,
          metrics: {
            timeSinceLastCompletion: metrics.timeSinceLastCompletion,
            todayCompletionRate: metrics.todayCompletionRate,
            overdueTasksCount: metrics.overdueTasksCount,
          }
        }
      );

    } catch (error) {
      console.error('[Monitor] Tick failed:', error);
    }
  }

  // ========== 指标收集 ==========

  private collectMetrics(): HealthMetrics {
    const gameState = useGameStore.getState();
    const plannerState = usePlannerStore.getState();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 获取今天的任务
    const allTasks = gameState.customTasks || [];
    const todayTasks = allTasks.filter(t => {
      if (!t.createdAt) return false;
      const createdAt = new Date(t.createdAt);
      return createdAt >= todayStart;
    });

    const completedToday = todayTasks.filter(t => t.completed).length;
    const todayCompletionRate = todayTasks.length > 0
      ? (completedToday / todayTasks.length) * 100
      : 100;

    // 计算一二三方法加权完成率
    // 创造型任务 80% 权重, 税收型 15%, 维护型 5%
    const taskWeights = { creative: 0.80, tax: 0.15, maintenance: 0.05 };
    let totalWeight = 0;
    let completedWeight = 0;

    for (const task of todayTasks) {
      const taskType = task.taskType || 'creative';
      const weight = taskWeights[taskType as keyof typeof taskWeights] || 0.10;
      totalWeight += weight;
      if (task.completed) {
        completedWeight += weight;
      }
    }

    // 如果没有任务，按类型预期计算（假设应该有 1 个创造 + 2 个税收 + 3 个维护）
    const weightedCompletionRate = totalWeight > 0
      ? (completedWeight / totalWeight) * 100
      : 100;

    // 计算最后完成时间
    const timeSinceLastCompletion = this.calculateTimeSinceLastCompletion(plannerState.eventStream);

    // 统计逾期任务
    const overdueTasksCount = allTasks.filter(t => {
      if (t.completed) return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) < now;
    }).length;

    // 统计逾期副本
    const allQuests = gameState.mainQuests || [];
    const overdueQuestsCount = allQuests.filter(q => {
      if (q.status !== 'active') return false;
      if (!q.deadline) return false;
      return new Date(q.deadline) < now;
    }).length;

    // 统计逾期章节
    const allSeasons: Season[] = gameState.activeSeasons || [];
    let overdueChaptersCount = 0;
    for (const season of allSeasons) {
      if (season.status !== 'active') continue;
      for (const chapter of (season.chapters || [])) {
        if (chapter.status !== 'active') continue;
        if (!chapter.deadline) continue;
        if (new Date(chapter.deadline) < now) {
          overdueChaptersCount++;
        }
      }
    }

    // 检查 DDL 一致性（任务 DDL > 副本 DDL，副本 DDL > 章节 DDL）
    let inconsistentDeadlinesCount = 0;

    // 任务 DDL > 副本 DDL
    for (const task of allTasks) {
      if (!task.deadline || !task.linkedMainQuestId) continue;
      const linkedQuest = allQuests.find(q => q.id === task.linkedMainQuestId);
      if (linkedQuest?.deadline && new Date(task.deadline) > new Date(linkedQuest.deadline)) {
        inconsistentDeadlinesCount++;
      }
    }

    // 副本 DDL > 章节 DDL
    for (const quest of allQuests) {
      if (!quest.deadline || !quest.linkedChapterId || !quest.seasonId) continue;
      const season = allSeasons.find((s: Season) => s.id === quest.seasonId);
      const chapter = season?.chapters?.find((c: Chapter) => c.id === quest.linkedChapterId);
      if (chapter?.deadline && new Date(quest.deadline) > new Date(chapter.deadline)) {
        inconsistentDeadlinesCount++;
      }
    }

    // 分析风险副本
    const atRiskQuests = this.analyzeQuestRisks(gameState.mainQuests || []);

    // 获取 DDL 推迟记录
    const deadlinePostponeMap = plannerState.deadlinePostponeMap;

    // 计算周趋势
    const weeklyTrend = this.calculateWeeklyTrend(plannerState.eventStream);

    // 推断精力模式
    const energyPattern = this.inferEnergyPattern(plannerState.reflections);

    return {
      timeSinceLastCompletion,
      todayCompletionRate,
      todayCompletedCount: completedToday,
      todayTotalCount: todayTasks.length,
      weightedCompletionRate,
      overdueTasksCount,
      overdueQuestsCount,
      overdueChaptersCount,
      inconsistentDeadlinesCount,
      deadlinePostponeMap,
      atRiskQuests,
      weeklyTrend,
      energyPattern,
      overallStatus: 'green', // 将在 evaluateStatus 中计算
      statusReasons: [],
      lastUpdated: now.toISOString(),
    };
  }

  private sessionStartTime = Date.now();

  private calculateTimeSinceLastCompletion(eventStream: PlannerEvent[]): number {
    // Include both task completions and checklist ticks as "productive output"
    const productiveEvents = eventStream.filter((e: PlannerEvent) =>
      e.type === 'task.completed' || e.type === 'task.checklist_tick'
    );

    if (productiveEvents.length === 0) {
      // 检查 game store 的 archived tasks
      const archivedTasks = useGameStore.getState().archivedTasks || [];
      const lastArchived = archivedTasks
        .filter(t => t.archivedAt)
        .sort((a, b) => new Date(b.archivedAt!).getTime() - new Date(a.archivedAt!).getTime())[0];

      if (lastArchived?.archivedAt) {
        return Math.round((Date.now() - new Date(lastArchived.archivedAt).getTime()) / 60000);
      }

      // 没有记录，计算本次会话时长
      return Math.round((Date.now() - this.sessionStartTime) / 60000);
    }

    const lastProductive = new Date(productiveEvents[0].timestamp);
    return Math.round((Date.now() - lastProductive.getTime()) / 60000); // 分钟
  }

  private analyzeQuestRisks(quests: MainQuest[]): AtRiskQuest[] {
    const atRisk: AtRiskQuest[] = [];
    const now = new Date();

    for (const quest of quests) {
      if (quest.status !== 'active') continue;
      if (!quest.deadline) continue;

      const deadline = new Date(quest.deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        // 已逾期
        atRisk.push({
          questId: quest.id,
          questTitle: quest.title,
          deadline: quest.deadline,
          currentProgress: quest.progress || 0,
          requiredDailyProgress: 100, // 需要立即完成
          riskLevel: 'critical',
          suggestedAction: 'prune',
        });
      } else if (daysRemaining <= 3) {
        const remainingProgress = 100 - (quest.progress || 0);
        const requiredDailyProgress = remainingProgress / daysRemaining;

        if (requiredDailyProgress > 30) {
          atRisk.push({
            questId: quest.id,
            questTitle: quest.title,
            deadline: quest.deadline,
            currentProgress: quest.progress || 0,
            requiredDailyProgress,
            riskLevel: requiredDailyProgress > 50 ? 'high' : 'medium',
            suggestedAction: requiredDailyProgress > 50 ? 'extend' : 'accelerate',
          });
        }
      }
    }

    return atRisk;
  }

  private calculateWeeklyTrend(eventStream: PlannerEvent[]): 'improving' | 'stable' | 'declining' {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekCompletions = eventStream.filter((e: PlannerEvent) =>
      e.type === 'task.completed' && new Date(e.timestamp) > oneWeekAgo
    ).length;

    const lastWeekCompletions = eventStream.filter((e: PlannerEvent) =>
      e.type === 'task.completed' &&
      new Date(e.timestamp) > twoWeeksAgo &&
      new Date(e.timestamp) <= oneWeekAgo
    ).length;

    if (lastWeekCompletions === 0) return 'stable';

    const ratio = thisWeekCompletions / lastWeekCompletions;
    if (ratio > 1.1) return 'improving';
    if (ratio < 0.9) return 'declining';
    return 'stable';
  }

  private inferEnergyPattern(reflections: TaskReflection[]): 'high' | 'medium' | 'low' {
    const recent = reflections.slice(0, 10);
    if (recent.length === 0) return 'medium';

    const avgEnergy = recent.reduce((sum: number, r: TaskReflection) => {
      if (r.energyState === 'high') return sum + 3;
      if (r.energyState === 'medium') return sum + 2;
      return sum + 1;
    }, 0) / recent.length;

    if (avgEnergy > 2.3) return 'high';
    if (avgEnergy < 1.7) return 'low';
    return 'medium';
  }

  // ========== 状态评估 ==========

  private evaluateStatus(metrics: HealthMetrics): { status: 'green' | 'yellow' | 'red'; reasons: string[] } {
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
    if (currentHour >= 18 && metrics.todayCompletionRate < 60 && metrics.todayTotalCount > 0) {
      score += 2;
      reasons.push(`今日完成率仅 ${metrics.todayCompletionRate.toFixed(0)}%`);
    }

    // 规则 3: 有高风险副本
    const criticalQuests = metrics.atRiskQuests.filter(q => q.riskLevel === 'critical' || q.riskLevel === 'high');
    if (criticalQuests.length > 0) {
      score += 2;
      reasons.push(`${criticalQuests.length} 个副本处于高风险状态`);
    }

    // 规则 4: DDL 被推迟多次
    const frequentPostpones = Object.values(metrics.deadlinePostponeMap).filter(count => count >= 2);
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
      reasons.push(`有 ${metrics.overdueTasksCount} 个逾期任务`);
    }

    // 规则 6: 周趋势下降
    if (metrics.weeklyTrend === 'declining') {
      score += 1;
      reasons.push('本周完成量相比上周有所下降');
    }

    let status: 'green' | 'yellow' | 'red';
    if (score >= 3) {
      status = 'red';
    } else if (score >= 1) {
      status = 'yellow';
    } else {
      status = 'green';
    }

    return { status, reasons };
  }

  // ========== 触发器检查 ==========

  private checkTriggers(metrics: HealthMetrics, _status: 'green' | 'yellow' | 'red'): InterventionTrigger | null {
    const plannerState = usePlannerStore.getState();
    const triggers = plannerState.triggers.filter(t => t.enabled);

    console.log('[Monitor] === Checking Triggers ===');
    console.log('[Monitor] Enabled triggers:', triggers.map(t => t.id));
    console.log('[Monitor] Current metrics:', {
      timeSinceLastCompletion: metrics.timeSinceLastCompletion,
      todayCompletionRate: metrics.todayCompletionRate,
      overdueTasksCount: metrics.overdueTasksCount,
      atRiskQuestsCount: metrics.atRiskQuests.length,
    });

    const triggered: InterventionTrigger[] = [];

    for (const trigger of triggers) {
      // 检查冷却时间
      if (this.isOnCooldown(trigger)) {
        console.log(`[Monitor] ${trigger.id} - SKIPPED (cooldown until ${trigger.lastTriggered})`);
        continue;
      }

      // 检查时间窗口
      if (!this.isInTimeWindow(trigger)) {
        console.log(`[Monitor] ${trigger.id} - SKIPPED (outside time window)`);
        continue;
      }

      // 评估条件
      const conditionMet = this.evaluateTriggerCondition(trigger, metrics);
      const metricValue = trigger.condition.metric === 'custom'
        ? 'custom'
        : trigger.condition.metric === 'atRiskQuests'
          ? metrics.atRiskQuests.length
          : metrics[trigger.condition.metric as keyof HealthMetrics];

      console.log(`[Monitor] ${trigger.id} - condition: ${conditionMet ? '✅ MET' : '❌ NOT MET'}`, {
        metric: trigger.condition.metric,
        operator: trigger.condition.operator,
        threshold: trigger.condition.threshold,
        actualValue: metricValue,
      });

      if (conditionMet) {
        triggered.push(trigger);
      }
    }

    console.log(`[Monitor] Triggered count: ${triggered.length}`);
    if (triggered.length === 0) return null;

    // 返回优先级最高的触发器
    const selected = triggered.sort((a, b) =>
      this.severityScore(b.response.level) - this.severityScore(a.response.level)
    )[0];
    console.log(`[Monitor] Selected trigger: ${selected.id} (level: ${selected.response.level})`);
    return selected;
  }

  private isOnCooldown(trigger: InterventionTrigger): boolean {
    if (!trigger.lastTriggered) return false;

    const lastTriggered = new Date(trigger.lastTriggered);
    const cooldownMs = trigger.cooldown * 60 * 1000;

    return Date.now() - lastTriggered.getTime() < cooldownMs;
  }

  private isInTimeWindow(trigger: InterventionTrigger): boolean {
    const timeWindow = trigger.condition.timeWindow;
    if (!timeWindow) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = timeWindow.start.split(':').map(Number);
    const [endHour, endMin] = timeWindow.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private evaluateTriggerCondition(trigger: InterventionTrigger, metrics: HealthMetrics): boolean {
    const { metric, operator, threshold } = trigger.condition;

    // 特殊处理
    if (metric === 'custom') {
      // DDL 推迟检查
      if (trigger.type === 'deadline_postponed_twice') {
        return Object.values(metrics.deadlinePostponeMap).some(count => count >= (threshold as number));
      }
      return false;
    }

    if (metric === 'atRiskQuests') {
      if (operator === 'has_items') {
        return metrics.atRiskQuests.length > 0;
      }
      return false;
    }

    // 获取指标值
    const value = metrics[metric as keyof HealthMetrics];
    if (typeof value !== 'number') return false;

    // 比较
    switch (operator) {
      case '>': return value > (threshold as number);
      case '<': return value < (threshold as number);
      case '>=': return value >= (threshold as number);
      case '<=': return value <= (threshold as number);
      case '==': return value === threshold;
      default: return false;
    }
  }

  private severityScore(level: 'popup' | 'friend' | 'coach'): number {
    switch (level) {
      case 'coach': return 3;
      case 'friend': return 2;
      case 'popup': return 1;
      default: return 0;
    }
  }

  // ========== 手动触发 ==========

  /**
   * 手动执行一次检查（用于调试或用户请求）
   */
  async manualCheck() {
    console.log('[Monitor] Manual check triggered');
    await this.tick();
  }

  /**
   * 获取当前状态摘要
   */
  getStatusSummary() {
    const plannerState = usePlannerStore.getState();
    return {
      isRunning: this.isRunning,
      status: plannerState.healthMetrics.overallStatus,
      reasons: plannerState.healthMetrics.statusReasons,
      lastCheck: plannerState.monitoring.lastCheckTime,
      currentIntervention: plannerState.currentIntervention?.triggerType || null,
    };
  }
}

// ==================== 单例导出 ====================

export const monitorEngine = new MonitorEngine();

// 导出类型以便测试
export type { MonitorEngine };

