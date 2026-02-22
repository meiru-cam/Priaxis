/**
 * Strategy Engine
 * 策略引擎 - MoSCoW 建议、SMART 检测、剪枝决策
 */

import type { CustomTask, MainQuest, Season, Chapter } from '../types/task';
import type { MoSCoWPriority, MoSCoWSuggestion, HealthMetrics } from '../types/planner';
import type { SMARTScore, PruningDecision } from '../features/planner/components/SMARTAnalysis';
import { coachAI } from './coach-ai';

// ==================== Types ====================

export interface TaskWithContext extends CustomTask {
  linkedQuestTitle?: string;
  linkedSeasonTitle?: string;
  linkedChapterTitle?: string;
  questDeadline?: string;
  questProgress?: number;
}

export interface StrategyRecommendation {
  moscowSuggestions: MoSCoWSuggestion[];
  pruningDecisions: PruningDecision[];
  smartIssues: { questId: string; score: number; issues: string[] }[];
  executionOrder: string[]; // task IDs in recommended order
}

// ==================== MoSCoW Algorithm ====================

/**
 * 基于规则的 MoSCoW 建议算法
 * 结合截止日期、重要性、依赖关系等因素
 */
export function suggestMoSCoW(
  tasks: TaskWithContext[],
  quests: MainQuest[],
  metrics: HealthMetrics
): MoSCoWSuggestion[] {
  const suggestions: MoSCoWSuggestion[] = [];
  const now = new Date();
  
  for (const task of tasks) {
    if (task.completed) continue;
    
    const suggestion = analyzeTaskMoSCoW(task, quests, metrics, now);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}

function analyzeTaskMoSCoW(
  task: TaskWithContext,
  quests: MainQuest[],
  metrics: HealthMetrics,
  now: Date
): MoSCoWSuggestion | null {
  let priority: MoSCoWPriority = 'could';
  let confidence = 0.5;
  const reasons: string[] = [];
  
  // 检查截止日期
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      priority = 'must';
      confidence = 0.95;
      reasons.push(`已逾期 ${Math.abs(daysRemaining)} 天`);
    } else if (daysRemaining === 0) {
      priority = 'must';
      confidence = 0.9;
      reasons.push('今天到期');
    } else if (daysRemaining <= 2) {
      priority = 'must';
      confidence = 0.85;
      reasons.push(`还有 ${daysRemaining} 天到期`);
    } else if (daysRemaining <= 7) {
      priority = 'should';
      confidence = 0.7;
      reasons.push(`一周内到期`);
    }
  }
  
  // 检查关联副本的紧迫性
  if (task.linkedQuestId) {
    const quest = quests.find(q => q.id === task.linkedQuestId);
    if (quest) {
      // 副本是否处于风险状态
      const atRisk = metrics.atRiskQuests.find(r => r.questId === quest.id);
      if (atRisk) {
        if (priority !== 'must') {
          priority = 'must';
          confidence = Math.max(confidence, 0.8);
        }
        reasons.push(`关联副本「${quest.title}」处于风险状态`);
      }
      
      // 副本进度检查
      if (quest.progress !== undefined && quest.progress < 30 && quest.deadline) {
        const questDeadline = new Date(quest.deadline);
        const questDaysRemaining = Math.ceil((questDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (questDaysRemaining < 14 && quest.progress < 30) {
          if (priority === 'could') {
            priority = 'should';
            confidence = Math.max(confidence, 0.65);
          }
          reasons.push(`副本进度偏低 (${quest.progress}%)，需要加速`);
        }
      }
    }
  }
  
  // 检查重要性标签
  if (task.importance === 'high') {
    if (priority === 'could') {
      priority = 'should';
      confidence = Math.max(confidence, 0.6);
    }
    reasons.push('标记为高重要性');
  }
  
  // 检查任务类型
  if (task.taskType) {
    const criticalTypes = ['deadline', 'milestone'];
    if (criticalTypes.includes(task.taskType)) {
      if (priority === 'could') {
        priority = 'should';
        confidence = Math.max(confidence, 0.65);
      }
      reasons.push(`关键任务类型：${task.taskType}`);
    }
  }
  
  // 检查是否可能是"完美主义陷阱"
  const perfectonistKeywords = ['完美', '优化', '改进', '调整', '美化', '细节'];
  const taskName = task.name.toLowerCase();
  const isPerfectionist = perfectonistKeywords.some(k => taskName.includes(k));
  
  if (isPerfectionist && priority !== 'must') {
    // 可能是 Could Do
    if (priority === 'should') {
      priority = 'could';
      confidence = Math.max(confidence, 0.55);
    }
    reasons.push('⚠️ 可能是完美主义陷阱');
  }
  
  // 检查是否没有关联任何副本/主线
  if (!task.linkedQuestId && !task.linkedSeasonId && !task.linkedChapterId) {
    if (priority !== 'must') {
      // 独立任务，可能不那么重要
      if (priority === 'should') {
        confidence = Math.max(confidence - 0.1, 0.4);
      }
      reasons.push('未关联任何副本/主线');
    }
  }
  
  // 如果没有明确理由，不生成建议
  if (reasons.length === 0) {
    return null;
  }
  
  return {
    taskId: task.id,
    suggestedPriority: priority,
    currentPriority: task.moscow as MoSCoWPriority | undefined,
    reason: reasons.join('；'),
    confidence,
    confirmedByUser: false,
    suggestedAt: new Date().toISOString(),
  };
}

// ==================== SMART Analysis ====================

/**
 * 分析副本是否符合 SMART 原则
 */
export function analyzeSMART(
  quest: MainQuest,
  linkedTasks: CustomTask[],
  linkedSeason?: Season,
  linkedChapter?: Chapter
): SMARTScore {
  const scores = {
    specific: analyzeSpecific(quest, linkedTasks),
    measurable: analyzeMeasurable(quest, linkedTasks),
    achievable: analyzeAchievable(quest, linkedTasks),
    relevant: analyzeRelevant(quest, linkedSeason, linkedChapter),
    timeBound: analyzeTimeBound(quest),
  };
  
  const overall = Math.round(
    (scores.specific.score + scores.measurable.score + scores.achievable.score + 
     scores.relevant.score + scores.timeBound.score) / 5
  );
  
  const suggestions = generateSMARTSuggestions(quest, scores);
  
  return {
    ...scores,
    overall,
    suggestions,
  };
}

function analyzeSpecific(quest: MainQuest, linkedTasks: CustomTask[]): { score: number; feedback: string } {
  let score = 50;
  const feedback: string[] = [];
  
  // 检查标题长度和具体性
  if (quest.title.length < 5) {
    score -= 20;
    feedback.push('标题过短，不够具体');
  } else if (quest.title.length > 10) {
    score += 10;
  }
  
  // 检查描述
  if (quest.description && quest.description.length > 20) {
    score += 20;
    feedback.push('有详细描述');
  } else {
    score -= 10;
    feedback.push('缺少详细描述');
  }
  
  // 检查是否有子任务
  if (linkedTasks.length >= 3) {
    score += 20;
    feedback.push(`已分解为 ${linkedTasks.length} 个子任务`);
  } else if (linkedTasks.length === 0) {
    score -= 10;
    feedback.push('没有分解子任务');
  }
  
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    feedback: feedback.join('；') || '具体性一般',
  };
}

function analyzeMeasurable(quest: MainQuest, linkedTasks: CustomTask[]): { score: number; feedback: string } {
  let score = 50;
  const feedback: string[] = [];
  
  // 检查进度追踪
  if (quest.progress !== undefined) {
    score += 20;
  }
  
  // 检查子任务是否有可衡量的完成标准
  const tasksWithCheckboxes = linkedTasks.filter(t => 
    t.description && t.description.includes('- [ ]')
  );
  
  if (tasksWithCheckboxes.length > 0) {
    score += 20;
    feedback.push(`${tasksWithCheckboxes.length} 个任务有检查清单`);
  }
  
  // 检查是否有数字目标
  const hasNumbers = /\d+/.test(quest.title + (quest.description || ''));
  if (hasNumbers) {
    score += 10;
    feedback.push('包含量化目标');
  } else {
    feedback.push('建议添加量化目标');
  }
  
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    feedback: feedback.join('；') || '可衡量性一般',
  };
}

function analyzeAchievable(quest: MainQuest, linkedTasks: CustomTask[]): { score: number; feedback: string } {
  let score = 60;
  const feedback: string[] = [];
  const now = new Date();
  
  // 检查截止日期是否合理
  if (quest.deadline) {
    const deadline = new Date(quest.deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingProgress = 100 - (quest.progress || 0);
    const requiredDailyProgress = daysRemaining > 0 ? remainingProgress / daysRemaining : 100;
    
    if (requiredDailyProgress > 20) {
      score -= 30;
      feedback.push(`每天需完成 ${requiredDailyProgress.toFixed(1)}%，可能过于激进`);
    } else if (requiredDailyProgress > 10) {
      score -= 10;
      feedback.push('时间有些紧张');
    } else {
      score += 10;
      feedback.push('时间安排合理');
    }
  }
  
  // 检查任务复杂度
  const effortMap: Record<string, number> = { tiny: 1, light: 2, medium: 3, moderate: 4, heavy: 5, massive: 6 };
  const avgTaskEffort = linkedTasks.reduce((sum, t) => sum + (effortMap[t.effort] || 3), 0) / (linkedTasks.length || 1);
  if (avgTaskEffort > 4) {
    score -= 15;
    feedback.push('平均任务难度较高');
  }
  
  // 检查是否有已完成的任务
  const completedTasks = linkedTasks.filter(t => t.completed);
  if (completedTasks.length > 0) {
    score += 15;
    feedback.push(`已完成 ${completedTasks.length}/${linkedTasks.length} 个任务`);
  }
  
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    feedback: feedback.join('；') || '可实现性一般',
  };
}

function analyzeRelevant(
  _quest: MainQuest, 
  linkedSeason?: Season, 
  linkedChapter?: Chapter
): { score: number; feedback: string } {
  let score = 40;
  const feedback: string[] = [];
  
  // 检查是否关联主线
  if (linkedSeason) {
    score += 30;
    feedback.push(`关联主线「${linkedSeason.name}」`);
  }
  
  // 检查是否关联篇章
  if (linkedChapter) {
    score += 20;
    feedback.push(`属于篇章「${linkedChapter.title}」`);
  }
  
  // 没有关联
  if (!linkedSeason && !linkedChapter) {
    score = 30;
    feedback.push('未关联任何主线/篇章，建议建立连接');
  }
  
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    feedback: feedback.join('；') || '相关性一般',
  };
}

function analyzeTimeBound(quest: MainQuest): { score: number; feedback: string } {
  let score = 30;
  const feedback: string[] = [];
  
  if (quest.deadline) {
    score += 50;
    
    const deadline = new Date(quest.deadline);
    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      score -= 20;
      feedback.push(`已逾期 ${Math.abs(daysRemaining)} 天`);
    } else if (daysRemaining > 90) {
      score -= 10;
      feedback.push(`截止日期较远 (${daysRemaining} 天后)，建议设置阶段性里程碑`);
    } else {
      score += 10;
      feedback.push(`截止日期：${daysRemaining} 天后`);
    }
  } else {
    feedback.push('未设置截止日期');
  }
  
  if (quest.unlockTime) {
    score += 10;
    feedback.push('已设置开始日期');
  }
  
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    feedback: feedback.join('；') || '缺少时间约束',
  };
}

function generateSMARTSuggestions(_quest: MainQuest, scores: Record<string, { score: number; feedback: string }>): string[] {
  const suggestions: string[] = [];
  
  if (scores.specific.score < 60) {
    suggestions.push('添加更详细的目标描述，说明具体要做什么');
  }
  
  if (scores.measurable.score < 60) {
    suggestions.push('添加量化指标，如"完成5篇文章"而不是"写文章"');
  }
  
  if (scores.achievable.score < 60) {
    suggestions.push('考虑调整截止日期或缩小目标范围');
  }
  
  if (scores.relevant.score < 60) {
    suggestions.push('将此副本关联到一个主线或篇章，明确它的意义');
  }
  
  if (scores.timeBound.score < 60) {
    suggestions.push('设置明确的截止日期');
  }
  
  return suggestions;
}

// ==================== Pruning Analysis ====================

/**
 * 分析哪些副本可能需要剪枝
 */
export function analyzePruning(
  quests: MainQuest[],
  tasks: CustomTask[],
  metrics: HealthMetrics
): PruningDecision[] {
  const decisions: PruningDecision[] = [];
  const now = new Date();
  
  for (const quest of quests) {
    if (quest.status === 'completed' || quest.status === 'locked') continue;
    
    const decision = analyzeQuestPruning(quest, tasks, metrics, now);
    if (decision) {
      decisions.push(decision);
    }
  }
  
  // 按可行性排序：impossible 优先
  decisions.sort((a, b) => {
    const order = { impossible: 0, challenging: 1, feasible: 2 };
    return order[a.feasibility] - order[b.feasibility];
  });
  
  return decisions;
}

function analyzeQuestPruning(
  quest: MainQuest,
  _tasks: CustomTask[],
  _metrics: HealthMetrics,
  now: Date
): PruningDecision | null {
  if (!quest.deadline) return null;
  
  const deadline = new Date(quest.deadline);
  const timeRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // 已经过期的
  if (timeRemaining < 0) {
    return {
      questId: quest.id,
      questTitle: quest.title,
      currentProgress: quest.progress || 0,
      deadline: quest.deadline,
      timeRemaining: timeRemaining,
      requiredDailyProgress: 100,
      feasibility: 'impossible',
      recommendation: 'prune',
      reason: `已逾期 ${Math.abs(timeRemaining)} 天，建议重新评估是否继续。`,
      alternatives: ['延长截止日期', '缩小目标范围', '标记为放弃'],
    };
  }
  
  const remainingProgress = 100 - (quest.progress || 0);
  const requiredDailyProgress = timeRemaining > 0 ? remainingProgress / timeRemaining : 100;
  
  // 判断可行性
  let feasibility: 'feasible' | 'challenging' | 'impossible';
  let recommendation: 'continue' | 'prune' | 'modify';
  let reason: string;
  
  if (requiredDailyProgress > 30) {
    feasibility = 'impossible';
    recommendation = 'prune';
    reason = `需要每天完成 ${requiredDailyProgress.toFixed(1)}% 进度，这几乎不可能实现。`;
  } else if (requiredDailyProgress > 15) {
    feasibility = 'challenging';
    recommendation = 'modify';
    reason = `需要每天完成 ${requiredDailyProgress.toFixed(1)}% 进度，非常有挑战性。`;
  } else if (requiredDailyProgress > 8) {
    feasibility = 'challenging';
    recommendation = 'continue';
    reason = `需要稳定推进，每天约 ${requiredDailyProgress.toFixed(1)}% 进度。`;
  } else {
    feasibility = 'feasible';
    recommendation = 'continue';
    reason = `时间充裕，保持当前节奏即可。`;
  }
  
  // 只返回需要关注的副本
  if (feasibility === 'feasible' && recommendation === 'continue') {
    return null;
  }
  
  return {
    questId: quest.id,
    questTitle: quest.title,
    currentProgress: quest.progress || 0,
    deadline: quest.deadline,
    timeRemaining,
    requiredDailyProgress,
    feasibility,
    recommendation,
    reason,
    alternatives: recommendation === 'prune' 
      ? ['延长截止日期', '缩小目标范围', '标记为放弃']
      : ['延长截止日期', '增加投入时间', '简化目标'],
  };
}

// ==================== Execution Order ====================

/**
 * 基于 MoSCoW 和四象限推荐执行顺序
 */
export function recommendExecutionOrder(
  tasks: CustomTask[],
  moscowSuggestions: MoSCoWSuggestion[]
): string[] {
  const suggestionMap = new Map(moscowSuggestions.map(s => [s.taskId, s]));
  
  // 计算每个任务的优先级分数
  const scoredTasks = tasks
    .filter(t => !t.completed)
    .map(task => {
      let score = 0;
      const suggestion = suggestionMap.get(task.id);
      
      // MoSCoW 分数
      if (suggestion) {
        const moscowScores = { must: 100, should: 60, could: 30, wont: 0 };
        score += moscowScores[suggestion.suggestedPriority] * suggestion.confidence;
      } else if (task.moscow) {
        const moscowScores = { must: 100, should: 60, could: 30, wont: 0 };
        score += moscowScores[task.moscow as MoSCoWPriority];
      }
      
      // 重要性分数
      if (task.importance === 'high') score += 40;
      else if (task.importance === 'medium') score += 20;
      
      // 紧急性分数（基于截止日期）
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < 0) score += 50; // 已逾期
        else if (daysRemaining === 0) score += 40; // 今天
        else if (daysRemaining <= 2) score += 30;
        else if (daysRemaining <= 7) score += 15;
      }
      
      // 努力程度（优先做简单的）
      if (task.effort) {
        const effortScore: Record<string, number> = { tiny: 1, light: 2, medium: 3, moderate: 4, heavy: 5, massive: 6 };
        const effortVal = effortScore[task.effort] || 3;
        score += (5 - effortVal) * 3; // 努力程度，反向加分
      }
      
      return { taskId: task.id, score };
    });
  
  // 按分数排序
  scoredTasks.sort((a, b) => b.score - a.score);
  
  return scoredTasks.map(t => t.taskId);
}

// ==================== AI-Enhanced Analysis ====================

/**
 * 使用 AI 进行深度分析（需要 Coach AI 可用）
 */
export async function getAIStrategyRecommendation(
  tasks: CustomTask[],
  quests: MainQuest[],
  metrics: HealthMetrics
): Promise<StrategyRecommendation> {
  // 基础分析
  const moscowSuggestions = suggestMoSCoW(tasks as TaskWithContext[], quests, metrics);
  const pruningDecisions = analyzePruning(quests, tasks, metrics);
  
  // SMART 问题检测
  const smartIssues: { questId: string; score: number; issues: string[] }[] = [];
  for (const quest of quests) {
    if (quest.status === 'completed' || quest.status === 'locked') continue;
    
    const linkedTasks = tasks.filter(t => t.linkedQuestId === quest.id);
    const analysis = analyzeSMART(quest, linkedTasks);
    
    if (analysis.overall < 60) {
      smartIssues.push({
        questId: quest.id,
        score: analysis.overall,
        issues: analysis.suggestions,
      });
    }
  }
  
  // 推荐执行顺序
  const executionOrder = recommendExecutionOrder(tasks, moscowSuggestions);
  
  // 如果 Coach AI 可用，可以进一步增强分析
  if (coachAI.checkAvailability()) {
    try {
      // 可以调用 coachAI.suggestMoSCoW 进行更智能的分析
      // 这里保留接口，但默认使用规则引擎的结果
    } catch {
      console.warn('[StrategyEngine] AI enhancement failed, using rule-based analysis');
    }
  }
  
  return {
    moscowSuggestions,
    pruningDecisions,
    smartIssues,
    executionOrder,
  };
}
