import type { Chapter, MainQuest, Season, Status } from '../types/task';
import { getChapterDisplayStatus, type ChapterDisplayStatus } from './chapter-status';

function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

export function isDateInFuture(dateStr?: string, now: Date = new Date()): boolean {
  const date = parseLocalDate(dateStr);
  if (!date) return false;
  const nowDate = new Date(now);
  nowDate.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date > nowDate;
}

export function getEffectiveSeasonStatus(season: Pick<Season, 'status' | 'startDate'>, now: Date = new Date()): Status {
  if (season.status === 'completed' || season.status === 'archived') {
    return season.status;
  }
  if (isDateInFuture(season.startDate, now)) {
    return 'locked';
  }
  if (season.status === 'paused') {
    return 'paused';
  }
  return 'active';
}

export function getChapterEffectiveDisplayStatus(
  chapter: Pick<Chapter, 'status' | 'unlockTime' | 'deadline' | 'completedAt' | 'progress'>,
  opts: { parentSeasonLocked?: boolean; now?: Date } = {}
): ChapterDisplayStatus {
  const baseStatus = getChapterDisplayStatus(chapter, opts.now);
  if (baseStatus === 'completed' || baseStatus === 'overdue_completed') {
    return baseStatus;
  }
  if (opts.parentSeasonLocked) {
    return 'locked';
  }
  return baseStatus;
}

export function getEffectiveQuestStatus(
  quest: Pick<MainQuest, 'status' | 'unlockTime' | 'linkedChapterId' | 'seasonId'>,
  seasons: Season[] = [],
  now: Date = new Date()
): Status {
  if (quest.status === 'completed' || quest.status === 'archived') {
    return quest.status;
  }

  const season = quest.seasonId ? seasons.find((s) => s.id === quest.seasonId) : undefined;
  const parentSeasonStatus = season ? getEffectiveSeasonStatus(season, now) : undefined;
  const parentSeasonLocked = parentSeasonStatus === 'locked';
  if (parentSeasonLocked) {
    return 'locked';
  }

  if (quest.linkedChapterId) {
    const chapterSeason = season || seasons.find((s) => s.chapters.some((ch) => ch.id === quest.linkedChapterId));
    const chapter = chapterSeason?.chapters.find((ch) => ch.id === quest.linkedChapterId);
    if (chapter) {
      const chapterDisplayStatus = getChapterEffectiveDisplayStatus(chapter, {
        parentSeasonLocked: chapterSeason ? getEffectiveSeasonStatus(chapterSeason, now) === 'locked' : false,
        now,
      });
      if (chapterDisplayStatus === 'locked') {
        return 'locked';
      }
    }
  }

  if (isDateInFuture(quest.unlockTime, now)) {
    return 'locked';
  }

  if (quest.status === 'paused') {
    return 'paused';
  }

  return 'active';
}

