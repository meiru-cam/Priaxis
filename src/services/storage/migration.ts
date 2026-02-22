/**
 * Data Migration Service
 * Handles migration from old data formats to current schema
 */

import type { GameData } from '../../types/game-data';
import { STORAGE_KEY } from '../../config/constants';

/**
 * Migrate and load data from localStorage
 * Returns migrated data or null if no data exists
 */
export function migrateData(): Partial<GameData> | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    const data = JSON.parse(saved);
    return runMigrations(data);
  } catch (error) {
    console.error('[Migration] Failed to parse saved data:', error);
    return null;
  }
}

/**
 * Run all migrations on data
 */
function runMigrations(data: any): Partial<GameData> {
  // Migration 1: questProgress -> mainQuests
  if (data.questProgress && !data.mainQuests) {
    data.mainQuests = [];
    delete data.questProgress;
  }

  // Migration 2: Ensure mainQuests have required fields
  if (data.mainQuests?.length) {
    data.mainQuests = data.mainQuests.map((quest: any) => {
      // Determine correct status
      let status = quest.status;
      if (!status) {
        if (quest.completedAt) {
          status = 'completed';
        } else if (quest.progress >= 100) {
          status = 'completed';
        } else {
          status = 'active';
        }
      }
      // Also fix: if completedAt exists but status is still 'active', correct it
      if (quest.completedAt && status === 'active') {
        status = 'completed';
      }

      return {
        ...quest,
        status,
        pauseInfo: status === 'paused' && !quest.pauseInfo
          ? {
            reason: '未记录原因',
            pausedAt: new Date().toISOString(),
            progressSnapshot: quest.progress || 0,
          }
          : quest.pauseInfo,
        importance: quest.importance || 'medium',
        progressType: quest.progressType || 'percentage',
        progress: quest.progress ?? 0,
      };
    });
  }

  // Migration 3: Ensure customTasks have four-dimensional attributes
  if (data.customTasks?.length) {
    data.customTasks = data.customTasks.map((task: any) => {
      // Add importance
      if (!task.importance) {
        if (task.linkType === 'chapter' || task.linkedChapterId) {
          task.importance = 'high';
        } else if (task.linkType === 'mainQuest' || task.linkedMainQuestId) {
          task.importance = 'medium';
        } else {
          task.importance = 'low';
        }
      }

      // Add effort
      if (!task.effort) {
        task.effort = 'medium';
      }

      // Migrate taskType
      const validTaskTypes = ['creative', 'tax', 'maintenance'];
      if (!task.taskType || !validTaskTypes.includes(task.taskType)) {
        const typeMapping: Record<string, string> = {
          // Legacy v1
          recovery: 'creative',
          introspective: 'creative',
          'intentional-research': 'creative',
          household: 'tax',
          review: 'tax',

          // Legacy v2
          productive: 'creative',
          administrative: 'tax',
          social: 'maintenance',
        };
        task.taskType = typeMapping[task.taskType] || 'creative';
      }

      // Add linkType
      if (!task.linkType) {
        if (task.linkedChapterId) {
          task.linkType = 'chapter';
        } else if (task.linkedMainQuestId) {
          task.linkType = 'mainQuest';
        } else {
          task.linkType = 'none';
        }
      }

      return task;
    });
  }

  // Migration 4: Initialize missing top-level fields
  data.archivedMainQuests = data.archivedMainQuests || [];
  data.recurringTasks = data.recurringTasks || [];
  data.events = data.events || [];
  data.eventMemories = data.eventMemories || { summaries: [], coreEvents: [] };
  data.aiAnalysisHistory = data.aiAnalysisHistory || [];
  data.journals = data.journals || [];
  data.resourceLogs = data.resourceLogs || [];
  data.energyHistory = data.energyHistory || [];
  data.financialRecords = data.financialRecords || [];

  // Migration 5: Initialize skills if missing
  if (!data.skills) {
    data.skills = {
      magician: {
        manifestation: { level: 1, xp: 0, maxXp: 100 },
        beliefAlignment: { level: 1, xp: 0, maxXp: 100 },
        energyAlchemy: { level: 1, xp: 0, maxXp: 100 },
      },
      systemBalancer: {
        teaming: { level: 1, xp: 0, maxXp: 100 },
        karmaManagement: { level: 1, xp: 0, maxXp: 100 },
        startupAlchemy: { level: 1, xp: 0, maxXp: 100 },
      },
      observer: {
        intuitionNavigation: { level: 1, xp: 0, maxXp: 100 },
        selfCompassion: { level: 1, xp: 0, maxXp: 100 },
        tripleVision: { level: 1, xp: 0, maxXp: 100 },
      },
    };
  }

  // Migration 6: Initialize pomodoro if missing
  if (!data.pomodoro) {
    data.pomodoro = {
      completedToday: 0,
      lastPomodoroDate: new Date().toDateString(),
      totalCompleted: 0,
      lastUsedTaskId: null,
    };
  }

  // Migration 7: Initialize resources if missing
  if (!data.resources) {
    data.resources = {
      time: { total: 0 },
      money: {
        balance: 0,
        monthlyIncome: 1800,
        monthlyBudget: 2400,
        monthlySpent: 0,
        currentMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      },
      energy: {
        current: 80,
        lastUpdate: new Date().toISOString(),
        lastSleepRecord: null,
      },
    };
  }

  // Migration 8: Initialize level system if missing
  data.level = data.level ?? Math.floor((data.experience || 0) / 100) + 1;
  data.currentTitle = data.currentTitle || 'newbie';
  data.unlockedTitles = data.unlockedTitles || ['newbie'];

  // Migration 9: Initialize season system
  data.activeSeasons = data.activeSeasons || [];
  data.seasonHistory = data.seasonHistory || [];
  data.categories = data.categories || [
    { id: 'work', name: '工作', icon: '💼', color: '#3b82f6' },
    { id: 'study', name: '学习', icon: '📚', color: '#10b981' },
    { id: 'life', name: '生活', icon: '🏠', color: '#f59e0b' },
    { id: 'health', name: '健康', icon: '💪', color: '#ef4444' },
    { id: 'hobby', name: '兴趣', icon: '🎨', color: '#8b5cf6' },
  ];

  // Migration 10: Multi-season migration (v5.7)
  if (data.currentSeason && data.activeSeasons.length === 0) {
    // Add category if missing
    if (!data.currentSeason.category) {
      data.currentSeason.category = 'life';
    }
    data.activeSeasons = [data.currentSeason];
  }

  // Migration 11: Initialize transmigration
  data.transmigration = data.transmigration || {
    permanentTitles: [],
    keyItems: [],
    unlockedSeasons: [],
    unlockedDungeons: [],
    totalLifetimeXP: 0,
  };

  // Migration 12: Initialize monitor settings
  data.monitor = data.monitor || {
    enabled: true,
    chartRange: 7,
    alertsEnabled: true,
    lastDailyReport: null,
    reportTime: 9,
    deadlineAlertTimes: [10, 14, 18],
  };

  // Migration 13: Initialize questionnaires
  data.questionnaires = data.questionnaires || {
    history: [],
    statistics: {},
    settings: {},
  };

  // Migration 14: Initialize belief/lore/world/progression/title orchestration modules
  data.beliefSystem = data.beliefSystem || {
    mode: 'default',
    profileBeliefs: [],
  };
  data.loreProfile = data.loreProfile || {
    worldTheme: '现实冒险',
    playerArchetype: 'Builder',
    taboos: [],
    preferredTone: 'grounded',
    freeTextLore: '',
    version: 1,
  };
  data.worldState = data.worldState || {
    epoch: 1,
    factions: [
      { id: 'guild_builders', name: 'Builders Guild', stance: 20, influence: 55 },
      { id: 'guild_scholars', name: 'Scholars Circle', stance: 10, influence: 45 },
    ],
    worldVariables: { stability: 60, momentum: 50, prosperity: 45 },
    activeWorldEvents: [],
    lastEvolutionAt: new Date().toISOString(),
  };
  data.progressionConfig = data.progressionConfig || {
    taskTypeRules: {
      creative: {
        primarySkills: ['magician.manifestation', 'magician.energyAlchemy'],
        secondarySkills: ['observer.intuitionNavigation', 'observer.tripleVision'],
        attributeWeights: { action: 0.5, intelligence: 0.4, spirit: 0.3 },
      },
      tax: {
        primarySkills: ['systemBalancer.karmaManagement', 'systemBalancer.startupAlchemy'],
        secondarySkills: ['systemBalancer.teaming', 'magician.beliefAlignment'],
        attributeWeights: { agility: 0.5, intelligence: 0.4, action: 0.2 },
      },
      maintenance: {
        primarySkills: ['observer.selfCompassion', 'systemBalancer.teaming'],
        secondarySkills: ['magician.beliefAlignment', 'magician.energyAlchemy'],
        attributeWeights: { life: 0.5, charm: 0.4, agility: 0.2 },
      },
    },
    aiAdjustmentBounds: { min: 0.9, max: 1.1 },
    periodCaps: { dailySkillXpCap: 200, weeklySkillXpCap: 800, dailyAttrCap: 18 },
  };
  data.titleCatalog = data.titleCatalog || {
    generatedTitles: [],
    unlockHistory: [],
  };
  data.orchestrationLog = data.orchestrationLog || [];
  // Migration 15: Initialize savedRewards
  data.savedRewards = data.savedRewards || {
    quotes: [],
    knowledge: [],
    trivia: [],
    jokes: [],
    memes: [],
  };
  data.rewardPool = data.rewardPool || [];
  data.rewardPricing = {
    eat: 20,
    drink: 8,
    buy: 80,
    watch: 30,
    play: 50,
    rest: 30,
    other: 50,
    ...(data.rewardPricing || {}),
  };

  // Migration 15: Fix archived quests status
  if (data.archivedMainQuests?.length) {
    data.archivedMainQuests = data.archivedMainQuests.map((quest: any) => {
      // Set status to 'archived' if not already set or still shows as 'active'
      if (!quest.status || quest.status === 'active') {
        // Check if it was completed before archiving
        if (quest.completedAt || quest.progress >= 100) {
          quest.status = 'completed';
        } else {
          quest.status = 'archived';
        }
      }
      // Add archivedAt if missing
      if (!quest.archivedAt) {
        quest.archivedAt = new Date().toISOString();
      }
      return quest;
    });
  }

  // Migration 16: Initialize weekly goals
  data.weeklyGoals = data.weeklyGoals || [];
  data.archivedWeeklyGoals = data.archivedWeeklyGoals || [];

  // Migration 17: Initialize habits and migrate from recurringTasks
  data.habits = data.habits || [];
  data.archivedHabits = data.archivedHabits || [];

  // Migrate recurringTasks to habits if habits is empty but recurringTasks exists
  if (data.recurringTasks?.length && data.habits.length === 0) {
    data.habits = data.recurringTasks.map((rt: any) => ({
      id: rt.id,
      name: rt.name,
      description: rt.description || undefined,
      emoji: '✅',
      category: undefined,
      frequencyType: rt.frequency === 'daily' ? 'daily' : 'weekly',
      targetPerDay: 1,
      targetDaysPerWeek: rt.daysOfWeek?.length || 7,
      streak: rt.streak || 0,
      longestStreak: rt.streak || 0,
      totalCompletions: 0,
      completionHistory: {},
      createdAt: rt.createdAt || new Date().toISOString(),
      active: rt.enabled !== false,
    }));
  }

  return data;
}

/**
 * Create a backup of current data
 */
export function createBackup(): string {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return '';

  const timestamp = new Date().toISOString().split('T')[0];
  const backupKey = `${STORAGE_KEY}_backup_${timestamp}`;
  localStorage.setItem(backupKey, data);

  return backupKey;
}

/**
 * List all backups
 */
export function listBackups(): string[] {
  const backups: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_KEY}_backup_`)) {
      backups.push(key);
    }
  }
  return backups.sort().reverse();
}

/**
 * Restore from backup
 */
export function restoreBackup(backupKey: string): boolean {
  const data = localStorage.getItem(backupKey);
  if (!data) return false;

  localStorage.setItem(STORAGE_KEY, data);
  return true;
}

/**
 * Export data as JSON string
 */
export function exportDataAsJSON(): string {
  const data = localStorage.getItem(STORAGE_KEY);
  return data || '{}';
}

/**
 * Import data from JSON string
 */
export function importDataFromJSON(json: string): boolean {
  try {
    const data = JSON.parse(json);
    const migrated = runMigrations(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return true;
  } catch (error) {
    console.error('[Migration] Failed to import data:', error);
    return false;
  }
}
