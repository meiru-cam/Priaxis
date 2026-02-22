/**
 * Journal Store
 * 周回顾和每日成功日记的状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeeklyReview, DailySuccessEntry } from '../types/journal';
import { useGameStore } from './game-store';

// ==================== Store State ====================

interface JournalState {
    weeklyReviews: WeeklyReview[];
    dailySuccessJournal: DailySuccessEntry[];
}

interface JournalActions {
    // Weekly Reviews
    addWeeklyReview: (review: WeeklyReview) => void;
    updateWeeklyReview: (id: string, updates: Partial<WeeklyReview>) => void;
    deleteWeeklyReview: (id: string) => void;
    getWeeklyReviewByWeek: (weekStartDate: string) => WeeklyReview | undefined;

    // Daily Success Journal
    addDailyEntry: (entry: DailySuccessEntry) => void;
    updateDailyEntry: (id: string, updates: Partial<DailySuccessEntry>) => void;
    deleteDailyEntry: (id: string) => void;
    getDailyEntryByDate: (date: string) => DailySuccessEntry | undefined;
    getTodayEntry: () => DailySuccessEntry | undefined;

    // Data management
    exportJournalData: () => string;
    resetJournalData: () => void;
}

const initialState: JournalState = {
    weeklyReviews: [],
    dailySuccessJournal: [],
};

// ==================== Store Implementation ====================

export const useJournalStore = create<JournalState & JournalActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ========== Weekly Reviews ==========

            addWeeklyReview: (review) => {
                set((state) => ({
                    weeklyReviews: [review, ...state.weeklyReviews],
                }));
                useGameStore.getState().runOrchestrationCycle('weekly_review_saved', `week=${review.weekStartDate}`);
            },

            updateWeeklyReview: (id, updates) => {
                set((state) => ({
                    weeklyReviews: state.weeklyReviews.map((r) =>
                        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
                    ),
                }));
                useGameStore.getState().runOrchestrationCycle('weekly_review_saved', `weekly_review_updated=${id}`);
            },

            deleteWeeklyReview: (id) => {
                set((state) => ({
                    weeklyReviews: state.weeklyReviews.filter((r) => r.id !== id),
                }));
            },

            getWeeklyReviewByWeek: (weekStartDate) => {
                return get().weeklyReviews.find((r) => r.weekStartDate === weekStartDate);
            },

            // ========== Daily Success Journal ==========

            addDailyEntry: (entry) => {
                set((state) => ({
                    dailySuccessJournal: [entry, ...state.dailySuccessJournal],
                }));
                useGameStore.getState().runOrchestrationCycle('daily_review_saved', `date=${entry.date}`);
            },

            updateDailyEntry: (id, updates) => {
                set((state) => ({
                    dailySuccessJournal: state.dailySuccessJournal.map((e) =>
                        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
                    ),
                }));
                useGameStore.getState().runOrchestrationCycle('daily_review_saved', `daily_review_updated=${id}`);
            },

            deleteDailyEntry: (id) => {
                set((state) => ({
                    dailySuccessJournal: state.dailySuccessJournal.filter((e) => e.id !== id),
                }));
            },

            getDailyEntryByDate: (date) => {
                const dateStr = date.split('T')[0]; // 确保只比较日期部分
                return get().dailySuccessJournal.find((e) => e.date.split('T')[0] === dateStr);
            },

            getTodayEntry: () => {
                const today = new Date().toISOString().split('T')[0];
                return get().dailySuccessJournal.find((e) => e.date.split('T')[0] === today);
            },

            // ========== Data Management ==========

            exportJournalData: () => {
                const { weeklyReviews, dailySuccessJournal } = get();
                return JSON.stringify({ weeklyReviews, dailySuccessJournal }, null, 2);
            },

            resetJournalData: () => {
                set(initialState);
            },
        }),
        {
            name: 'earth-online-journal',
            partialize: (state) => ({
                weeklyReviews: state.weeklyReviews,
                dailySuccessJournal: state.dailySuccessJournal,
            }),
        }
    )
);

export default useJournalStore;
