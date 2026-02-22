import type { DailyCompletionSnapshot, GameData, Skills } from '../types/game-data';
import type { CustomTask, RewardPriceTier, RewardSticker, Status } from '../types/task';
import { calculateLevelFromXP } from '../lib/player-progression';
import { sumTaskFocusMinutes } from '../lib/focus-time';
import { isDateInFuture } from '../lib/hierarchy-status';
import { TITLE_DATABASE } from '../config/constants';

export const STORAGE_KEY = 'earthOnlineDataV3';

export const DEFAULT_SKILLS: Skills = {
    magician: {
        manifestation: { level: 2, xp: 0, maxXp: 100 },
        beliefAlignment: { level: 3, xp: 0, maxXp: 100 },
        energyAlchemy: { level: 3, xp: 0, maxXp: 100 },
    },
    systemBalancer: {
        teaming: { level: 2, xp: 0, maxXp: 100 },
        karmaManagement: { level: 4, xp: 0, maxXp: 100 },
        startupAlchemy: { level: 1, xp: 0, maxXp: 100 },
    },
    observer: {
        intuitionNavigation: { level: 4, xp: 0, maxXp: 100 },
        selfCompassion: { level: 3, xp: 0, maxXp: 100 },
        tripleVision: { level: 4, xp: 0, maxXp: 100 },
    },
};

export const DEFAULT_BELIEF_SYSTEM: GameData['beliefSystem'] = {
    mode: 'default',
    profileBeliefs: [],
};

export const DEFAULT_LORE_PROFILE: GameData['loreProfile'] = {
    worldTheme: '现实冒险',
    playerArchetype: 'Builder',
    taboos: [],
    preferredTone: 'grounded',
    freeTextLore: '',
    version: 1,
};

export const DEFAULT_WORLD_STATE: GameData['worldState'] = {
    epoch: 1,
    factions: [
        { id: 'guild_builders', name: 'Builders Guild', stance: 20, influence: 55 },
        { id: 'guild_scholars', name: 'Scholars Circle', stance: 10, influence: 45 },
    ],
    worldVariables: {
        stability: 60,
        momentum: 50,
        prosperity: 45,
    },
    activeWorldEvents: [],
    lastEvolutionAt: new Date().toISOString(),
};

export const DEFAULT_PROGRESSION_CONFIG: GameData['progressionConfig'] = {
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
    periodCaps: {
        dailySkillXpCap: 200,
        weeklySkillXpCap: 800,
        dailyAttrCap: 18,
    },
};

export const DEFAULT_TITLE_CATALOG: GameData['titleCatalog'] = {
    generatedTitles: [],
    unlockHistory: [],
};

const STICKER_WIDTH = 170;
const STICKER_HEIGHT = 90;
const BOARD_WIDTH = 1100;
const BOARD_HEIGHT = 520;
const BOARD_PADDING = 12;
const REWARD_TIER_GOLD: Record<RewardPriceTier, number> = {
    S: 120,
    A: 80,
    B: 50,
    C: 30,
};

export const DEFAULT_REWARD_PRICING: GameData['rewardPricing'] = {
    eat: 20,
    drink: 8,
    buy: 80,
    watch: 30,
    play: 50,
    rest: 30,
    other: 50,
};

export function getCurrentMonthStr(now: Date = new Date()): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLegacyDayString(dayStr?: string): Date | null {
    if (!dayStr) return null;
    const parsed = new Date(dayStr);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

export function calculateMonthlyMoneyFromRecords(records: GameData['financialRecords'], month: string) {
    return records.reduce(
        (acc, record) => {
            if (!record.date.startsWith(month)) return acc;
            if (record.type === 'income') acc.income += record.amount;
            if (record.type === 'expense') acc.spent += record.amount;
            return acc;
        },
        { income: 0, spent: 0 }
    );
}

export function computeDailySnapshotFromState(state: GameData, dateKey: string): DailyCompletionSnapshot {
    const createdFromLog = state.taskLogs.filter((log) =>
        log.type === 'create' && log.timestamp.startsWith(dateKey)
    ).length;
    const completedFromLog = state.taskLogs.filter((log) =>
        log.type === 'complete' && log.timestamp.startsWith(dateKey)
    ).length;

    if (createdFromLog > 0 || completedFromLog > 0) {
        const completionRate = createdFromLog > 0
            ? (completedFromLog / createdFromLog) * 100
            : 0;
        return {
            date: dateKey,
            tasksCreated: createdFromLog,
            tasksCompleted: completedFromLog,
            completionRate: Math.max(0, Math.min(100, completionRate)),
            frozenAt: new Date().toISOString(),
            source: 'event_rebuild',
        };
    }

    const taskById = new Map<string, CustomTask>();
    [...state.customTasks, ...state.archivedTasks].forEach((task) => {
        if (!taskById.has(task.id)) {
            taskById.set(task.id, task);
        }
    });
    const allTasks = Array.from(taskById.values());
    const createdFallback = allTasks.filter((task) => task.createdAt.startsWith(dateKey)).length;
    const completedFallback = allTasks.filter(
        (task) => !!task.completedAt && task.completedAt.startsWith(dateKey)
    ).length;
    const fallbackRate = createdFallback > 0 ? (completedFallback / createdFallback) * 100 : 0;

    return {
        date: dateKey,
        tasksCreated: createdFallback,
        tasksCompleted: completedFallback,
        completionRate: Math.max(0, Math.min(100, fallbackRate)),
        frozenAt: new Date().toISOString(),
        source: 'fallback',
    };
}

export function estimateRewardTier(verb: RewardSticker['verb'], _quantity?: number): RewardPriceTier {
    if (verb === 'buy') return 'A';
    if (verb === 'watch' || verb === 'rest') return 'C';
    if (verb === 'play') return 'B';
    if (verb === 'drink') return 'C';
    if (verb === 'eat') return 'C';
    return 'B';
}

export function estimateRewardPricing(
    verb: RewardSticker['verb'],
    quantity?: number,
    pricingConfig: GameData['rewardPricing'] = DEFAULT_REWARD_PRICING
) {
    const tier = estimateRewardTier(verb, quantity);
    return {
        priceTier: tier,
        priceGold: pricingConfig[verb] ?? REWARD_TIER_GOLD[tier],
    };
}

export function normalizeRewardVerb(item: Pick<RewardSticker, 'verb' | 'rawText' | 'object'>): RewardSticker['verb'] {
    if (item.verb !== 'eat') return item.verb;
    const text = `${item.rawText || ''} ${item.object || ''}`.toLowerCase();
    const looksLikeDrink = /(喝|饮料|奶茶|咖啡|可乐|果汁|茶|drink)/i.test(text);
    const looksLikeEat = /(吃|鸡翅|炸鸡|汉堡|拉面|饭|火锅|寿司|pizza|eat)/i.test(text);
    if (looksLikeDrink && !looksLikeEat) return 'drink';
    return item.verb;
}

export function clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function getSkillPathCandidates(
    taskType: CustomTask['taskType'],
    progressionConfig: GameData['progressionConfig']
) {
    return progressionConfig.taskTypeRules[taskType] || progressionConfig.taskTypeRules.creative;
}

export function parseSkillPath(path: string): { category: 'magician' | 'systemBalancer' | 'observer'; skill: string } | null {
    const [category, skill] = path.split('.');
    if (!category || !skill) return null;
    if (!['magician', 'systemBalancer', 'observer'].includes(category)) return null;
    return {
        category: category as 'magician' | 'systemBalancer' | 'observer',
        skill,
    };
}

function getSkillLevels(skills: Skills): number[] {
    return [
        skills.magician.manifestation.level,
        skills.magician.beliefAlignment.level,
        skills.magician.energyAlchemy.level,
        skills.systemBalancer.teaming.level,
        skills.systemBalancer.karmaManagement.level,
        skills.systemBalancer.startupAlchemy.level,
        skills.observer.intuitionNavigation.level,
        skills.observer.selfCompassion.level,
        skills.observer.tripleVision.level,
    ];
}

export function evaluateAutoTitleUnlockNames(state: GameData): string[] {
    const unlockNames = new Set<string>();
    const completedTasks = [...state.customTasks, ...state.archivedTasks].filter((t) => t.status === 'completed' || t.completed).length;
    const totalPomodoro = state.pomodoro.totalCompleted || 0;
    const skillLevels = getSkillLevels(state.skills);
    const anySkillLevel = Math.max(...skillLevels);
    const allSkillsLevel3 = skillLevels.every((lv) => lv >= 3);

    for (const levelTitle of TITLE_DATABASE.levelTitles) {
        if (state.level >= levelTitle.minLevel) unlockNames.add(levelTitle.name);
    }
    for (const achievement of TITLE_DATABASE.achievementTitles) {
        if (achievement.condition === 'totalPomodoro >= 10' && totalPomodoro >= 10) unlockNames.add(achievement.name);
        if (achievement.condition === 'totalPomodoro >= 100' && totalPomodoro >= 100) unlockNames.add(achievement.name);
        if (achievement.condition === 'completedTasks >= 50' && completedTasks >= 50) unlockNames.add(achievement.name);
        if (achievement.condition === 'anySkillLevel >= 5' && anySkillLevel >= 5) unlockNames.add(achievement.name);
        if (achievement.condition === 'allSkillsLevel3' && allSkillsLevel3) unlockNames.add(achievement.name);
    }
    return Array.from(unlockNames);
}

export function generateAutoLoreTitle(
    sourceType: 'quest' | 'chapter' | 'season',
    sourceName: string,
    loreProfile: GameData['loreProfile']
): { name: string; description: string; rarity: 'C' | 'B' | 'A' | 'S' } {
    const rarity: 'C' | 'B' | 'A' | 'S' =
        sourceType === 'season' ? 'S' :
            sourceType === 'chapter' ? 'A' : 'B';
    const tonePrefix = loreProfile.preferredTone === 'epic'
        ? '天穹'
        : loreProfile.preferredTone === 'playful'
            ? '奇遇'
            : '行者';
    const sourceWord = sourceType === 'season' ? '主线' : sourceType === 'chapter' ? '篇章' : '副本';
    const name = `${tonePrefix}${sourceWord}·${sourceName}`;
    const description = `由 ${sourceWord}「${sourceName}」自动授予，契合世界观主题「${loreProfile.worldTheme}」。`;
    return { name, description, rarity };
}

export function resolveSeasonStatus(
    currentStatus: Status,
    startDate?: string,
    requestedStatus?: Status
): Status {
    const explicitStatus = requestedStatus ?? currentStatus;

    if (explicitStatus === 'completed' || explicitStatus === 'archived') {
        return explicitStatus;
    }

    if (isDateInFuture(startDate)) {
        return 'locked';
    }

    if (explicitStatus === 'paused') {
        return 'paused';
    }

    return 'active';
}

export function createStickerPlacement(
    occupied: Array<{ x: number; y: number }> = []
) {
    const minX = BOARD_PADDING;
    const maxX = BOARD_WIDTH - STICKER_WIDTH - BOARD_PADDING;
    const minY = BOARD_PADDING;
    const maxY = BOARD_HEIGHT - STICKER_HEIGHT - BOARD_PADDING;

    const isTooClose = (x: number, y: number) =>
        occupied.some((p) => Math.abs(p.x - x) < STICKER_WIDTH * 0.7 && Math.abs(p.y - y) < STICKER_HEIGHT * 0.7);

    for (let attempt = 0; attempt < 36; attempt++) {
        const x = Math.round(minX + Math.random() * (maxX - minX));
        const y = Math.round(minY + Math.random() * (maxY - minY));
        if (!isTooClose(x, y)) {
            let rotation = Math.round(-14 + Math.random() * 28);
            if (Math.abs(rotation) < 4) rotation = rotation >= 0 ? 4 : -4;
            return { x, y, rotation, zIndex: 1 };
        }
    }

    let rotation = Math.round(-14 + Math.random() * 28);
    if (Math.abs(rotation) < 4) rotation = rotation >= 0 ? 4 : -4;
    return {
        x: Math.round(minX + Math.random() * (maxX - minX)),
        y: Math.round(minY + Math.random() * (maxY - minY)),
        rotation,
        zIndex: 1,
    };
}

export function parseDefinitionOfDone(dodText: string): string[] {
    if (!dodText || !dodText.trim()) return [];

    const lines = dodText.split('\n');
    const items: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const listMatch = trimmed.match(/^[-*•]|\d+\.\s/);
        if (listMatch) {
            const content = trimmed.replace(/^[-*•]\s*|\d+\.\s*/, '').trim();
            if (content) {
                items.push(content);
            }
        } else {
            if (trimmed.length < 100 && !trimmed.includes('：') && !trimmed.includes(':')) {
                items.push(trimmed);
            }
        }
    }

    return items;
}

export function isAutoGeneratedDoDTaskDescription(desc?: string): boolean {
    if (!desc) return false;
    return desc.includes('Definition of Done 自动生成') || desc.includes('Definition of Done auto-generated');
}

export function normalizeStoreData(state: GameData, incoming: Partial<GameData>): GameData {
    const merged = { ...state, ...incoming } as GameData;
    const safeXP = Math.max(0, merged.experience || 0);
    const safeLevel = Math.max(1, Math.min(calculateLevelFromXP(safeXP), 100));

    const existingMoney = incoming.resources?.money;
    const legacyCoins = (incoming as Partial<GameData> & { coins?: number }).coins;
    const normalizedBalance = typeof existingMoney?.balance === 'number'
        ? existingMoney.balance
        : typeof legacyCoins === 'number'
            ? legacyCoins
            : state.resources.money.balance;
    const mergedTasks = [
        ...(incoming.customTasks || state.customTasks || []),
        ...(incoming.archivedTasks || state.archivedTasks || []),
    ];
    const derivedFocusMinutes = sumTaskFocusMinutes(mergedTasks);
    const mergedFinancialRecords = incoming.financialRecords || state.financialRecords || [];
    const targetMonth = incoming.resources?.money?.currentMonth || state.resources.money.currentMonth || getCurrentMonthStr();
    const monthSummary = calculateMonthlyMoneyFromRecords(mergedFinancialRecords, targetMonth);
    const mergedRewardPricing = {
        ...DEFAULT_REWARD_PRICING,
        ...(state.rewardPricing || {}),
        ...(incoming.rewardPricing || {}),
    };
    const normalizedRewardPool = (incoming.rewardPool || state.rewardPool || []).map((item) => {
        const normalizedVerb = normalizeRewardVerb(item);
        const forcedPricing = (normalizedVerb === 'eat' || normalizedVerb === 'drink')
            ? estimateRewardPricing(normalizedVerb, item.quantity, mergedRewardPricing)
            : null;
        const tier = forcedPricing?.priceTier || item.priceTier || estimateRewardTier(normalizedVerb, item.quantity);
        return {
            ...item,
            verb: normalizedVerb,
            priceTier: tier,
            priceGold: forcedPricing
                ? forcedPricing.priceGold
                : typeof item.priceGold === 'number' && item.priceGold > 0
                    ? item.priceGold
                    : REWARD_TIER_GOLD[tier],
        };
    });

    return {
        ...merged,
        level: safeLevel,
        experience: safeXP,
        resources: {
            ...state.resources,
            ...incoming.resources,
            time: {
                ...state.resources.time,
                ...incoming.resources?.time,
                total: derivedFocusMinutes,
            },
            money: {
                ...state.resources.money,
                ...incoming.resources?.money,
                balance: normalizedBalance,
                currentMonth: targetMonth,
                monthlyIncome: monthSummary.income,
                monthlySpent: monthSummary.spent,
                monthlyNet: monthSummary.income - monthSummary.spent,
            },
            energy: {
                ...state.resources.energy,
                ...incoming.resources?.energy,
                current: Math.max(0, Math.min(100, incoming.resources?.energy?.current ?? state.resources.energy.current)),
                lastUpdate: incoming.resources?.energy?.lastUpdate || new Date().toISOString(),
            },
        },
        rewardPool: normalizedRewardPool,
        rewardPricing: mergedRewardPricing,
        rewardActionLogs: incoming.rewardActionLogs || state.rewardActionLogs || [],
        dailyCompletionSnapshots: incoming.dailyCompletionSnapshots || state.dailyCompletionSnapshots || {},
        skills: incoming.skills || state.skills || DEFAULT_SKILLS,
        beliefSystem: incoming.beliefSystem || state.beliefSystem || DEFAULT_BELIEF_SYSTEM,
        loreProfile: incoming.loreProfile || state.loreProfile || DEFAULT_LORE_PROFILE,
        worldState: incoming.worldState || state.worldState || DEFAULT_WORLD_STATE,
        progressionConfig: incoming.progressionConfig || state.progressionConfig || DEFAULT_PROGRESSION_CONFIG,
        titleCatalog: incoming.titleCatalog || state.titleCatalog || DEFAULT_TITLE_CATALOG,
        orchestrationLog: incoming.orchestrationLog || state.orchestrationLog || [],
    };
}
