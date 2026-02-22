/**
 * SeasonCard Component
 * Season overview card with progress, stats, and chapter list
 */

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { ChapterCard } from './ChapterCard';
import { PixelProgressBar } from '../../../components/PixelProgressBar';
import type { Season, Chapter, Status } from '../../../types/task';
import { getEffectiveSeasonStatus, getChapterEffectiveDisplayStatus } from '../../../lib/hierarchy-status';

interface SeasonCardProps {
  season: Season;
  onEdit: (season: Season) => void;
  onEditChapter: (chapter: Chapter, seasonId: string) => void;
  onAddChapter: (seasonId: string) => void;
  onAddQuest: (chapterId: string, seasonId: string) => void;
}



// Category colors
const categoryColors: Record<string, string> = {
  work: '#3b82f6',
  study: '#10b981',
  life: '#f59e0b',
  health: '#ef4444',
  hobby: '#8b5cf6',
};

const CardWrapper = styled.div<{ $category: string; $status: Status }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;

  ${({ $status }) =>
    $status === 'completed' &&
    css`
      opacity: 0.8;
    `}
`;

const SeasonHeader = styled.div<{ $color: string }>`
  background: linear-gradient(135deg, ${({ $color }) => $color}20, ${({ $color }) => $color}10);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  padding: 20px;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`;

const SeasonInfo = styled.div`
  flex: 1;
`;

const CategoryBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 4px 10px;
  background: ${({ $color }) => $color};
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 8px;
`;

const SeasonTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const SeasonDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const StatusBadge = styled.span<{ $color: string }>`
  padding: 6px 12px;
  background: ${({ $color }) => `${$color}20`};
  border: 1px solid ${({ $color }) => $color};
  border-radius: 12px;
  font-size: 0.8rem;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

const ProgressSection = styled.div`
  margin-top: 16px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: 8px;
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`;

const ChaptersSection = styled.div`
  padding: 20px;
`;

const ChaptersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ChaptersTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const AddChapterButton = styled.button`
  padding: 6px 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    color: ${({ theme }) => theme.colors.accent.purple};
    background: rgba(139, 92, 246, 0.05);
  }
`;

const ChaptersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ExpandButton = styled.button<{ $expanded: boolean }>`
  width: 100%;
  padding: 12px;
  border: none;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  &::after {
    content: '${({ $expanded }) => ($expanded ? '▲' : '▼')}';
    margin-left: 8px;
    font-size: 0.7rem;
  }
`;



// Calculate season level from experience
function calculateLevel(experience: number): number {
  // Simple level calculation: 100 XP per level
  return Math.floor(experience / 100) + 1;
}

import { useTranslation } from '../../../lib/i18n/useTranslation';

export function SeasonCard({
  season,
  onEdit,
  onEditChapter,
  onAddChapter,
  onAddQuest,
}: SeasonCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  // Status style mapping
  const statusConfig: Record<Status, { icon: string; label: string; color: string }> = {
    active: { icon: '🟢', label: t('quest.status.active'), color: '#10b981' },
    paused: { icon: '⏸️', label: t('quest.status.paused'), color: '#f59e0b' },
    completed: { icon: '✅', label: t('quest.status.completed'), color: '#3b82f6' },
    archived: { icon: '📦', label: t('quest.status.archived'), color: '#6b7280' },
    locked: { icon: '🔒', label: t('quest.status.locked'), color: '#9ca3af' },
  };

  const effectiveSeasonStatus = getEffectiveSeasonStatus(season);
  const status = statusConfig[effectiveSeasonStatus];
  const categoryColor = categoryColors[season.category] || '#8b5cf6';
  const chapters = season.chapters || [];
  const parentSeasonLocked = effectiveSeasonStatus === 'locked';

  const experience = season.experience || 0;
  const level = calculateLevel(experience);

  // Sort chapters by order
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  // Calculate stats
  const completedChapters = chapters.filter((ch) => ch.status === 'completed').length;
  const activeChapters = chapters.filter(
    (ch) => getChapterEffectiveDisplayStatus(ch, { parentSeasonLocked }) === 'active'
  ).length;

  return (
    <CardWrapper $category={season.category} $status={effectiveSeasonStatus}>
      <SeasonHeader $color={categoryColor}>
        <HeaderTop>
          <SeasonInfo>
            <CategoryBadge $color={categoryColor}>
              {season.category === 'work' && `💼 ${t('season.category.work')}`}
              {season.category === 'study' && `📚 ${t('season.category.study')}`}
              {season.category === 'life' && `🏠 ${t('season.category.life')}`}
              {season.category === 'health' && `💪 ${t('season.category.health')}`}
              {season.category === 'hobby' && `🎨 ${t('season.category.hobby')}`}
            </CategoryBadge>
            <SeasonTitle onClick={() => onEdit(season)}>
              {season.name}
            </SeasonTitle>
            {season.description && (
              <SeasonDescription>{season.description}</SeasonDescription>
            )}
          </SeasonInfo>
          <StatusBadge $color={status.color}>
            {status.icon} {status.label}
          </StatusBadge>
        </HeaderTop>

        <ProgressSection>
          <PixelProgressBar
            value={completedChapters}
            max={chapters.length || 1}
            size="small"
            showLabel={true}
            label={`${t('season.label.progress')} ${completedChapters}/${chapters.length}`}
          />
        </ProgressSection>

        <StatsGrid>
          <StatItem>
            <StatValue>Lv.{level}</StatValue>
            <StatLabel>{t('season.label.level')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{experience}</StatValue>
            <StatLabel>{t('season.label.xp')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{completedChapters}/{chapters.length}</StatValue>
            <StatLabel>{t('season.label.chapters_completed')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{activeChapters}</StatValue>
            <StatLabel>{t('season.label.active_chapters')}</StatLabel>
          </StatItem>
        </StatsGrid>
      </SeasonHeader>

      <ChaptersSection>
        <ChaptersHeader>
          <ChaptersTitle>📖 {t('season.label.chapters')} ({chapters.length})</ChaptersTitle>
          <AddChapterButton onClick={() => onAddChapter(season.id)}>
            ➕ {t('season.btn_add_chapter_short')}
          </AddChapterButton>
        </ChaptersHeader>

        {chapters.length > 0 ? (
          <>
            {isExpanded && (
              <ChaptersList>
                {sortedChapters.map((chapter) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    seasonId={season.id}
                    parentSeasonLocked={parentSeasonLocked}
                    onEdit={(ch) => onEditChapter(ch, season.id)}
                    onAddQuest={(chapterId) => onAddQuest(chapterId, season.id)}
                  />
                ))}
              </ChaptersList>
            )}
            <ExpandButton
              $expanded={isExpanded}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? t('season.action.collapse') : `${t('season.action.expand')} (${chapters.length})`}
            </ExpandButton>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            {t('season.empty_chapters')}
          </div>
        )}
      </ChaptersSection>
    </CardWrapper>
  );
}

export default SeasonCard;
