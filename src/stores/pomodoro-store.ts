/**
 * Pomodoro Store - Timer state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Default pomodoro duration: 25 minutes
const POMODORO_DURATION_SECONDS = 25 * 60;

interface PomodoroState {
  // Timer state
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;

  // Linked task
  linkedTaskId: string | null;
  linkedTaskName: string | null;

  // Timestamps
  startTime: number | null;
  endTime: number | null;

  // Statistics
  completedToday: number;
  totalCompleted: number;
  lastPomodoroDate: string;
}

interface PomodoroActions {
  // Timer controls
  start: (taskId?: string, taskName?: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  complete: () => void;
  tick: () => void;

  // Timer configuration
  setDuration: (minutes: number) => void;

  // Task linking
  setLinkedTask: (taskId: string, taskName: string) => void;
  clearLinkedTask: () => void;

  // State recovery
  recoverState: () => void;
}

type PomodoroStore = PomodoroState & PomodoroActions;

const initialState: PomodoroState = {
  timeLeft: POMODORO_DURATION_SECONDS,
  totalTime: POMODORO_DURATION_SECONDS,
  isRunning: false,
  linkedTaskId: null,
  linkedTaskName: null,
  startTime: null,
  endTime: null,
  completedToday: 0,
  totalCompleted: 0,
  lastPomodoroDate: new Date().toDateString(),
};

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: (taskId, taskName) => {
        const now = Date.now();
        let { timeLeft, totalTime } = get();

        // Auto-reset if starting with 0 time
        if (timeLeft <= 0) {
          if (totalTime <= 0) {
            totalTime = POMODORO_DURATION_SECONDS;
            set({ totalTime }); // Ensure totalTime is valid in store
          }
          timeLeft = totalTime;
        }

        set({
          timeLeft, // Ensure state reflects the reset time
          isRunning: true,
          startTime: now,
          endTime: now + timeLeft * 1000,
          linkedTaskId: taskId || get().linkedTaskId,
          linkedTaskName: taskName || get().linkedTaskName,
        });
      },

      pause: () => {
        set({
          isRunning: false,
          startTime: null,
          endTime: null,
        });
      },

      resume: () => {
        const now = Date.now();
        const { timeLeft } = get();

        set({
          isRunning: true,
          startTime: now,
          endTime: now + timeLeft * 1000,
        });
      },

      reset: () => {
        set({
          timeLeft: get().totalTime,
          isRunning: false,
          startTime: null,
          endTime: null,
          linkedTaskId: null,
          linkedTaskName: null,
        });
      },

      complete: () => {
        const today = new Date().toDateString();
        const state = get();

        set({
          timeLeft: state.totalTime,
          isRunning: false,
          startTime: null,
          endTime: null,
          // Do not clear linked task - allow user to continue working on it
          // linkedTaskId: null,
          // linkedTaskName: null,
          completedToday:
            state.lastPomodoroDate === today ? state.completedToday + 1 : 1,
          totalCompleted: state.totalCompleted + 1,
          lastPomodoroDate: today,
        });
      },

      tick: () => {
        const { isRunning, timeLeft } = get();
        if (!isRunning) return;

        const newTimeLeft = Math.max(0, timeLeft - 1);
        set({ timeLeft: newTimeLeft });

        if (newTimeLeft === 0) {
          // Stop running but don't auto-complete. 
          // Let the UI handle the completion event to avoid race conditions.
          set({ isRunning: false, endTime: null });
        }
      },

      setDuration: (minutes) => {
        const seconds = minutes * 60;
        set({
          totalTime: seconds,
          timeLeft: seconds,
        });
      },

      setLinkedTask: (taskId, taskName) => {
        set({ linkedTaskId: taskId, linkedTaskName: taskName });
      },

      clearLinkedTask: () => {
        set({ linkedTaskId: null, linkedTaskName: null });
      },

      recoverState: () => {
        const { isRunning, endTime } = get();

        if (isRunning && endTime) {
          const now = Date.now();
          const remainingMs = endTime - now;

          if (remainingMs <= 0) {
            // Timer has completed while away
            // Set timeLeft to 0 and stop running, but DON'T call complete() here.
            // Let the UI's useEffect detect this and call handlePomodoroComplete
            // to properly update both stats AND the linked task's pomodoroCount.
            set({ timeLeft: 0, isRunning: false, endTime: null });
          } else {
            // Update time left
            set({ timeLeft: Math.ceil(remainingMs / 1000) });
          }
        }

        // Check daily reset
        const today = new Date().toDateString();
        const { lastPomodoroDate } = get();

        if (lastPomodoroDate !== today) {
          set({
            completedToday: 0,
            lastPomodoroDate: today,
          });
        }
      },
    }),
    {
      name: 'pomodoroState',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        timeLeft: state.timeLeft,
        totalTime: state.totalTime,
        isRunning: state.isRunning,
        linkedTaskId: state.linkedTaskId,
        linkedTaskName: state.linkedTaskName,
        startTime: state.startTime,
        endTime: state.endTime,
        completedToday: state.completedToday,
        totalCompleted: state.totalCompleted,
        lastPomodoroDate: state.lastPomodoroDate,
      }),
    }
  )
);

// Utility hooks
export const usePomodoroTime = () => {
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return {
    timeLeft,
    minutes,
    seconds,
    formatted: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
};

export const usePomodoroProgress = () => {
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const totalTime = usePomodoroStore((s) => s.totalTime);

  return {
    progress: ((totalTime - timeLeft) / totalTime) * 100,
    remaining: (timeLeft / totalTime) * 100,
  };
};
