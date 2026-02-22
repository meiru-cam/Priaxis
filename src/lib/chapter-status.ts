import type { Chapter, Status } from '../types/task';

export type ChapterDisplayStatus =
  | 'locked'
  | 'active'
  | 'paused'
  | 'completed'
  | 'overdue_unfinished'
  | 'overdue_completed';

type ChapterStatusInput = Pick<Chapter, 'status' | 'unlockTime' | 'deadline' | 'completedAt' | 'progress'>;

function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

function getEndOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

export function getChapterDisplayStatus(
  chapter: ChapterStatusInput,
  now: Date = new Date()
): ChapterDisplayStatus {
  if (chapter.status === 'paused') return 'paused';

  const unlockDate = parseLocalDate(chapter.unlockTime);
  if (unlockDate && now < unlockDate) return 'locked';

  const deadlineDate = parseLocalDate(chapter.deadline);
  const deadlineEnd = deadlineDate ? getEndOfDay(deadlineDate) : null;
  const isCompleted =
    chapter.status === 'completed' || chapter.progress >= 100;

  if (isCompleted) {
    if (deadlineEnd && chapter.completedAt) {
      const completedAt = new Date(chapter.completedAt);
      if (!Number.isNaN(completedAt.getTime()) && completedAt > deadlineEnd) {
        return 'overdue_completed';
      }
    }
    return 'completed';
  }

  if (deadlineEnd && now > deadlineEnd) {
    return 'overdue_unfinished';
  }

  return 'active';
}

export function getAutoChapterBaseStatus(
  chapter: ChapterStatusInput,
  now: Date = new Date()
): Status {
  if (chapter.status === 'paused') return 'paused';
  if (chapter.status === 'completed') return 'completed';
  const displayStatus = getChapterDisplayStatus(chapter, now);
  return displayStatus === 'locked' ? 'locked' : 'active';
}
