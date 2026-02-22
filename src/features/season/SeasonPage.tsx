/**
 * SeasonPage Component
 * Main page for season (主线) management
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useGameStore } from '../../stores';
import { Button, ConfirmModal } from '../../components/ui';
import { SeasonCard } from './components/SeasonCard';
import { SeasonWizardModal } from './components/SeasonWizardModal';
import { ChapterFormModal } from './components/ChapterFormModal';
import { ChapterReviewModal, type ChapterReviewData } from './components/ChapterReviewModal';
import { QuestFormModal } from '../quest/components/QuestFormModal';
import type { Season, Chapter, MainQuest } from '../../types/task';
import { getEffectiveSeasonStatus } from '../../lib/hierarchy-status';
import { createPrefixedId } from '../../lib/id';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const PageTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active: boolean; $color?: string }>`
  padding: 8px 16px;
  border: 1px solid ${({ theme, $active, $color }) =>
    $active ? ($color || theme.colors.accent.purple) : theme.colors.border.secondary};
  border-radius: 20px;
  background: ${({ $active, $color }) =>
    $active ? `${$color || 'rgba(139, 92, 246)'}20` : 'transparent'};
  color: ${({ theme, $active, $color }) =>
    $active ? ($color || theme.colors.accent.purple) : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    border-color: ${({ $color, theme }) => $color || theme.colors.accent.purple};
  }
`;

const SeasonsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 16px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  margin: 0 0 20px;
  font-size: 1.1rem;
`;

const HistorySection = styled.section`
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const HistoryTitle = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

import { CategoryManagerModal } from './components/CategoryManagerModal';

type FilterType = string;

export function SeasonPage() {
  // Store state
  const activeSeasons = useGameStore((s) => s.activeSeasons);
  const seasonHistory = useGameStore((s) => s.seasonHistory);
  const categories = useGameStore((s) => s.categories);
  const mainQuests = useGameStore((s) => s.mainQuests);

  // Store actions
  const addSeason = useGameStore((s) => s.addSeason);
  const updateSeason = useGameStore((s) => s.updateSeason);
  const addQuest = useGameStore((s) => s.addQuest);

  // Local state
  const [filter, setFilter] = useState<FilterType>('all');
  const [showHistory, setShowHistory] = useState(false);

  // Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<{ chapter: Chapter | null; seasonId: string } | null>(null);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [questLinkInfo, setQuestLinkInfo] = useState<{ chapterId: string; seasonId: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSeasonId, setDeletingSeasonId] = useState<string | null>(null);
  const [isChapterReviewOpen, setIsChapterReviewOpen] = useState(false);
  const [reviewingChapter, setReviewingChapter] = useState<{ seasonId: string; chapter: Chapter } | null>(null);
  const seenCompletedChapterIdsRef = useRef<Set<string>>(new Set());
  const completionTrackerInitializedRef = useRef(false);

  const { t } = useTranslation();

  // Category manager state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const addCategory = useGameStore((s) => s.addCategory);
  const updateCategory = useGameStore((s) => s.updateCategory);
  const deleteCategory = useGameStore((s) => s.deleteCategory);

  // Calculate stats
  const totalSeasons = activeSeasons.length;
  const totalChapters = activeSeasons.reduce((sum, s) => sum + s.chapters.length, 0);
  const completedChapters = activeSeasons.reduce(
    (sum, s) => sum + s.chapters.filter((ch) => ch.status === 'completed').length,
    0
  );
  const totalXP = activeSeasons.reduce((sum, s) => sum + (s.experience || 0), 0);

  // Filter seasons
  const filteredSeasons = activeSeasons.filter((season) => {
    if (filter === 'all') return true;
    return season.category === filter;
  });

  const linkedQuestsForReview = useMemo(() => {
    if (!reviewingChapter) return [];
    return mainQuests.filter(
      (q) => q.seasonId === reviewingChapter.seasonId && q.linkedChapterId === reviewingChapter.chapter.id
    );
  }, [mainQuests, reviewingChapter]);

  useEffect(() => {
    const completedChapters = activeSeasons.flatMap((season) =>
      season.chapters
        .filter((chapter) => chapter.status === 'completed')
        .map((chapter) => ({ seasonId: season.id, chapter }))
    );

    if (!completionTrackerInitializedRef.current) {
      seenCompletedChapterIdsRef.current = new Set(completedChapters.map((item) => item.chapter.id));
      completionTrackerInitializedRef.current = true;
      return;
    }

    const newlyCompleted = completedChapters.find(
      (item) =>
        !seenCompletedChapterIdsRef.current.has(item.chapter.id) &&
        !item.chapter.review
    );

    completedChapters.forEach((item) => seenCompletedChapterIdsRef.current.add(item.chapter.id));

    if (newlyCompleted && !isChapterReviewOpen) {
      setReviewingChapter(newlyCompleted);
      setIsChapterReviewOpen(true);
    }
  }, [activeSeasons, isChapterReviewOpen]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingSeason(null);
    setIsWizardOpen(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setIsWizardOpen(true);
  };

  const handleWizardSubmit = (seasonData: Partial<Season>) => {
    if (editingSeason) {
      updateSeason(editingSeason.id, seasonData);
    } else {
      addSeason(seasonData as Omit<Season, 'id' | 'createdAt'>);
    }
  };

  const handleEditChapter = (chapter: Chapter, seasonId: string) => {
    setEditingChapter({ chapter, seasonId });
    setIsChapterModalOpen(true);
  };

  const handleAddChapter = (seasonId: string) => {
    setEditingChapter({ chapter: null, seasonId });
    setIsChapterModalOpen(true);
  };

  const handleChapterSubmit = useCallback((chapterData: Partial<Chapter>) => {
    if (!editingChapter) return;

    const season = activeSeasons.find((s) => s.id === editingChapter.seasonId);
    if (!season) return;

    let updatedChapters: Chapter[];

    if (editingChapter.chapter) {
      // Update existing chapter
      updatedChapters = season.chapters.map((ch) =>
        ch.id === editingChapter.chapter!.id ? { ...ch, ...chapterData } : ch
      );
    } else {
      // Add new chapter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let newChapterStatus: Chapter['status'] = 'active';
      if (getEffectiveSeasonStatus(season) === 'locked') {
        newChapterStatus = 'locked';
      }
      if (chapterData.unlockTime) {
        const match = chapterData.unlockTime.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          const unlockDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
          unlockDate.setHours(0, 0, 0, 0);
          if (unlockDate > today) {
            newChapterStatus = 'locked';
          }
        }
      }
      const newChapter: Chapter = {
        id: createPrefixedId('ch', 9),
        title: chapterData.title || '',
        description: chapterData.description,
        order: season.chapters.length + 1,
        progress: 0,
        status: chapterData.status || newChapterStatus,
        deadline: chapterData.deadline,
        unlockTime: chapterData.unlockTime,
      };
      updatedChapters = [...season.chapters, newChapter];
    }

    updateSeason(editingChapter.seasonId, { chapters: updatedChapters });
  }, [editingChapter, activeSeasons, updateSeason]);

  const handleAddQuestToChapter = (chapterId: string, seasonId: string) => {
    setQuestLinkInfo({ chapterId, seasonId });
    setIsQuestModalOpen(true);
  };

  const handleQuestSubmit = (questData: Partial<MainQuest>) => {
    if (questLinkInfo) {
      addQuest({
        ...questData,
        linkedChapterId: questLinkInfo.chapterId,
        seasonId: questLinkInfo.seasonId,
      } as Omit<MainQuest, 'id' | 'createdAt'>);
    }
    setQuestLinkInfo(null);
  };

  const handleConfirmDelete = () => {
    if (deletingSeasonId) {
      // Move to history instead of deleting
      const season = activeSeasons.find((s) => s.id === deletingSeasonId);
      if (season) {
        updateSeason(deletingSeasonId, { status: 'archived' });
      }
      setDeletingSeasonId(null);
    }
    setIsDeleteModalOpen(false);
  };

  const handleChapterReviewSubmit = useCallback((reviewData: ChapterReviewData) => {
    if (!reviewingChapter) return;
    const season = activeSeasons.find((s) => s.id === reviewingChapter.seasonId);
    if (!season) return;

    const updatedChapters = season.chapters.map((chapter) =>
      chapter.id === reviewData.chapterId
        ? {
          ...chapter,
          review: reviewData.review || undefined,
          reviewSatisfaction: reviewData.satisfaction,
          completedAt: chapter.completedAt || new Date().toISOString(),
        }
        : chapter
    );

    updateSeason(reviewingChapter.seasonId, { chapters: updatedChapters });
  }, [activeSeasons, reviewingChapter, updateSeason]);



  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          📜 {t('season.title')}
        </PageTitle>

        <HeaderActions>
          <Button variant="secondary" onClick={() => setIsCategoryManagerOpen(true)}>
            🏷️ {t('season.manage_categories')}
          </Button>
          <Button onClick={handleOpenAddModal}>
            ➕ {t('season.create_btn')}
          </Button>
        </HeaderActions>
      </PageHeader>

      <StatsRow>
        <StatCard>
          <StatValue>{totalSeasons}</StatValue>
          <StatLabel>{t('season.stat_active')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{completedChapters}/{totalChapters}</StatValue>
          <StatLabel>{t('season.stat_chapters_completed')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{totalXP}</StatValue>
          <StatLabel>{t('season.stat_total_xp')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{seasonHistory.length}</StatValue>
          <StatLabel>{t('season.stat_history')}</StatLabel>
        </StatCard>
      </StatsRow>

      <FilterBar>
        <FilterButton
          $active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          {t('season.filter_all')}
        </FilterButton>
        {categories.map((cat) => (
          <FilterButton
            key={cat.id}
            $active={filter === cat.id}
            $color={cat.color}
            onClick={() => setFilter(cat.id)}
          >
            {cat.icon} {cat.name}
          </FilterButton>
        ))}
      </FilterBar>

      {filteredSeasons.length > 0 ? (
        <SeasonsList>
          {filteredSeasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              onEdit={handleEditSeason}
              onEditChapter={handleEditChapter}
              onAddChapter={handleAddChapter}
              onAddQuest={handleAddQuestToChapter}
            />
          ))}
        </SeasonsList>
      ) : (
        <EmptyState>
          <EmptyIcon>🌟</EmptyIcon>
          <EmptyText>
            {filter === 'all'
              ? t('season.empty_all')
              : `${categories.find((c) => c.id === filter)?.name || filter} ${t('season.empty_category')}`}
          </EmptyText>
          <Button onClick={handleOpenAddModal}>
            ➕ {t('season.create_first_btn')}
          </Button>
        </EmptyState>
      )}

      <HistorySection>
        <HistoryHeader>
          <HistoryTitle>
            📚 {t('season.history_title')} ({seasonHistory.length})
          </HistoryTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? t('season.hide_btn') : t('season.show_btn')}
          </Button>
        </HistoryHeader>

        {showHistory && seasonHistory.length > 0 && (
          <SeasonsList>
            {seasonHistory.map((season) => (
              <SeasonCard
                key={season.id}
                season={season}
                onEdit={() => { }}
                onEditChapter={() => { }}
                onAddChapter={() => { }}
                onAddQuest={() => { }}
              />
            ))}
          </SeasonsList>
        )}
      </HistorySection>

      {/* Modals */}
      <SeasonWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        season={editingSeason}
        categories={categories}
      />

      <ChapterFormModal
        isOpen={isChapterModalOpen}
        onClose={() => {
          setIsChapterModalOpen(false);
          setEditingChapter(null);
        }}
        onSubmit={handleChapterSubmit}
        chapter={editingChapter?.chapter}
      />

      <QuestFormModal
        isOpen={isQuestModalOpen}
        onClose={() => {
          setIsQuestModalOpen(false);
          setQuestLinkInfo(null);
        }}
        onSubmit={handleQuestSubmit}
        seasons={activeSeasons}
        initialChapterId={questLinkInfo?.chapterId}
        initialSeasonId={questLinkInfo?.seasonId}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('season.delete_title')}
        message={t('season.delete_confirm')}
        confirmText={t('season.delete_btn')}
        variant="danger"
      />

      <ChapterReviewModal
        isOpen={isChapterReviewOpen}
        onClose={() => {
          setIsChapterReviewOpen(false);
          setReviewingChapter(null);
        }}
        onSubmit={handleChapterReviewSubmit}
        chapter={reviewingChapter?.chapter || null}
        linkedQuests={linkedQuestsForReview}
      />

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />
    </PageContainer>
  );
}

export default SeasonPage;
