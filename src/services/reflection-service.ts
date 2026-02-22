/**
 * Reflection Service
 * 复盘系统服务 - 任务复盘、副本总结、周期回顾
 */

import type { TaskReflection, PeriodSummary } from '../types/planner';
import type { Chapter, CustomTask, MainQuest, Season } from '../types/task';
import { coachAI } from './coach-ai';
import { sumTaskFocusMinutes } from '../lib/focus-time';

// ==================== Types ====================

export interface QuestSummary {
  questId: string;
  questTitle: string;
  completedAt: string;

  stats: {
    totalTasks: number;
    completedTasks: number;
    duration: number; // days
    avgSatisfaction: number;
    totalFocusTime: number;
  };

  highlights: string[];
  challenges: string[];
  learnings: string[];

  // AI 生成
  aiSummary?: string;
}

export interface DailySummary {
  date: string;
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number;
  focusTime: number;
  topTask?: string;
  mood?: 'great' | 'good' | 'okay' | 'challenging';
}

// ==================== Task Reflection ====================

/**
 * 创建任务复盘记录
 */
export function createTaskReflection(
  task: CustomTask,
  reviewData: {
    satisfactionScore: 1 | 2 | 3 | 4 | 5;
    goodPoints: string;
    improvements: string;
    delayReason?: string;
    energyState: 'high' | 'medium' | 'low';
    blockerAction?: string;
  },
  aiAnalysis?: TaskReflection['aiAnalysis']
): TaskReflection {
  return {
    taskId: task.id,
    taskName: task.name,
    completedAt: task.completedAt || new Date().toISOString(),
    satisfactionScore: reviewData.satisfactionScore,
    goodPoints: reviewData.goodPoints,
    improvements: reviewData.improvements,
    delayReason: reviewData.delayReason,
    energyState: reviewData.energyState,
    blockerAction: reviewData.blockerAction,
    aiAnalysis,
  };
}

// ==================== Quest Summary ====================

/**
 * 生成副本完成总结
 */
export async function generateQuestSummary(
  quest: MainQuest,
  completedTasks: CustomTask[],
  reflections: TaskReflection[]
): Promise<QuestSummary> {
  // 计算基础统计
  const questReflections = reflections.filter(r =>
    completedTasks.some(t => t.id === r.taskId)
  );

  const avgSatisfaction = questReflections.length > 0
    ? questReflections.reduce((sum, r) => sum + r.satisfactionScore, 0) / questReflections.length
    : 0;

  const totalFocusTime = sumTaskFocusMinutes(completedTasks);

  const startDate = quest.createdAt ? new Date(quest.createdAt) : new Date();
  const endDate = quest.completedAt ? new Date(quest.completedAt) : new Date();
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 提取亮点和挑战
  const highlights = questReflections
    .filter(r => r.satisfactionScore >= 4)
    .map(r => r.goodPoints)
    .filter(Boolean)
    .slice(0, 3);

  const challenges = questReflections
    .filter(r => r.delayReason)
    .map(r => r.delayReason!)
    .filter(Boolean)
    .slice(0, 3);

  const learnings = questReflections
    .map(r => r.improvements)
    .filter(Boolean)
    .slice(0, 3);

  const summary: QuestSummary = {
    questId: quest.id,
    questTitle: quest.title,
    completedAt: quest.completedAt || new Date().toISOString(),
    stats: {
      totalTasks: completedTasks.length,
      completedTasks: completedTasks.filter(t => t.completed).length,
      duration,
      avgSatisfaction,
      totalFocusTime,
    },
    highlights,
    challenges,
    learnings,
  };

  // 尝试生成 AI 总结
  if (coachAI.checkAvailability()) {
    try {
      const aiSummary = await generateQuestAISummary(quest, summary, questReflections);
      summary.aiSummary = aiSummary;
    } catch (error) {
      console.warn('[ReflectionService] AI summary generation failed:', error);
    }
  }

  return summary;
}

/**
 * 简化的副本完成总结（用于 QuestReviewModal）
 * 不需要 TaskReflection，直接从任务和用户评论生成总结
 */
export async function generateQuestCompletionSummary(
  quest: MainQuest,
  linkedTasks: CustomTask[],
  userReview?: string
): Promise<{
  summary: string;
  keyAchievements?: string[];
  lessonsLearned?: string[];
  affirmation?: string;
}> {
  const completedTasks = linkedTasks.filter(t => t.completed);
  const startDate = quest.startDate ? new Date(quest.startDate) : new Date(quest.createdAt);
  const endDate = new Date();
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Basic summary
  const taskNames = completedTasks.slice(0, 3).map(t => t.name);
  const keyAchievements = taskNames.length > 0 ? taskNames : ['完成了副本目标'];

  // Generate summary text
  let summary = `恭喜完成副本「${quest.title}」！`;
  summary += `共完成 ${completedTasks.length} 个任务，历时 ${duration} 天。`;

  if (quest.context) {
    summary += ` 这个副本的核心目标是：${quest.context}`;
  }

  // Try AI generation if available
  if (coachAI.checkAvailability() && userReview) {
    try {
      const prompt = `请为副本完成生成简短的总结和鼓励（共50字以内）：
副本：${quest.title}
用户感想：${userReview}
完成任务数：${completedTasks.length}`;

      const response = await coachAI.respondToUser(prompt, [], {
        relatedTaskIds: [],
        relatedQuestIds: [quest.id],
        userProfile: { recentPatterns: [], preferredStyle: 'gentle', knownBlockers: [] },
      });

      return {
        summary: response.message || summary,
        keyAchievements,
        affirmation: '每一步前进都值得庆祝！继续加油！',
      };
    } catch {
      // Fallback to basic summary
    }
  }

  return {
    summary,
    keyAchievements,
    affirmation: '完成一个副本是巨大的成就！继续保持！',
  };
}

export async function generateChapterCompletionSummary(
  chapter: Chapter,
  linkedQuests: MainQuest[],
  userReview?: string
): Promise<{
  summary: string;
  keyAchievements?: string[];
  lessonsLearned?: string[];
  affirmation?: string;
}> {
  const completedQuests = linkedQuests.filter((q) => q.status === 'completed');
  const startDate = chapter.startedAt ? new Date(chapter.startedAt) : new Date();
  const endDate = chapter.completedAt ? new Date(chapter.completedAt) : new Date();
  const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const keyAchievements =
    completedQuests.slice(0, 3).map((q) => q.title) || [];

  let summary = `恭喜完成章节「${chapter.title}」！`;
  summary += `共完成 ${completedQuests.length} 个副本，历时 ${duration} 天。`;

  if (chapter.context) {
    summary += ` 本章节的重点是：${chapter.context}`;
  }

  if (coachAI.checkAvailability() && userReview) {
    try {
      const prompt = `请为章节完成生成简短总结和鼓励（共50字以内）：
章节：${chapter.title}
用户感想：${userReview}
完成副本数：${completedQuests.length}`;

      const response = await coachAI.respondToUser(prompt, [], {
        relatedTaskIds: [],
        relatedQuestIds: linkedQuests.map((q) => q.id),
        userProfile: { recentPatterns: [], preferredStyle: 'gentle', knownBlockers: [] },
      });

      return {
        summary: response.message || summary,
        keyAchievements,
        affirmation: '你把一个阶段完整走完了，下一章会更从容。',
      };
    } catch {
      // Fall back to deterministic summary
    }
  }

  return {
    summary,
    keyAchievements,
    affirmation: '完成一个章节，就是完成一次自我升级。',
  };
}

async function generateQuestAISummary(
  quest: MainQuest,
  summary: QuestSummary,
  reflections: TaskReflection[]
): Promise<string> {
  const prompt = `请为以下副本完成情况生成一个简短的总结（100字以内）：

副本名称：${quest.title}
描述：${quest.description || '无'}
完成任务：${summary.stats.completedTasks}/${summary.stats.totalTasks}
用时：${summary.stats.duration} 天
平均满意度：${summary.stats.avgSatisfaction.toFixed(1)}/5

亮点：
${summary.highlights.join('\n') || '无记录'}

挑战：
${summary.challenges.join('\n') || '无记录'}

总结应该：
1. 肯定完成的成就
2. 提取关键经验
3. 给出一句鼓励`;

  // 使用 Coach AI 生成总结
  const response = await coachAI.respondToUser(prompt, [], {
    relatedTaskIds: reflections.map(r => r.taskId),
    relatedQuestIds: [quest.id],
    userProfile: { recentPatterns: [], preferredStyle: 'gentle', knownBlockers: [] },
  });

  return response.message;
}


// ==================== Period Summary ====================

/**
 * 生成周期总结
 */
export async function generatePeriodSummary(
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  startDate: Date,
  endDate: Date,
  tasks: CustomTask[],
  reflections: TaskReflection[],
  interventionCount: number,
  seasons: Season[] = [],
  quests: MainQuest[] = []
): Promise<PeriodSummary> {
  const id = `${type}-${startDate.toISOString().split('T')[0]}`;

  // 1. Narrative Progress
  const narrativeProgress: PeriodSummary['insights']['narrativeProgress'] = [];

  seasons.forEach(season => {
    // Check if season was active during this period
    const seasonStart = new Date(season.startDate);
    const seasonEnd = season.endDate ? new Date(season.endDate) : new Date();

    // Only include if season overlaps with period
    if (seasonStart <= endDate && seasonEnd >= startDate) {
      // Find chapters completed in this period
      const completedChapters = season.chapters
        .filter(c => {
          if (!c.completedAt) return false;
          const completedDate = new Date(c.completedAt);
          return completedDate >= startDate && completedDate <= endDate;
        })
        .map(c => c.title);

      // Only include if there is ACTUAL progress (completed chapters)
      if (completedChapters.length > 0) {
        narrativeProgress.push({
          seasonTitle: season.name,
          chapters: completedChapters
        });
      }
    }
  });

  // 2. Quest Highlights
  const completedQuestsInPeriod = quests.filter(q => {
    if (!q.completedAt) return false;
    const completedDate = new Date(q.completedAt);
    return completedDate >= startDate && completedDate <= endDate;
  });

  let toughestQuest: { title: string; duration: number } | undefined;
  let quickestQuest: { title: string; duration: number } | undefined;

  if (completedQuestsInPeriod.length > 0) {
    // Calculate durations
    const questsWithDuration = completedQuestsInPeriod.map(q => {
      const start = q.startDate ? new Date(q.startDate) : new Date(q.createdAt);
      const end = new Date(q.completedAt!);
      const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      return { title: q.title, duration };
    });

    // Find toughest (longest duration)
    toughestQuest = questsWithDuration.reduce((prev, curr) =>
      curr.duration > prev.duration ? curr : prev
    );

    // Find quickest (shortest duration)
    quickestQuest = questsWithDuration.reduce((prev, curr) =>
      curr.duration < prev.duration ? curr : prev
    );
  }

  const questHighlights = {
    completedCount: completedQuestsInPeriod.length,
    toughestQuest,
    quickestQuest
  };

  // 3. Stats & Other Insights

  // Tasks created in this period
  const createdTasks = tasks.filter(t => {
    const taskDate = new Date(t.createdAt);
    return taskDate >= startDate && taskDate <= endDate;
  });

  // Tasks completed in this period (regardless of creation date)
  const completedTasks = tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    return completedDate >= startDate && completedDate <= endDate;
  });

  const periodReflections = reflections.filter(r => {
    const reflectionDate = new Date(r.completedAt);
    return reflectionDate >= startDate && reflectionDate <= endDate;
  });

  // Calculate stats
  // Completion Rate: Completed / (Completed + Created & Unfinished) ?
  // Simple view: Completed count vs Created count logic often confuses if created is low.
  // Standard meaningful rate: Completed / (Active in Period).
  // Active = Created in period OR (Created before period AND (Not completed OR completed in period))
  // For simplicity and clarity in this context:
  // If Created > 0: Completed / Created.
  // But if I cleared backlog (Created=0, Completed=10), rate is infinity?
  // Let's cap at 100% or just use Completed / (Created + Completed_from_backlog)?
  // Let's stick to a robust "Throughput" metric:
  // Completion Rate = completedTasks.length / (createdTasks.length + overdue_from_past?).
  // Let's use a safe ratio: if createdTasks is 0, use completedTasks as base (100%).

  const totalWorkload = createdTasks.length + (completedTasks.length - createdTasks.filter(t => t.completed).length);
  // Above logic: Created + (Completed that were NOT created in this period) = Total tasks touched or new.

  const completionRate = totalWorkload > 0
    ? (completedTasks.length / totalWorkload) * 100
    : 0;

  const stats = {
    tasksCompleted: completedTasks.length,
    tasksCreated: createdTasks.length,
    completionRate: completionRate,
    avgSatisfaction: periodReflections.length > 0
      ? periodReflections.reduce((sum, r) => sum + r.satisfactionScore, 0) / periodReflections.length
      : 0,
    totalFocusTime: sumTaskFocusMinutes(completedTasks),
  };

  // 提取洞察
  const topAccomplishments = periodReflections
    .filter(r => r.satisfactionScore >= 4)
    .sort((a, b) => b.satisfactionScore - a.satisfactionScore)
    .slice(0, 3)
    .map(r => r.taskName);

  const blockerCounts: Record<string, number> = {};
  periodReflections.forEach(r => {
    if (r.delayReason) {
      blockerCounts[r.delayReason] = (blockerCounts[r.delayReason] || 0) + 1;
    }
  });
  const commonBlockers = Object.entries(blockerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason]) => reason);

  // 成长领域（基于 AI 分析）
  const growthAreas: string[] = [];
  const recommendations: string[] = [];

  periodReflections.forEach(r => {
    if (r.aiAnalysis?.growthSuggestions) {
      growthAreas.push(...r.aiAnalysis.growthSuggestions);
    }
  });

  // 生成建议
  if (stats.completionRate < 50) {
    recommendations.push('考虑减少每日任务数量，聚焦核心任务');
  }
  if (stats.avgSatisfaction < 3) {
    recommendations.push('关注任务的意义感，尝试拆分大任务');
  }
  if (commonBlockers.length > 0) {
    recommendations.push(`重点解决常见阻碍：${commonBlockers[0]}`);
  }

  // 为 RL 保留原始数据
  const statusChanges: { from: string; to: string; timestamp: string }[] = [];

  return {
    id,
    type,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    generatedAt: new Date().toISOString(),
    stats,
    insights: {
      topAccomplishments,
      commonBlockers,
      growthAreas: [...new Set(growthAreas)].slice(0, 5),
      recommendations,
      narrativeProgress,
      questHighlights,
    },
    rawData: {
      taskReflections: periodReflections,
      interventionCount,
      statusChanges,
    },
  };
}

// ==================== Daily Summary ====================

/**
 * 生成每日简报
 */
export function generateDailySummary(
  date: Date,
  tasks: CustomTask[],
  reflections: TaskReflection[]
): DailySummary {
  const dateStr = date.toISOString().split('T')[0];

  const dayTasks = tasks.filter(t => {
    const taskDate = t.createdAt.split('T')[0];
    return taskDate === dateStr;
  });

  const completedTasks = dayTasks.filter(t => t.completed);

  const dayReflections = reflections.filter(r => {
    const reflectionDate = r.completedAt.split('T')[0];
    return reflectionDate === dateStr;
  });

  const avgSatisfaction = dayReflections.length > 0
    ? dayReflections.reduce((sum, r) => sum + r.satisfactionScore, 0) / dayReflections.length
    : 3;

  let mood: DailySummary['mood'];
  if (avgSatisfaction >= 4) mood = 'great';
  else if (avgSatisfaction >= 3) mood = 'good';
  else if (avgSatisfaction >= 2) mood = 'okay';
  else mood = 'challenging';

  const focusTime = sumTaskFocusMinutes(completedTasks);

  // 找出最重要的完成任务
  const topTask = completedTasks
    .sort((a, b) => {
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      return (importanceOrder[b.importance] || 0) - (importanceOrder[a.importance] || 0);
    })[0]?.name;

  return {
    date: dateStr,
    tasksCompleted: completedTasks.length,
    tasksCreated: dayTasks.length,
    completionRate: dayTasks.length > 0
      ? (completedTasks.length / dayTasks.length) * 100
      : 0,
    focusTime,
    topTask,
    mood,
  };
}

// ==================== RL Data Export ====================

/**
 * 导出用于 RL 训练的数据
 */
export function exportRLTrainingData(
  reflections: TaskReflection[],
  summaries: PeriodSummary[]
): object {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),

    // 任务级别数据
    taskData: reflections.map(r => ({
      taskId: r.taskId,
      taskName: r.taskName,
      completedAt: r.completedAt,

      // 特征
      features: {
        satisfaction: r.satisfactionScore,
        energyState: r.energyState,
        hadDelay: !!r.delayReason,
        hadBlocker: !!r.blockerAction,
      },

      // 标签（用于监督学习）
      labels: {
        goodOutcome: r.satisfactionScore >= 4,
        needsImprovement: r.satisfactionScore <= 2,
      },

      // AI 分析的洞察
      insights: r.aiAnalysis ? {
        patterns: r.aiAnalysis.beliefPatterns,
        suggestions: r.aiAnalysis.growthSuggestions,
      } : null,
    })),

    // 周期级别数据
    periodData: summaries.map(s => ({
      id: s.id,
      type: s.type,
      period: { start: s.startDate, end: s.endDate },

      // 聚合特征
      features: {
        completionRate: s.stats.completionRate,
        avgSatisfaction: s.stats.avgSatisfaction,
        taskVolume: s.stats.tasksCreated,
        focusTime: s.stats.totalFocusTime,
        interventionCount: s.rawData.interventionCount,
      },

      // 洞察
      insights: s.insights,
    })),
  };
}
