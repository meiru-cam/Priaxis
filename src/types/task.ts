/**
 * Task Types - Custom Tasks, Main Quests, Recurring Tasks
 */

// Importance levels
export type Importance = 'low' | 'medium' | 'high';

// Task effort levels
export type Effort = 'light' | 'medium' | 'heavy';

// Task types
export type TaskType = 'creative' | 'tax' | 'maintenance';

// Link types for tasks
export type LinkType = 'mainQuest' | 'chapter' | 'season' | 'none';

// Quest/Season status
export type Status = 'active' | 'paused' | 'completed' | 'archived' | 'locked';

// Progress tracking mode
export type ProgressMode = 'hybrid' | 'auto' | 'manual';

// Progress type
export type ProgressType = 'percentage' | 'custom';
export type RewardVerb = 'eat' | 'drink' | 'buy' | 'watch' | 'play' | 'rest' | 'other';
export type RewardPriceTier = 'S' | 'A' | 'B' | 'C';

export interface RewardSticker {
  id: string;
  rawText: string;
  verb: RewardVerb;
  object: string;
  quantity?: number;
  unit?: string;
  sourceTaskId?: string;
  sourceTaskName?: string;
  status: 'available' | 'redeemed';
  priceTier: RewardPriceTier;
  priceGold: number;
  createdAt: string;
  redeemedAt?: string;
  redeemedCostGold?: number;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

/**
 * Custom Task (Daily task)
 */
export interface CustomTask {
  id: string;
  name: string;
  description?: string;
  completed: boolean; // Deprecated: Use status === 'completed'
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  // Link relations
  linkType: LinkType;
  linkedMainQuestId?: string;
  linkedChapterId?: string;
  linkedSeasonId?: string;
  seasonId?: string;

  // Four-dimensional attributes
  importance: Importance;
  urgency?: string | null;
  effort: Effort;
  taskType: TaskType;

  // Time management
  deadline?: string;

  // Resource costs
  estimatedCosts?: {
    energy?: number;
    time?: number;
  };
  actualCosts?: {
    energy?: number;
    time?: number;
  };

  // Pomodoro tracking
  pomodoroCount?: number;

  // UI state
  pinned?: boolean;

  // MoSCoW priority (if assigned)
  moscow?: 'must' | 'should' | 'could' | 'wont';

  // Linked Quest ID (backward compat alias)
  linkedQuestId?: string;

  // Definition of Done / Subtasks
  checklist?: ChecklistItem[];

  // SMART Fields
  context?: string; // (S) Start State / Background
  motivation?: string; // (T) Reward (Positive Incentive)
  consequence?: string; // (T) Punishment (Negative Incentive)
  attainable?: string; // (A) Resources / Feasibility

  // Review
  review?: string;
  reviewSatisfaction?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Main Quest (副本)
 */
export interface MainQuest {
  id: string;
  title: string;
  description?: string;
  createdAt: string;

  // Progress tracking
  progressType: ProgressType;
  progress: number;
  progressCurrent?: number;
  progressTotal?: number;
  progressUnit?: string;

  // SMART progress tracking (v5.0)
  progressTracking?: {
    mode: ProgressMode;
    linkedTasksCount: number;
    completedTasksCount: number;
    autoProgress: number;
    manualProgress: number;
    lastAIQualityCheck?: string;
    aiQualityScore?: number;
  };

  // Status management
  status: Status;
  pauseInfo?: {
    reason: string;
    pausedAt: string;
    progressSnapshot: number;
  };
  completedAt?: string;

  // Time management
  unlockTime?: string;
  deadline?: string;
  startDate?: string;
  importance: Importance;

  // Season relations (v3.9)
  linkedChapterId?: string;
  chapterContribution?: number;
  seasonId?: string;

  // Rewards
  rewardTitle?: string; // Title unlocked upon completion
  rewardXP?: number;    // XP reward upon completion

  // SMART Fields (v5.1)
  context?: string; // (S) Start State / Background
  motivation?: string; // (T) Reward (Positive Incentive)
  consequence?: string; // (T) Punishment (Negative Incentive)
  attainable?: string; // (A) Resources / Feasibility
  definitionOfDone?: string; // (M) Definition of Done

  // Review
  review?: string;
  reviewSatisfaction?: number;
}

/**
 * Chapter (within a Season)
 */
export interface Chapter {
  id: string;
  title: string;
  description?: string;
  order: number;
  progress: number;
  status: Status;
  unlockTime?: string;
  deadline?: string;
  linkedQuests?: string[];
  startedAt?: string;
  completedAt?: string;

  // Rewards
  rewardTitle?: string;
  rewardXP?: number;

  importance?: Importance;

  // SMART Fields
  context?: string;
  motivation?: string;
  consequence?: string;
  attainable?: string;

  // Review
  review?: string;
  reviewSatisfaction?: number;
}

/**
 * Season (主线)
 */
export interface Season {
  id: string;
  name: string;
  description?: string;
  category: string;
  startDate: string;
  endDate?: string;
  status: Status;
  level: number;
  experience: number;
  chapters: Chapter[];
  createdAt: string;
  completedAt?: string;

  // Rewards
  rewardTitle?: string;
  rewardXP?: number;

  importance?: Importance;

  // SMART Fields
  context?: string;
  motivation?: string;
  consequence?: string;
  attainable?: string;
}

/**
 * Category (for organizing seasons)
 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/**
 * Recurring Task
 */
export interface RecurringTask {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[]; // 0-6 for weekly tasks
  dayOfMonth?: number; // 1-31 for monthly tasks
  time?: string; // HH:mm format
  enabled: boolean;

  // Tracking
  lastCompleted?: string; // Last time the SOURCE was completed (if applicable)
  lastGeneratedDate?: string; // Date string (YYYY-MM-DD) of last generated CustomTask
  streak: number;
  createdAt: string;

  // Task Attributes for generated CustomTask
  importance: Importance;
  effort: Effort;
  taskType: TaskType;

  // Link Relations
  linkedMainQuestId?: string;
  linkedSeasonId?: string; // Direct season link
  linkedChapterId?: string; // Direct chapter link

  // Date Range
  startDate?: string; // YYYY-MM-DD

  // Custom estimated costs override
  estimatedCosts?: {
    energy?: number;
    time?: number;
  };
  endDate?: string; // YYYY-MM-DD
}

/**
 * Archived Task
 */
export interface ArchivedTask extends CustomTask {
  archivedAt: string;
  archiveReason?: string;
}

/**
 * Task Log Entry
 */
export interface TaskLog {
  type: 'create' | 'complete' | 'update' | 'delete' | 'archive';
  task: {
    id: string;
    name: string;
  };
  timestamp: string;
  review?: string;
  reviewSatisfaction?: number;
  details?: Record<string, unknown>;
}

/**
 * Weekly Goal - 周度目标
 */
export interface WeeklyGoal {
  id: string;
  name: string;
  description?: string;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'cancelled';
  weekStartDate: string; // ISO 周一日期
  deadline: string; // 默认周日
  createdAt: string;
  completedAt?: string;
  linkedTasks?: string[]; // 关联的 customTask IDs
  linkedQuestIds?: string[]; // 关联的 MainQuest IDs
  importance: Importance;
}

/**
 * Habit Completion History Entry
 */
export interface HabitCompletionEntry {
  count: number; // 当天完成次数
  timestamps: string[]; // 每次打卡时间
}

/**
 * Habit - 习惯养成
 */
export interface Habit {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  category?: string; // health, productivity, mindfulness, etc.

  // 频率设定
  frequencyType: 'daily' | 'weekly';
  targetPerDay?: number; // 每天目标次数 (frequencyType = daily)
  targetDaysPerWeek?: number; // 每周目标天数 (frequencyType = weekly)

  // 追踪
  streak: number; // 当前连续天数
  longestStreak: number; // 最长记录
  totalCompletions: number; // 总完成次数

  // 完成历史 - 按日期记录
  completionHistory: {
    [date: string]: HabitCompletionEntry; // 日期格式: 'YYYY-MM-DD'
  };

  // 元数据
  createdAt: string;
  active: boolean;
  archivedAt?: string;
}
