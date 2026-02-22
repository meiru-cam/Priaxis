import type { CustomTask } from '../types/task';

export function normalizeLoggedTimeToMinutes(raw?: number): number {
  if (!raw || raw <= 0) return 0;
  // Backward compatibility: historical entries <= 24 were stored as "hours".
  if (raw <= 24) return Math.round(raw * 60);
  return Math.round(raw);
}

export function getTaskFocusMinutes(task: Pick<CustomTask, 'actualCosts' | 'estimatedCosts' | 'pomodoroCount'>): number {
  const loggedMinutes = normalizeLoggedTimeToMinutes(task.actualCosts?.time || task.estimatedCosts?.time);
  const pomodoroMinutes = (task.pomodoroCount || 0) * 25;
  return Math.max(loggedMinutes, pomodoroMinutes);
}

export function sumTaskFocusMinutes(tasks: Array<Pick<CustomTask, 'actualCosts' | 'estimatedCosts' | 'pomodoroCount'>>): number {
  return tasks.reduce((sum, task) => sum + getTaskFocusMinutes(task), 0);
}
