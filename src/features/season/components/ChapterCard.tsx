/**
 * ChapterCard Component
 * Individual chapter card within a season
 */

import styled, { css } from 'styled-components';
import { PixelProgressBar } from '../../../components/PixelProgressBar';
import type { Chapter } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { ChapterDisplayStatus } from '../../../lib/chapter-status';
import { getChapterEffectiveDisplayStatus } from '../../../lib/hierarchy-status';

interface ChapterCardProps {
  chapter: Chapter;
  seasonId: string;
  parentSeasonLocked?: boolean;
  onEdit: (chapter: Chapter) => void;
  onAddQuest: (chapterId: string) => void;
}

// Status style mapping
const statusConfig: Record<ChapterDisplayStatus, { icon: string; color: string }> = {
  active: { icon: '🟢', color: '#10b981' },
  paused: { icon: '⏸️', color: '#f59e0b' },
  completed: { icon: '✅', color: '#3b82f6' },
  locked: { icon: '🔒', color: '#9ca3af' },
  overdue_unfinished: { icon: '⚠️', color: '#ef4444' },
  overdue_completed: { icon: '🕘', color: '#f97316' },
};

const CardWrapper = styled.div<{ $status: ChapterDisplayStatus }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  position: relative;

  ${({ $status }) =>
    $status === 'locked' &&
    css`
      opacity: 0.6;
      filter: grayscale(30%);
    `}

  ${({ $status }) =>
    $status === 'completed' &&
    css`
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    `}

  ${({ $status }) =>
    $status === 'overdue_unfinished' &&
    css`
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    `}

  ${({ $status }) =>
    $status === 'overdue_completed' &&
    css`
      border-color: #f97316;
      background: rgba(249, 115, 22, 0.06);
    `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const ChapterOrder = styled.span`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.accent.purple};
  color: white;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
`;

const ChapterTitle = styled.h4`
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const StatusBadge = styled.span<{ $color: string }>`
  padding: 3px 8px;
  background: ${({ $color }) => `${$color}20`};
  border: 1px solid ${({ $color }) => $color};
  border-radius: 10px;
  font-size: 0.7rem;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

const Description = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 12px;
  line-height: 1.5;
`;

const ProgressSection = styled.div`
  margin-bottom: 12px;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 12px;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ theme, $variant }) =>
    $variant === 'primary'
      ? theme.colors.accent.purple
      : theme.colors.bg.tertiary};
  color: ${({ theme, $variant }) =>
    $variant === 'primary' ? 'white' : theme.colors.text.secondary};

  &:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LinkedQuestsCount = styled.span`
  padding: 2px 8px;
  background: ${({ theme }) => theme.colors.card.purple.bg};
  border: 1px solid ${({ theme }) => theme.colors.accent.purple};
  border-radius: 10px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

export function ChapterCard({
  chapter,
  parentSeasonLocked = false,
  onEdit,
  onAddQuest,
}: ChapterCardProps) {
  const { t } = useTranslation();
  const displayStatus = getChapterEffectiveDisplayStatus(chapter, { parentSeasonLocked });
  const status = statusConfig[displayStatus];
  const statusLabel = displayStatus === 'active'
    ? t('quest.status.active')
    : displayStatus === 'paused'
      ? t('quest.status.paused')
      : displayStatus === 'completed'
        ? t('quest.status.completed')
        : displayStatus === 'overdue_unfinished'
          ? t('chapter.status.overdue_unfinished')
          : displayStatus === 'overdue_completed'
            ? t('chapter.status.overdue_completed')
            : t('quest.status.locked');
  const linkedQuestsCount = chapter.linkedQuests?.length || 0;

  return (
    <CardWrapper $status={displayStatus}>
      <ChapterHeader>
        <ChapterOrder>{chapter.order}</ChapterOrder>
        <ChapterTitle onClick={() => onEdit(chapter)}>
          {chapter.title}
        </ChapterTitle>
        <StatusBadge $color={status.color}>
          {status.icon} {statusLabel}
        </StatusBadge>
      </ChapterHeader>

      {chapter.description && (
        <Description>{chapter.description}</Description>
      )}

      <ProgressSection>
        <PixelProgressBar
          value={linkedQuestsCount > 0
            ? Math.round(chapter.progress / 100 * linkedQuestsCount)
            : Math.round(chapter.progress / 10)}
          max={linkedQuestsCount > 0 ? linkedQuestsCount : 10}
          size="small"
          showLabel={true}
          label={linkedQuestsCount > 0
            ? t('season.chapter_card.progress_count', { done: Math.round(chapter.progress / 100 * linkedQuestsCount), total: linkedQuestsCount })
            : t('season.chapter_card.progress_percent', { progress: chapter.progress })}
        />
      </ProgressSection>

      <MetaRow>
        {chapter.deadline && (
          <MetaItem>
            {t('season.chapter_card.deadline', { date: chapter.deadline })}
          </MetaItem>
        )}
        {chapter.unlockTime && displayStatus === 'locked' && (
          <MetaItem>
            {t('season.chapter_card.unlock', { date: chapter.unlockTime })}
          </MetaItem>
        )}
        {linkedQuestsCount > 0 && (
          <LinkedQuestsCount>
            {t('season.chapter_card.linked_quests', { count: linkedQuestsCount })}
          </LinkedQuestsCount>
        )}
      </MetaRow>

      <ActionRow>
        <ActionButton
          onClick={() => onAddQuest(chapter.id)}
          disabled={displayStatus === 'locked'}
        >
          {t('quest.action.add_quest')}
        </ActionButton>
        <ActionButton $variant="primary" onClick={() => onEdit(chapter)}>
          {t('cmd.edit_chapter')}
        </ActionButton>
      </ActionRow>
    </CardWrapper>
  );
}

export default ChapterCard;
