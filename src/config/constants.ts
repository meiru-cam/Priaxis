/**
 * Application Constants
 */

// Storage
export const STORAGE_KEY = 'earthOnlineDataV3';

// API
export const API_BASE = 'http://localhost:3000/api';

// XP System
export const XP_PER_LEVEL = 100;
export const SKILL_PRIMARY_XP = 30;
export const SKILL_SECONDARY_XP = 15;
export const MAX_SKILL_LEVEL = 5;

// Pomodoro
export const POMODORO_DURATION_MINUTES = 25;
export const POMODORO_DURATION_SECONDS = POMODORO_DURATION_MINUTES * 60;
export const SHORT_BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;

// Energy System
export const MAX_ENERGY = 100;
export const ENERGY_RECOVERY_CAPS: Record<string, number> = {
  meditation: 30,
  nap: 40,
  entertainment: 10,
  walk: 20,
  exercise: 30,
};

// Task Importance
export const IMPORTANCE_XP: Record<string, number> = {
  low: 10,
  medium: 20,
  high: 30,
};

// Cache TTL (milliseconds)
export const CACHE_TTL = {
  prediction: 30 * 60 * 1000, // 30 minutes
  weeklyOverview: 5 * 60 * 1000, // 5 minutes
  progressHealth: 5 * 60 * 1000, // 5 minutes
  priorityTasks: 2 * 60 * 1000, // 2 minutes
  dailyReport: 24 * 60 * 60 * 1000, // 24 hours
  aiAnalysis: 60 * 60 * 1000, // 1 hour
};

// AI Timeouts
export const AI_TIMEOUT = {
  llm: 180000, // 3 minutes
  stateAnalysis: 15000, // 15 seconds
  eventAnalysis: 30000, // 30 seconds
};

// Title Database
export const TITLE_DATABASE = {
  levelTitles: [
    { id: 'newbie', name: '萌新玩家', minLevel: 1, type: 'level' as const, description: '刚刚开始冒险的新手' },
    { id: 'explorer', name: '探索者', minLevel: 5, type: 'level' as const, description: '勇于探索未知领域' },
    { id: 'awakener', name: '觉醒者', minLevel: 10, type: 'level' as const, description: '开始觉醒内在力量' },
    { id: 'seeker', name: '求道者', minLevel: 15, type: 'level' as const, description: '不断追寻真理' },
    { id: 'master', name: '大师', minLevel: 20, type: 'level' as const, description: '掌握核心技能' },
    { id: 'sage', name: '智者', minLevel: 30, type: 'level' as const, description: '智慧与经验的结晶' },
    { id: 'visionary', name: '愿景工程师', minLevel: 40, type: 'level' as const, description: '创造未来的建筑师' },
    { id: 'creator', name: '创造者', minLevel: 50, type: 'level' as const, description: '快乐自由的创造' },
  ],
  achievementTitles: [
    { id: 'pomodoro_beginner', name: '🍅 专注新手', condition: 'totalPomodoro >= 10', description: '完成10个番茄钟' },
    { id: 'pomodoro_master', name: '🍅 番茄钟达人', condition: 'totalPomodoro >= 100', description: '完成100个番茄钟' },
    { id: 'task_hunter', name: '📋 任务猎人', condition: 'completedTasks >= 50', description: '完成50个任务' },
    { id: 'knowledge_seeker', name: '📚 求知若渴', condition: 'anySkillLevel >= 5', description: '任意技能达到5级' },
    { id: 'skill_master', name: '✨ 技能大师', condition: 'allSkillsLevel3', description: '所有技能达到3级' },
  ],
  specialTitles: [
    { id: 'phd_student', name: '📜 PhD Student', condition: 'manual', description: '博士研究生身份' },
    { id: 'reality_hacker', name: '🔮 现实黑客', condition: 'manual', description: 'Hack your reality' },
    { id: 'magician', name: '🎩 魔术师', condition: 'manual', description: '显化愿景的魔术师' },
    { id: 'system_balancer', name: '⚖️ 系统平衡者', condition: 'manual', description: '平衡多个系统的高手' },
  ],
};

// State definitions
export const STATE_AVATARS = {
  creator: { avatar: '🧑‍💻', title: '工匠模式', text: '专注创造' },
  observer: { avatar: '🔎', title: '观察者模式', text: '洞察分析' },
  explorer: { avatar: '🛰️', title: '探索者模式', text: '探索发现' },
  connector: { avatar: '🤝', title: '连接者模式', text: '协作沟通' },
  rest: { avatar: '🧘', title: '恢复模式', text: '休息恢复' },
};
