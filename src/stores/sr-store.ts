/**
 * Spaced Repetition Store
 * 
 * Manages state for the SR Tab including session tracking, XP rewards, and statistics.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { obsidianRest } from '../lib/obsidian-rest';
import { useGameStore } from './game-store';

interface SRStats {
    todayReviewed: number;
    totalReviewed: number;
    currentStreak: number;
    lastReviewDate: string | null;
}

interface SRStore {
    // Connection state
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;

    // Session state
    isReviewing: boolean;
    sessionCardsReviewed: number;

    // Stats
    stats: SRStats;

    // Actions
    checkConnection: () => Promise<boolean>;
    startReview: () => Promise<void>;
    endReview: () => void;
    recordReview: (rating: 'easy' | 'good' | 'hard') => Promise<void>;
    openReviewQueue: () => Promise<void>;
    openNoteForReview: () => Promise<void>;

    // XP Integration
    awardXP: (amount: number) => void;
}

// XP rewards for reviews
const XP_REWARDS = {
    easy: 15,
    good: 10,
    hard: 5,
    sessionComplete: 50, // Bonus for completing a session
};

export const useSRStore = create<SRStore>()(
    persist(
        (set, get) => ({
            // Initial state
            isConnected: false,
            isLoading: false,
            error: null,
            isReviewing: false,
            sessionCardsReviewed: 0,
            stats: {
                todayReviewed: 0,
                totalReviewed: 0,
                currentStreak: 0,
                lastReviewDate: null,
            },

            // Check Obsidian connection
            checkConnection: async () => {
                set({ isLoading: true, error: null });
                try {
                    const connected = await obsidianRest.checkConnection();
                    set({ isConnected: connected, isLoading: false });
                    if (!connected) {
                        set({ error: 'Cannot connect to Obsidian. Make sure Obsidian is running with Local REST API plugin enabled.' });
                    }
                    return connected;
                } catch (e: unknown) {
                    set({
                        isConnected: false,
                        isLoading: false,
                        error: e instanceof Error ? e.message : 'Unknown error',
                    });
                    return false;
                }
            },

            // Start a review session
            startReview: async () => {
                const { isConnected, checkConnection } = get();

                if (!isConnected) {
                    const connected = await checkConnection();
                    if (!connected) return;
                }

                set({ isReviewing: true, sessionCardsReviewed: 0, error: null });

                try {
                    await obsidianRest.srReviewAllFlashcards();
                } catch (e: unknown) {
                    set({
                        error: `Failed to start review: ${e instanceof Error ? e.message : 'Unknown error'}`,
                        isReviewing: false,
                    });
                }
            },

            // End review session
            endReview: () => {
                const { sessionCardsReviewed, awardXP } = get();

                // Award session completion bonus if reviewed any cards
                if (sessionCardsReviewed > 0) {
                    awardXP(XP_REWARDS.sessionComplete);
                }

                set({ isReviewing: false });
            },

            // Record a card review
            recordReview: async (rating) => {
                const { stats, awardXP } = get();
                const today = new Date().toISOString().split('T')[0];

                try {
                    // Execute the review command in Obsidian
                    if (rating === 'easy') {
                        await obsidianRest.srReviewEasy();
                    } else if (rating === 'good') {
                        await obsidianRest.srReviewGood();
                    } else {
                        await obsidianRest.srReviewHard();
                    }

                    // Update streak
                    let newStreak = stats.currentStreak;
                    if (stats.lastReviewDate !== today) {
                        // Check if this continues the streak (yesterday)
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];

                        if (stats.lastReviewDate === yesterdayStr) {
                            newStreak += 1;
                        } else if (stats.lastReviewDate !== today) {
                            newStreak = 1; // Reset streak
                        }
                    }

                    // Update stats
                    set(state => ({
                        sessionCardsReviewed: state.sessionCardsReviewed + 1,
                        stats: {
                            ...state.stats,
                            todayReviewed: stats.lastReviewDate === today
                                ? state.stats.todayReviewed + 1
                                : 1,
                            totalReviewed: state.stats.totalReviewed + 1,
                            currentStreak: newStreak,
                            lastReviewDate: today,
                        },
                    }));

                    // Award XP
                    awardXP(XP_REWARDS[rating]);

                } catch (e: unknown) {
                    set({ error: `Review failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
                }
            },

            // Open review queue in Obsidian
            openReviewQueue: async () => {
                try {
                    await obsidianRest.srOpenReviewQueue();
                } catch (e: unknown) {
                    set({ error: `Failed to open queue: ${e instanceof Error ? e.message : 'Unknown error'}` });
                }
            },

            // Open a note for review
            openNoteForReview: async () => {
                try {
                    await obsidianRest.srOpenNoteForReview();
                } catch (e: unknown) {
                    set({ error: `Failed to open note: ${e instanceof Error ? e.message : 'Unknown error'}` });
                }
            },

            // Award XP via game store
            awardXP: (amount) => {
                const gameStore = useGameStore.getState();
                if (gameStore.addExperience) {
                    gameStore.addExperience(amount);
                    console.log(`[SR] Awarded ${amount} XP`);
                }
            },
        }),
        {
            name: 'sr-storage',
            partialize: (state) => ({ stats: state.stats }),
        }
    )
);
