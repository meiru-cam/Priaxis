/**
 * Progress Calculation Utilities
 * 
 * Functions for calculating progress across tasks, quests, and seasons
 * based on sub-task completion (Definition of Done).
 */

import type { CustomTask, MainQuest, Chapter, ChecklistItem } from '../types/task';

/**
 * Calculate task progress from its checklist (Definition of Done)
 * @returns Progress as 0-100
 */
export function getTaskProgress(task: CustomTask): number {
    // If no checklist, use simple completed status
    if (!task.checklist || task.checklist.length === 0) {
        return task.status === 'completed' ? 100 : 0;
    }

    const completed = task.checklist.filter((item: ChecklistItem) => item.completed).length;
    return Math.round((completed / task.checklist.length) * 100);
}

/**
 * Check if all checklist items are completed
 */
export function isChecklistComplete(checklist?: ChecklistItem[]): boolean {
    if (!checklist || checklist.length === 0) return false;
    return checklist.every(item => item.completed);
}

/**
 * Get checklist completion stats
 */
export function getChecklistStats(checklist?: ChecklistItem[]): {
    completed: number;
    total: number;
    percent: number;
} {
    if (!checklist || checklist.length === 0) {
        return { completed: 0, total: 0, percent: 0 };
    }

    const completed = checklist.filter(item => item.completed).length;
    const total = checklist.length;
    const percent = Math.round((completed / total) * 100);

    return { completed, total, percent };
}

/**
 * Calculate quest progress from linked tasks
 * @param quest The quest to calculate progress for
 * @param allTasks All tasks (to find linked ones)
 * @returns Progress as 0-100
 */
export function getQuestProgressFromTasks(
    quest: MainQuest,
    allTasks: CustomTask[]
): number {
    // Find tasks linked to this quest
    const linkedTasks = allTasks.filter(
        task => task.linkedQuestId === quest.id
    );

    if (linkedTasks.length === 0) {
        // Fall back to manual progress
        return quest.progress || 0;
    }

    // Calculate based on completed tasks
    const completedTasks = linkedTasks.filter(
        task => task.status === 'completed'
    ).length;

    return Math.round((completedTasks / linkedTasks.length) * 100);
}

/**
 * Calculate chapter progress from linked quests
 */
export function getChapterProgress(
    chapter: Chapter,
    quests: MainQuest[]
): number {
    if (!chapter.linkedQuests || chapter.linkedQuests.length === 0) {
        return chapter.progress || 0;
    }

    const linkedQuests = quests.filter(
        q => chapter.linkedQuests?.includes(q.id)
    );

    if (linkedQuests.length === 0) {
        return chapter.progress || 0;
    }

    // Average progress of all linked quests
    const totalProgress = linkedQuests.reduce(
        (sum, q) => sum + (q.progress || 0),
        0
    );

    return Math.round(totalProgress / linkedQuests.length);
}

/**
 * Get a human-readable progress label
 */
export function getProgressLabel(
    completed: number,
    total: number,
    unit: string = '项'
): string {
    if (total === 0) return '';
    return `${completed}/${total} ${unit}`;
}
