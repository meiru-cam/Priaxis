/**
 * Journal Types
 * 周回顾和每日成功日记的类型定义
 */

/**
 * 周回顾数据结构
 */
export interface WeeklyReview {
    id: string;
    weekStartDate: string; // ISO 8601, 周一
    weekEndDate: string;   // ISO 8601, 周日
    createdAt: string;
    updatedAt: string;

    // 统计概览
    stats: {
        tasksCompleted: number;
        tasksCreated: number;
        completionRate: number;
        focusTimeMinutes: number;
        pomodoroSessions: number;
    };

    // 回顾内容
    highlights: string[];     // 本周亮点/成就
    challenges: string[];     // 本周挑战/阻碍
    learnings: string[];      // 本周学到的
    gratitude: string[];      // 感恩事项

    // 下周计划
    nextWeekGoals: string[];  // 下周目标
    nextWeekFocus: string;    // 下周重点

    // 评分
    overallSatisfaction: 1 | 2 | 3 | 4 | 5;
    energyLevel: 'low' | 'medium' | 'high';
    mood: 'great' | 'good' | 'okay' | 'low' | 'bad';
}

/**
 * 每日成功日记条目
 */
export interface DailySuccessEntry {
    id: string;
    date: string; // ISO 8601, 日期部分
    createdAt: string;
    updatedAt: string;

    // 成功记录（建议至少3件）
    successes: {
        content: string;
        category?: 'work' | 'health' | 'relationships' | 'personal' | 'learning' | 'other';
    }[];

    // 感恩事项
    gratitude: string[];

    // 正向肯定/自我鼓励
    affirmation: string;

    // 心情记录
    mood: 'great' | 'good' | 'okay' | 'low' | 'bad';
    moodNote?: string;

    // 今日能量
    energyLevel: 'low' | 'medium' | 'high';
}

/**
 * Journal Store 扩展状态
 */
export interface JournalState {
    weeklyReviews: WeeklyReview[];
    dailySuccessJournal: DailySuccessEntry[];
}
