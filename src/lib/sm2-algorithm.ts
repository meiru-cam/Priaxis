/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Implementation of the SuperMemo SM-2 algorithm for calculating
 * optimal review intervals based on user ratings.
 * 
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import type { FlashcardProgress } from '../types/flashcard';
import { DEFAULT_PROGRESS } from '../types/flashcard';

/**
 * Rating quality values for SM-2
 * - Hard: 0-2 (failure, needs immediate review)
 * - Good: 3 (correct with difficulty)
 * - Easy: 4-5 (perfect recall)
 */
const RATING_QUALITY = {
    hard: 2,
    good: 3,
    easy: 5,
};

/**
 * Minimum ease factor (prevents cards from becoming too difficult)
 */
const MIN_EASE = 1.3;

/**
 * Maximum ease factor
 */
const MAX_EASE = 3.0;

/**
 * Maximum interval in days (about 10 years)
 */
const MAX_INTERVAL = 3650;

/**
 * Calculate the next review date and updated progress
 */
export function calculateNextReview(
    progress: FlashcardProgress | undefined,
    rating: 'easy' | 'good' | 'hard'
): FlashcardProgress {
    const today = new Date().toISOString().split('T')[0];

    // Initialize with defaults if no progress exists
    if (!progress) {
        progress = {
            cardId: '', // Will be set by caller
            ...DEFAULT_PROGRESS,
        };
    }

    const quality = RATING_QUALITY[rating];
    let { ease, interval, repetitions } = progress;

    // If rating is "hard" (quality < 3), reset the card
    if (quality < 3) {
        // Reset: start over with shorter intervals
        repetitions = 0;
        interval = 1; // Review tomorrow
        ease = Math.max(MIN_EASE, ease - 0.2);
    } else {
        // Successful recall
        repetitions++;

        // Calculate new interval based on repetition number
        if (repetitions === 1) {
            interval = 1; // First success: 1 day
        } else if (repetitions === 2) {
            interval = 6; // Second success: 6 days
        } else {
            // Subsequent successes: interval * ease factor
            interval = Math.round(interval * ease);
        }

        // Apply ease bonus/penalty
        if (rating === 'easy') {
            // Easy: larger interval, increase ease
            interval = Math.round(interval * 1.3);
            ease = Math.min(MAX_EASE, ease + 0.15);
        } else if (rating === 'good') {
            // Good: slight ease increase
            ease = Math.min(MAX_EASE, ease + 0.05);
        }
    }

    // Cap interval
    interval = Math.min(interval, MAX_INTERVAL);
    interval = Math.max(interval, 1);

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
        cardId: progress.cardId,
        ease,
        interval,
        dueDate: dueDate.toISOString().split('T')[0],
        repetitions,
        lastRating: rating,
        lastReviewDate: today,
    };
}

/**
 * Check if a card is due for review
 */
export function isDueForReview(progress: FlashcardProgress | undefined): boolean {
    if (!progress) return true; // New card is always due

    const today = new Date().toISOString().split('T')[0];
    return progress.dueDate <= today;
}

/**
 * Get cards due for review today, sorted by priority
 * Priority: overdue first, then by interval (shorter = higher priority)
 */
export function getDueCards(
    cardIds: string[],
    progressMap: Record<string, FlashcardProgress>,
    limit: number
): string[] {
    const today = new Date().toISOString().split('T')[0];

    // Separate cards into categories
    const newCards: string[] = [];
    const dueCards: Array<{ id: string; priority: number }> = [];

    for (const cardId of cardIds) {
        const progress = progressMap[cardId];

        if (!progress) {
            newCards.push(cardId);
        } else if (progress.dueDate <= today) {
            // Calculate priority based on how overdue and interval
            const dueDate = new Date(progress.dueDate);
            const todayDate = new Date(today);
            const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            // Higher priority for: more overdue, shorter interval
            const priority = daysOverdue * 100 + (100 - Math.min(progress.interval, 100));

            dueCards.push({ id: cardId, priority });
        }
    }

    // Sort due cards by priority (descending)
    dueCards.sort((a, b) => b.priority - a.priority);

    // Combine: due cards first, then new cards
    const result = dueCards.map(c => c.id);

    // Add new cards up to limit
    const remaining = limit - result.length;
    if (remaining > 0) {
        result.push(...newCards.slice(0, remaining));
    }

    return result.slice(0, limit);
}

/**
 * Calculate statistics for progress data
 */
export function calculateStats(
    cardIds: string[],
    progressMap: Record<string, FlashcardProgress>
): {
    total: number;
    new: number;
    learning: number;
    mastered: number;
    dueToday: number;
} {
    const today = new Date().toISOString().split('T')[0];

    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;
    let dueToday = 0;

    for (const cardId of cardIds) {
        const progress = progressMap[cardId];

        if (!progress) {
            newCount++;
            dueToday++; // New cards are always available
        } else {
            // Learning: interval < 21 days
            // Mastered: interval >= 21 days
            if (progress.interval >= 21) {
                masteredCount++;
            } else {
                learningCount++;
            }

            if (progress.dueDate <= today) {
                dueToday++;
            }
        }
    }

    return {
        total: cardIds.length,
        new: newCount,
        learning: learningCount,
        mastered: masteredCount,
        dueToday,
    };
}

/**
 * Get the next interval preview for each rating
 * Useful for showing users what will happen with each choice
 */
export function getIntervalPreview(
    progress: FlashcardProgress | undefined
): { hard: number; good: number; easy: number } {
    const hardResult = calculateNextReview(progress, 'hard');
    const goodResult = calculateNextReview(progress, 'good');
    const easyResult = calculateNextReview(progress, 'easy');

    return {
        hard: hardResult.interval,
        good: goodResult.interval,
        easy: easyResult.interval,
    };
}

/**
 * Format interval for display
 */
export function formatInterval(days: number, language: 'zh' | 'en' = 'en'): string {
    if (language === 'zh') {
        if (days === 0) return '现在';
        if (days === 1) return '1天';
        if (days < 7) return `${days}天`;
        if (days < 30) {
            const weeks = Math.round(days / 7);
            return `${weeks}周`;
        }
        if (days < 365) {
            const months = Math.round(days / 30);
            return `${months}个月`;
        }
        const years = Math.round(days / 365);
        return `${years}年`;
    }

    if (days === 0) return 'Now';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) {
        const weeks = Math.round(days / 7);
        return weeks === 1 ? '1 week' : `${weeks} weeks`;
    }
    if (days < 365) {
        const months = Math.round(days / 30);
        return months === 1 ? '1 month' : `${months} months`;
    }
    const years = Math.round(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
}
