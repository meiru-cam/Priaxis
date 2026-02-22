import { useGameStore } from '../../stores/game-store';
import { mcpClient } from '../mcp';
import type { CustomTask, Effort, TaskType } from '../../types/task';
import {
    attachResolvedPath,
    extractNotePathsFromUnknown,
    getBaseName,
    normalizeNotePath,
    parseDateRange,
    sanitizeTaskUpdates,
    toDebugSnippet,
    withMdExtension,
} from './tools-helpers';

// Define the shape of a tool definition for Gemini
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'OBJECT';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

type ToolArgs = Record<string, unknown>;

// Internal tool implementation wrapper
export interface ToolImplementation {
    definition: ToolDefinition;
    execute(args: unknown): Promise<unknown>;
}

// --- Tool Implementations ---

const getPlayerStatus: ToolImplementation = {
    definition: {
        name: 'get_player_status',
        description: 'Get the current player status including HP, Energy, Gold, and Level.',
        parameters: {
            type: 'OBJECT',
            properties: {},
        },
    },
    execute: async () => {
        const state = useGameStore.getState();
        return {
            hp: state.stats.life,
            maxHp: 100, // Assuming standard max
            energy: state.resources.energy.current,
            maxEnergy: 100,
            gold: state.resources.money.balance,
            level: state.level,
            xp: state.experience,
            title: state.currentTitle,
        };
    },
};

const getTasks: ToolImplementation = {
    definition: {
        name: 'get_tasks',
        description: 'Get tasks filtered by status and optional completion date range.',
        parameters: {
            type: 'OBJECT',
            properties: {
                status: {
                    type: 'STRING',
                    description: 'Filter by task status: "todo", "in_progress", "completed". If omitted, returns active tasks (todo/in_progress).',
                    enum: ['todo', 'in_progress', 'completed'],
                },
                dateFrom: {
                    type: 'STRING',
                    description: 'Optional start date (YYYY-MM-DD). For completed tasks, matches completedAt.',
                },
                dateTo: {
                    type: 'STRING',
                    description: 'Optional end date (YYYY-MM-DD). For completed tasks, matches completedAt.',
                },
                relativeDate: {
                    type: 'STRING',
                    description: 'Shortcut date range: "yesterday", "today", or "this_week".',
                    enum: ['yesterday', 'today', 'this_week'],
                },
                includeArchived: {
                    type: 'BOOLEAN',
                    description: 'Whether to include archived tasks. Defaults to true for completed, false otherwise.',
                },
            },
        },
    },
    execute: async ({
        status,
        dateFrom,
        dateTo,
        relativeDate,
        includeArchived,
    }: {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        relativeDate?: 'yesterday' | 'today' | 'this_week';
        includeArchived?: boolean;
    }) => {
        const state = useGameStore.getState();
        const taskMap = new Map<string, CustomTask>();
        [...state.customTasks, ...state.archivedTasks].forEach((task) => {
            if (!taskMap.has(task.id)) taskMap.set(task.id, task);
        });
        const { fromTime, toTime } = parseDateRange(dateFrom, dateTo, relativeDate);

        if (status === 'completed') {
            const completedLogs = state.taskLogs
                .filter((log) => log.type === 'complete')
                .filter((log) => {
                    const ts = new Date(log.timestamp).getTime();
                    if (Number.isNaN(ts)) return false;
                    if (fromTime !== null && ts < fromTime) return false;
                    if (toTime !== null && ts > toTime) return false;
                    return true;
                })
                .map((log) => {
                    const task = taskMap.get(log.task.id);
                    return {
                        id: log.task.id,
                        name: log.task.name || task?.name || log.task.id,
                        description: task?.description,
                        completed: true,
                        status: 'completed',
                        completedAt: log.timestamp,
                        deadline: task?.deadline,
                    };
                });

            return completedLogs;
        }

        const shouldIncludeArchived = typeof includeArchived === 'boolean'
            ? includeArchived
            : status === 'completed';
        let tasks = shouldIncludeArchived
            ? [...state.customTasks, ...state.archivedTasks]
            : [...state.customTasks];

        if (status === 'completed') {
            tasks = tasks.filter((t) => t.status === 'completed' || t.completed);
        } else if (status === 'todo') {
            tasks = tasks.filter((t) => t.status === 'todo' || (!t.completed && t.status !== 'in_progress'));
        } else if (status === 'in_progress') {
            tasks = tasks.filter((t) => t.status === 'in_progress');
        } else {
            // Default active
            tasks = tasks.filter((t) => !(t.status === 'completed' || t.completed));
        }

        if (fromTime !== null || toTime !== null) {
            tasks = tasks.filter((t) => {
                const baseDate = status === 'completed'
                    ? (t.completedAt || t.createdAt)
                    : (t.deadline || t.createdAt);
                const ts = new Date(baseDate).getTime();
                if (Number.isNaN(ts)) return false;
                if (fromTime !== null && ts < fromTime) return false;
                if (toTime !== null && ts > toTime) return false;
                return true;
            });
        }

        return tasks.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            completed: t.completed,
            status: t.status,
            completedAt: t.completedAt,
            deadline: t.deadline,
        }));
    },
};

const getOverdueTasks: ToolImplementation = {
    definition: {
        name: 'get_overdue_tasks',
        description: 'Get unfinished tasks by deadline rules (overdue, due on specific date, etc.).',
        parameters: {
            type: 'OBJECT',
            properties: {
                referenceDate: {
                    type: 'STRING',
                    description: 'Reference date (YYYY-MM-DD). Defaults to today.',
                },
                relativeDate: {
                    type: 'STRING',
                    description: 'Shortcut reference date using local timezone: "yesterday" or "today".',
                    enum: ['yesterday', 'today'],
                },
                matchDeadline: {
                    type: 'STRING',
                    description: 'Deadline matching rule.',
                    enum: ['before_reference', 'on_or_before_reference', 'on_reference'],
                },
                includeArchived: {
                    type: 'BOOLEAN',
                    description: 'Whether to include archived tasks in overdue scan. Default false.',
                },
            },
        },
    },
    execute: async ({
        referenceDate,
        relativeDate,
        matchDeadline,
        includeArchived,
    }: {
        referenceDate?: string;
        relativeDate?: 'yesterday' | 'today';
        matchDeadline?: 'before_reference' | 'on_or_before_reference' | 'on_reference';
        includeArchived?: boolean;
    }) => {
        const state = useGameStore.getState();
        const now = new Date();
        const resolvedRefDate = (() => {
            if (referenceDate) return referenceDate;
            if (relativeDate === 'today') return now.toISOString().slice(0, 10);
            if (relativeDate === 'yesterday') {
                const y = new Date(now);
                y.setDate(y.getDate() - 1);
                return y.toISOString().slice(0, 10);
            }
            return now.toISOString().slice(0, 10);
        })();
        const rule = matchDeadline || 'before_reference';
        const base = includeArchived
            ? [...state.customTasks, ...state.archivedTasks]
            : [...state.customTasks];

        const overdue = base.filter((task) => {
            const isCompleted = task.status === 'completed' || task.completed;
            if (isCompleted) return false;
            if (!task.deadline) return false;
            if (rule === 'on_reference') return task.deadline === resolvedRefDate;
            if (rule === 'on_or_before_reference') return task.deadline <= resolvedRefDate;
            return task.deadline < resolvedRefDate;
        });

        return overdue.map((task) => ({
            id: task.id,
            name: task.name,
            status: task.status,
            deadline: task.deadline,
            completed: task.completed,
            completedAt: task.completedAt,
            daysOverdue: task.deadline
                ? Math.max(
                    0,
                    Math.floor((new Date(`${resolvedRefDate}T00:00:00`).getTime() - new Date(`${task.deadline}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000))
                )
                : 0,
            referenceDate: resolvedRefDate,
            matchDeadline: rule,
        }));
    },
};

const addTask: ToolImplementation = {
    definition: {
        name: 'add_task',
        description: 'Create a new task. DATE format must be YYYY-MM-DD. Priority/Effort must match allowed values exactly.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'The title of the task.' },
                description: { type: 'STRING', description: 'Optional description.' },
                deadline: { type: 'STRING', description: 'Due date in YYYY-MM-DD format (Required for "today/tomorrow").' },
                importance: {
                    type: 'STRING',
                    description: 'Importance: "low", "medium", "high".',
                    enum: ['low', 'medium', 'high']
                },
                effort: {
                    type: 'STRING',
                    description: 'Effort: light(4 energy), medium(10 energy), heavy(30 energy).',
                    enum: ['light', 'medium', 'heavy']
                },
                taskType: {
                    type: 'STRING',
                    description: 'Type: "creative", "tax", "maintenance".',
                    enum: ['creative', 'tax', 'maintenance']
                },
                linkedQuestId: { type: 'STRING', description: 'ID of the main quest this task belongs to.' }
            },
            required: ['title'],
        },
    },
    execute: async ({ title, description, deadline, importance, effort, taskType, linkedQuestId }: {
        title: string;
        description?: string;
        deadline?: string;
        importance?: string;
        effort?: string;
        taskType?: string;
        linkedQuestId?: string;
    }) => {
        const state = useGameStore.getState();

        // Validation & Fallbacks
        const validImportance = (['low', 'medium', 'high'].includes(importance || '') ? importance : 'medium') as 'low' | 'medium' | 'high';

        // Map old values or validate new ones
        let validEffort: Effort = 'medium';
        const e = effort || '';
        if (['light', 'medium', 'heavy'].includes(e)) {
            validEffort = e as Effort;
        } else if (e === 'tiny') validEffort = 'light';
        else if (e === 'moderate') validEffort = 'medium';
        else if (e === 'massive') validEffort = 'heavy';

        const validTaskType = (['creative', 'tax', 'maintenance'].includes(taskType || '') ? taskType : 'creative') as TaskType;

        const taskId = state.addTask({
            name: title,
            description: description,
            importance: validImportance,
            effort: validEffort,
            taskType: validTaskType,
            deadline: deadline,
            linkType: linkedQuestId ? 'mainQuest' : 'none',
            linkedMainQuestId: linkedQuestId,
        });

        return { success: true, taskId: taskId, message: `Task "${title}" created.` };
    },
};

const updateTask: ToolImplementation = {
    definition: {
        name: 'update_task',
        description: 'Update an existing task. Use this to Rename or Change attributes.',
        parameters: {
            type: 'OBJECT',
            properties: {
                taskId: { type: 'STRING', description: 'The exact ID of the task to update.' },
                ...addTask.definition.parameters.properties,
            },
            required: ['taskId'],
        },
    },
    execute: async ({ taskId, ...updates }: { taskId: string } & ToolArgs) => {
        const state = useGameStore.getState();
        const task = state.customTasks.find(t => t.id === taskId);
        if (!task) return { success: false, message: 'Task not found.' };

        const safeUpdates = sanitizeTaskUpdates(updates);
        if (Object.keys(safeUpdates).length === 0) {
            return { success: false, message: 'No valid updatable fields were provided.' };
        }

        state.updateTask(taskId, safeUpdates as Partial<typeof task>);
        return { success: true, message: `Task "${task.name}" updated.` };
    },
};

const draftTask: ToolImplementation = {
    definition: {
        name: 'draft_task',
        description: 'Propose a task creation for user confirmation. Use this BEFORE add_task.',
        parameters: {
            ...addTask.definition.parameters,
        },
    },
    execute: async (args: ToolArgs) => {
        // Just return the args back to be rendered by UI
        return { success: true, draft: args, message: 'Task proposal created.' };
    },
};

const deleteTask: ToolImplementation = {
    definition: {
        name: 'delete_task',
        description: 'Request deletion of a task by ID or by finding a best match title. Requires explicit confirmation.',
        parameters: {
            type: 'OBJECT',
            properties: {
                taskId: { type: 'STRING', description: 'The exact ID of the task to delete' },
                taskName: { type: 'STRING', description: 'The approximate name of the task to delete if ID is unknown' },
                confirm: { type: 'BOOLEAN', description: 'Must be true to execute deletion.' },
            },
        },
    },
    execute: async ({ taskId, taskName, confirm }: { taskId?: string; taskName?: string; confirm?: boolean }) => {
        const state = useGameStore.getState();
        let targetId = taskId;
        let targetTaskName = '';

        if (!targetId && taskName) {
            // Fuzzy search for task
            const match = state.customTasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
            if (match) {
                targetId = match.id;
                targetTaskName = match.name;
            } else {
                return { success: false, message: `Could not find task with name containing "${taskName}".` };
            }
        }

        if (!targetId) {
            return { success: false, message: 'Please provide either taskId or taskName.' };
        }

        if (!targetTaskName) {
            const targetTask = state.customTasks.find(t => t.id === targetId);
            targetTaskName = targetTask?.name || targetId;
        }

        if (!confirm) {
            return {
                success: false,
                requiresConfirmation: true,
                action: 'delete_task',
                taskId: targetId,
                taskName: targetTaskName,
                message: `Please confirm deletion of task "${targetTaskName}" by calling delete_task again with confirm=true.`,
            };
        }

        state.deleteTask(targetId);
        return { success: true, message: `Task "${targetTaskName}" deleted.` };
    },
};

const recordIncome: ToolImplementation = {
    definition: {
        name: 'record_income',
        description: 'Record a gold income transaction through the standard ledger.',
        parameters: {
            type: 'OBJECT',
            properties: {
                amount: { type: 'NUMBER', description: 'Income amount in gold. Must be positive.' },
                category: { type: 'STRING', description: 'Income category, e.g. salary, bonus, refund.' },
                reason: { type: 'STRING', description: 'Optional reason.' },
            },
            required: ['amount'],
        },
    },
    execute: async ({ amount, category, reason }: { amount: number; category?: string; reason?: string }) => {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            return { success: false, message: 'amount must be a positive number.' };
        }
        const state = useGameStore.getState();
        state.updateMoney(value, category || 'income', reason || 'AI recorded income');
        const updatedBalance = useGameStore.getState().resources.money.balance;
        return { success: true, newBalance: updatedBalance, message: `Income recorded: +${value} gold.` };
    },
};

const recordExpense: ToolImplementation = {
    definition: {
        name: 'record_expense',
        description: 'Record a gold expense transaction through the standard ledger.',
        parameters: {
            type: 'OBJECT',
            properties: {
                amount: { type: 'NUMBER', description: 'Expense amount in gold. Must be positive.' },
                category: { type: 'STRING', description: 'Expense category, e.g. food, transport, tools.' },
                reason: { type: 'STRING', description: 'Optional reason.' },
            },
            required: ['amount'],
        },
    },
    execute: async ({ amount, category, reason }: { amount: number; category?: string; reason?: string }) => {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            return { success: false, message: 'amount must be a positive number.' };
        }
        const state = useGameStore.getState();
        if (state.resources.money.balance < value) {
            return { success: false, message: `Insufficient gold. Current balance is ${state.resources.money.balance}.` };
        }
        state.updateMoney(-value, category || 'expense', reason || 'AI recorded expense');
        const updatedBalance = useGameStore.getState().resources.money.balance;
        return { success: true, newBalance: updatedBalance, message: `Expense recorded: -${value} gold.` };
    },
};

const redeemReward: ToolImplementation = {
    definition: {
        name: 'redeem_reward',
        description: 'Redeem an available reward sticker by id or name. This spends gold via transaction ledger.',
        parameters: {
            type: 'OBJECT',
            properties: {
                rewardId: { type: 'STRING', description: 'Exact reward sticker id.' },
                rewardName: { type: 'STRING', description: 'Approx reward text or object.' },
            },
        },
    },
    execute: async ({ rewardId, rewardName }: { rewardId?: string; rewardName?: string }) => {
        const state = useGameStore.getState();
        let targetId = rewardId;

        if (!targetId && rewardName) {
            const keyword = rewardName.toLowerCase();
            const match = (state.rewardPool || []).find((item) =>
                item.status === 'available' &&
                (item.object.toLowerCase().includes(keyword) || item.rawText.toLowerCase().includes(keyword))
            );
            if (match) targetId = match.id;
        }

        if (!targetId) {
            return { success: false, message: 'Please provide rewardId or rewardName.' };
        }

        const result = state.redeemRewardSticker(targetId);
        if (!result.success) {
            if (result.reason === 'insufficient_gold') return { success: false, message: 'Insufficient gold for this reward.' };
            if (result.reason === 'already_redeemed') return { success: false, message: 'Reward is already redeemed.' };
            if (result.reason === 'not_found') return { success: false, message: 'Reward not found.' };
            return { success: false, message: 'Failed to redeem reward.' };
        }
        const nextState = useGameStore.getState();
        return { success: true, newBalance: nextState.resources.money.balance, message: 'Reward redeemed.' };
    },
};

const updateGoldCompat: ToolImplementation = {
    definition: {
        name: 'update_gold',
        description: 'Deprecated compatibility alias. Use record_income or record_expense instead.',
        parameters: {
            type: 'OBJECT',
            properties: {
                amount: { type: 'NUMBER', description: 'Positive to add gold, negative to spend gold.' },
                category: { type: 'STRING', description: 'Optional category.' },
                reason: { type: 'STRING', description: 'Optional reason.' },
            },
            required: ['amount'],
        },
    },
    execute: async ({ amount, category, reason }: { amount: number; category?: string; reason?: string }) => {
        const value = Number(amount);
        if (!Number.isFinite(value) || value === 0) {
            return { success: false, message: 'amount must be a non-zero number.' };
        }
        if (value > 0) {
            const result = await recordIncome.execute({ amount: value, category, reason }) as Record<string, unknown>;
            return {
                ...result,
                message: `${String(result.message ?? '')} (deprecated: use record_income)`,
            };
        }
        const result = await recordExpense.execute({ amount: Math.abs(value), category, reason }) as Record<string, unknown>;
        return {
            ...result,
            message: `${String(result.message ?? '')} (deprecated: use record_expense)`,
        };
    },
};

const updateEnergy: ToolImplementation = {
    definition: {
        name: 'update_energy',
        description: 'Set or modify the player\'s energy (精力) level. Use this after learning about sleep quality or rest activities. Energy ranges from 0-100.',
        parameters: {
            type: 'OBJECT',
            properties: {
                value: {
                    type: 'NUMBER',
                    description: 'New energy value (0-100) OR a delta if mode is "delta".'
                },
                mode: {
                    type: 'STRING',
                    description: 'Either "set" to set absolute value, or "delta" to add/subtract.',
                    enum: ['set', 'delta']
                },
                reason: { type: 'STRING', description: 'Reason for the change (e.g., "good sleep", "took a nap").' },
            },
            required: ['value'],
        },
    },
    execute: async ({ value, mode = 'set', reason }: { value: number; mode?: 'set' | 'delta'; reason?: string }) => {
        const state = useGameStore.getState();

        if (mode === 'set') {
            // Set to absolute value (clamp to 0-100)
            const newEnergy = Math.max(0, Math.min(100, value));
            const delta = newEnergy - state.resources.energy.current;
            state.updateEnergy(delta, reason || 'AI set energy');
            return { success: true, newEnergy, message: `Energy set to ${newEnergy}.` };
        } else {
            // Delta mode
            state.updateEnergy(value, reason || 'AI adjusted energy');
            const newEnergy = Math.max(0, Math.min(100, state.resources.energy.current + value));
            return { success: true, newEnergy, message: `Energy adjusted by ${value}.` };
        }
    },
};

const getWorldState: ToolImplementation = {
    definition: {
        name: 'get_world_state',
        description: 'Get current world state snapshot including epoch, factions, and variables.',
        parameters: {
            type: 'OBJECT',
            properties: {},
        },
    },
    execute: async () => {
        const state = useGameStore.getState();
        return {
            epoch: state.worldState.epoch,
            lastEvolutionAt: state.worldState.lastEvolutionAt,
            factions: state.worldState.factions,
            worldVariables: state.worldState.worldVariables,
            activeWorldEvents: state.worldState.activeWorldEvents,
        };
    },
};

const getLoreProfile: ToolImplementation = {
    definition: {
        name: 'get_lore_profile',
        description: 'Get the user configured lore profile used by orchestra/world generation.',
        parameters: {
            type: 'OBJECT',
            properties: {},
        },
    },
    execute: async () => {
        const state = useGameStore.getState();
        return state.loreProfile;
    },
};

const setLoreProfile: ToolImplementation = {
    definition: {
        name: 'set_lore_profile',
        description: 'Update lore profile fields. Use this to align world narrative with user background.',
        parameters: {
            type: 'OBJECT',
            properties: {
                worldTheme: { type: 'STRING', description: 'World theme, e.g., "都市修仙", "现实冒险".' },
                playerArchetype: { type: 'STRING', description: 'Player archetype, e.g., "Builder", "Scholar".' },
                preferredTone: { type: 'STRING', enum: ['epic', 'grounded', 'playful'] },
                freeTextLore: { type: 'STRING', description: 'Free form lore description.' },
                taboos: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of narrative taboos.' },
            },
        },
    },
    execute: async ({ worldTheme, playerArchetype, preferredTone, freeTextLore, taboos }: {
        worldTheme?: string;
        playerArchetype?: string;
        preferredTone?: 'epic' | 'grounded' | 'playful';
        freeTextLore?: string;
        taboos?: string[];
    }) => {
        const state = useGameStore.getState();
        state.updateLoreProfile({
            ...(worldTheme !== undefined ? { worldTheme } : {}),
            ...(playerArchetype !== undefined ? { playerArchetype } : {}),
            ...(preferredTone !== undefined ? { preferredTone } : {}),
            ...(freeTextLore !== undefined ? { freeTextLore } : {}),
            ...(Array.isArray(taboos) ? { taboos: taboos.filter(Boolean).slice(0, 20) } : {}),
        });
        return { success: true, loreProfile: useGameStore.getState().loreProfile };
    },
};

const runOrchestrationCycle: ToolImplementation = {
    definition: {
        name: 'run_orchestration_cycle',
        description: 'Run orchestra evolution cycle and return latest orchestration log entry.',
        parameters: {
            type: 'OBJECT',
            properties: {
                trigger: {
                    type: 'STRING',
                    enum: ['manual', 'daily_review_saved', 'weekly_review_saved', 'quest_completed'],
                    description: 'Trigger type for this cycle.'
                },
                note: { type: 'STRING', description: 'Optional operator note.' },
            },
        },
    },
    execute: async ({ trigger = 'manual', note }: {
        trigger?: 'manual' | 'daily_review_saved' | 'weekly_review_saved' | 'quest_completed';
        note?: string;
    }) => {
        const state = useGameStore.getState();
        state.runOrchestrationCycle(trigger, note);
        return { success: true, latest: useGameStore.getState().orchestrationLog[0] || null };
    },
};



// ==================== Obsidian MCP Tools ====================
// These tools map to the obsidian-mcp package tools

const obsidianSearchVault: ToolImplementation = {
    definition: {
        name: 'search_vault',
        description: 'Search for notes in Obsidian vault by content or filename.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'The search query.' },
            },
            required: ['query'],
        },
    },
    execute: async ({ query }: { query: string }) => {
        try {
            if (!mcpClient.isAvailable()) {
                return { error: 'Obsidian Bridge is not connected. Run: npm run bridge:start' };
            }
            const searchResult = await mcpClient.callTool('search-vault', { query });

            // Fallback behavior: if model only calls search_vault, auto-read best match so the user still gets note content.
            const matchedPaths = new Set<string>();
            extractNotePathsFromUnknown(searchResult, matchedPaths);
            const candidates = Array.from(matchedPaths);
            if (candidates.length === 0) {
                return searchResult;
            }

            const target = withMdExtension(normalizeNotePath(query)).toLowerCase();
            const targetBase = getBaseName(query).toLowerCase();
            const ranked = candidates
                .map((candidate) => {
                    const normalized = normalizeNotePath(candidate);
                    const lower = normalized.toLowerCase();
                    const base = getBaseName(normalized).toLowerCase();
                    let score = 0;
                    if (lower === target) score += 100;
                    if (base === targetBase) score += 50;
                    if (lower.includes(targetBase)) score += 10;
                    return { path: normalized, score };
                })
                .sort((a, b) => b.score - a.score);

            const topCandidates = ranked.slice(0, 3);
            for (const item of topCandidates) {
                try {
                    const note = await tryReadNote(item.path);
                    return {
                        searchResult,
                        autoRead: {
                            resolvedPath: item.path,
                            note,
                        },
                    };
                } catch {
                    // try next candidate
                }
            }

            return {
                searchResult,
                autoRead: null,
                candidates: topCandidates.map((item) => item.path),
            };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return { error: `Search Failed: ${message}` };
        }
    },
};


async function tryReadNote(name: string): Promise<unknown> {
    return mcpClient.callTool('read-note', { name });
}

const obsidianReadNote: ToolImplementation = {
    definition: {
        name: 'read_note',
        description: 'Read the content of a specific note from Obsidian.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Path to the note file (e.g. "folder/note.md").' },
            },
            required: ['path'],
        },
    },
    execute: async ({ path }: { path: string }) => {
        const normalizedInput = normalizeNotePath(path);
        if (!normalizedInput) {
            return { error: 'Read Failed: path is required.' };
        }

        const directCandidates = Array.from(
            new Set([normalizedInput, withMdExtension(normalizedInput)])
        );

        try {
            if (!mcpClient.isAvailable()) {
                return { error: 'Obsidian Bridge is not connected.' };
            }

            // First try direct read (exact path and auto .md fallback).
            for (const candidate of directCandidates) {
                try {
                    const result = await tryReadNote(candidate);
                    return attachResolvedPath(result, candidate);
                } catch {
                    // Continue to vault search fallback.
                }
            }

            // Fallback: search by basename and resolve to best candidate path.
            const baseName = getBaseName(normalizedInput);
            const searchResult = await mcpClient.callTool('search-vault', { query: baseName });
            const matchedPaths = new Set<string>();
            extractNotePathsFromUnknown(searchResult, matchedPaths);
            const paths = Array.from(matchedPaths);
            if (paths.length === 0) {
                return {
                    error: `Read Failed: note "${path}" not found by direct path or vault search.`,
                    searchPreview: toDebugSnippet(searchResult),
                };
            }

            const targetMd = withMdExtension(normalizedInput).toLowerCase();
            const targetBase = getBaseName(normalizedInput).toLowerCase();

            const scored = paths
                .map((candidate) => {
                    const normalizedCandidate = normalizeNotePath(candidate);
                    const lowerCandidate = normalizedCandidate.toLowerCase();
                    const candidateBase = getBaseName(normalizedCandidate).toLowerCase();
                    let score = 0;
                    if (lowerCandidate === targetMd) score += 100;
                    if (candidateBase === targetBase) score += 50;
                    if (lowerCandidate.includes(targetBase)) score += 10;
                    return { candidate: normalizedCandidate, score };
                })
                .sort((a, b) => b.score - a.score);

            for (const item of scored) {
                try {
                    const result = await tryReadNote(item.candidate);
                    return attachResolvedPath(result, item.candidate);
                } catch {
                    // Try next candidate.
                }
            }

            return {
                error: `Read Failed: tried ${scored.length} candidate paths but none could be read.`,
                candidates: scored.slice(0, 5).map((item) => item.candidate),
            };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return { error: `Read Failed: ${message}` };
        }
    },
};

const obsidianCreateNote: ToolImplementation = {
    definition: {
        name: 'create_note',
        description: 'Create a new note in Obsidian.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Path for the new note (e.g. "folder/new-note.md").' },
                content: { type: 'STRING', description: 'Content for the new note.' },
            },
            required: ['path', 'content'],
        },
    },
    execute: async ({ path, content }: { path: string; content: string }) => {
        try {
            if (!mcpClient.isAvailable()) {
                return { error: 'Obsidian Bridge is not connected.' };
            }
            return await mcpClient.callTool('create-note', { name: path, content });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return { error: `Create Failed: ${message}` };
        }
    },
};

const obsidianEditNote: ToolImplementation = {
    definition: {
        name: 'edit_note',
        description: 'Edit an existing note in Obsidian.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Path to the note to edit.' },
                content: { type: 'STRING', description: 'New content for the note.' },
            },
            required: ['path', 'content'],
        },
    },
    execute: async ({ path, content }: { path: string; content: string }) => {
        try {
            if (!mcpClient.isAvailable()) {
                return { error: 'Obsidian Bridge is not connected.' };
            }
            return await mcpClient.callTool('edit-note', { name: path, content });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return { error: `Edit Failed: ${message}` };
        }
    },
};

const obsidianDeleteNote: ToolImplementation = {
    definition: {
        name: 'request_delete_note',
        description: 'Request to delete a note. This REQUIRES user confirmation before executing.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Path to the note to delete.' },
                reason: { type: 'STRING', description: 'Reason for deletion (for user to review).' },
            },
            required: ['path', 'reason'],
        },
    },
    execute: async ({ path, reason }: { path: string; reason: string }) => {
        // Don't actually delete - return a request for confirmation
        return {
            requiresConfirmation: true,
            action: 'delete_note',
            path,
            reason,
            message: `请确认是否删除笔记: ${path}\n原因: ${reason}`,
        };
    },
};

const obsidianManageTags: ToolImplementation = {
    definition: {
        name: 'manage_tags',
        description: 'List and manage tags in Obsidian vault.',
        parameters: {
            type: 'OBJECT',
            properties: {},
        },
    },
    execute: async () => {
        try {
            if (!mcpClient.isAvailable()) {
                return { error: 'Obsidian Bridge is not connected.' };
            }
            return await mcpClient.callTool('manage-tags', {});
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            return { error: `Tag Management Failed: ${message}` };
        }
    },
};

// --- Registry ---

export const toolsMap: Record<string, ToolImplementation> = {
    get_player_status: getPlayerStatus,
    get_tasks: getTasks,
    get_overdue_tasks: getOverdueTasks,
    add_task: addTask,
    update_task: updateTask,
    draft_task: draftTask,
    delete_task: deleteTask,
    update_gold: updateGoldCompat,
    record_income: recordIncome,
    record_expense: recordExpense,
    redeem_reward: redeemReward,
    update_energy: updateEnergy,
    get_world_state: getWorldState,
    get_lore_profile: getLoreProfile,
    set_lore_profile: setLoreProfile,
    run_orchestration_cycle: runOrchestrationCycle,
    // Obsidian tools (new obsidian-mcp)
    search_vault: obsidianSearchVault,
    read_note: obsidianReadNote,
    create_note: obsidianCreateNote,
    edit_note: obsidianEditNote,
    request_delete_note: obsidianDeleteNote,
    manage_tags: obsidianManageTags,
};

export const toolsList = Object.values(toolsMap).map(tool => tool.definition);

export async function executeTool(name: string, args: unknown) {
    const tool = toolsMap[name];
    if (!tool) {
        throw new Error(`Tool ${name} not found`);
    }
    try {
        const result = await tool.execute(args);
        return result;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown tool execution error';
        return { error: message };
    }
}
