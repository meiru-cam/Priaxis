/**
 * QuestPage Component
 * Main page for quest (副本) management
 */

import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useGameStore } from '../../stores';
import { Button, ConfirmModal } from '../../components/ui';
import { QuestList } from './components/QuestList';
import { QuestFormModal } from './components/QuestFormModal';
import { QuestReviewModal, type QuestReviewData } from './components/QuestReviewModal';
import { TaskFormModal } from '../daily/components/TaskFormModal';
import type { MainQuest, Status, CustomTask, Importance } from '../../types/task';
import { getEffectiveQuestStatus } from '../../lib/hierarchy-status';

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

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 20px;
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const ArchivedSection = styled.section`
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ArchivedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ArchivedTitle = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

type FilterType = 'all' | 'high' | 'medium' | 'low';

export function QuestPage() {
  // Store state
  const mainQuests = useGameStore((s) => s.mainQuests);
  const archivedMainQuests = useGameStore((s) => s.archivedMainQuests);
  const activeSeasons = useGameStore((s) => s.activeSeasons);
  const customTasks = useGameStore((s) => s.customTasks);
  const archivedTasks = useGameStore((s) => s.archivedTasks);

  // Store actions
  const addQuest = useGameStore((s) => s.addQuest);
  const updateQuest = useGameStore((s) => s.updateQuest);
  const deleteQuest = useGameStore((s) => s.deleteQuest);
  const archiveQuest = useGameStore((s) => s.archiveQuest);
  const unarchiveQuest = useGameStore((s) => s.unarchiveQuest);
  const updateArchivedQuest = useGameStore((s) => s.updateArchivedQuest);
  const addTask = useGameStore((s) => s.addTask);
  const updateTask = useGameStore((s) => s.updateTask);

  // Local state
  const [filter, setFilter] = useState<FilterType>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<MainQuest | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingQuestId, setDeletingQuestId] = useState<string | null>(null);

  const { t } = useTranslation();

  // Task form modal state
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [creatingTaskForQuestId, setCreatingTaskForQuestId] = useState<string | null>(null);

  // Quest review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [completingQuest, setCompletingQuest] = useState<MainQuest | null>(null);

  // Calculate stats
  const activeCount = mainQuests.filter((q) => getEffectiveQuestStatus(q, activeSeasons) === 'active').length;
  const pausedCount = mainQuests.filter((q) => getEffectiveQuestStatus(q, activeSeasons) === 'paused').length;
  const completedCount = mainQuests.filter((q) => getEffectiveQuestStatus(q, activeSeasons) === 'completed').length;
  const avgProgress = mainQuests.length > 0
    ? Math.round(mainQuests.reduce((sum, q) => sum + q.progress, 0) / mainQuests.length)
    : 0;

  // Filter quests
  const filteredQuests = mainQuests.filter((quest) => {
    if (filter === 'all') return true;
    return quest.importance === filter;
  });

  // Create linked tasks map for quests (include archived tasks)
  const linkedTasksMap = useMemo(() => {
    const map: Record<string, CustomTask[]> = {};
    const allTasks = [...customTasks, ...archivedTasks];
    allTasks.forEach((task) => {
      if (task.linkType === 'mainQuest' && task.linkedMainQuestId) {
        if (!map[task.linkedMainQuestId]) {
          map[task.linkedMainQuestId] = [];
        }
        map[task.linkedMainQuestId].push(task);
      }
    });
    return map;
  }, [customTasks, archivedTasks]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingQuest(null);
    setIsFormModalOpen(true);
  };

  const handleEditQuest = (quest: MainQuest) => {
    setEditingQuest(quest);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (questData: Partial<MainQuest>) => {
    if (editingQuest) {
      updateQuest(editingQuest.id, questData);
    } else {
      addQuest(questData as Omit<MainQuest, 'id' | 'createdAt'>);
    }
  };

  const handleUpdateProgress = useCallback((id: string, progress: number) => {
    updateQuest(id, { progress });
  }, [updateQuest]);

  const handleUpdateDates = useCallback((id: string, updates: { unlockTime?: string; deadline?: string }) => {
    updateQuest(id, updates);
  }, [updateQuest]);

  const handleStatusChange = useCallback((id: string, status: Status) => {
    // If completing, show review modal first
    if (status === 'completed') {
      const quest = mainQuests.find((q) => q.id === id);
      if (quest) {
        setCompletingQuest(quest);
        setIsReviewModalOpen(true);
        return; // Don't update status yet - will be done after review
      }
    }

    const updates: Partial<MainQuest> = { status };
    if (status === 'paused') {
      const quest = mainQuests.find((q) => q.id === id);
      if (quest) {
        updates.pauseInfo = {
          reason: '',
          pausedAt: new Date().toISOString(),
          progressSnapshot: quest.progress,
        };
      }
    }
    updateQuest(id, updates);
  }, [mainQuests, updateQuest]);

  const handleReviewSubmit = useCallback((reviewData: QuestReviewData) => {
    if (completingQuest) {
      updateQuest(completingQuest.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        // Store review data in quest metadata
        review: reviewData.review || undefined,
        reviewSatisfaction: reviewData.satisfaction,
      });
    }
  }, [completingQuest, updateQuest]);

  const handleDeleteClick = (id: string) => {
    setDeletingQuestId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingQuestId) {
      // Check if it's in archived quests
      const isArchived = archivedMainQuests.some((q) => q.id === deletingQuestId);
      if (isArchived) {
        // Remove from archived quests
        useGameStore.setState((state) => ({
          archivedMainQuests: state.archivedMainQuests.filter((q) => q.id !== deletingQuestId),
        }));
      } else {
        deleteQuest(deletingQuestId);
      }
      setDeletingQuestId(null);
    }
    setIsDeleteModalOpen(false);
  };

  const handleArchive = (id: string) => {
    archiveQuest(id);
  };

  const handleUnarchive = (id: string) => {
    unarchiveQuest(id);
  };

  const handleArchivedStatusChange = useCallback((id: string, status: Status) => {
    const updates: Partial<MainQuest> = { status };
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    updateArchivedQuest(id, updates);
  }, [updateArchivedQuest]);

  const handleEditArchivedQuest = (quest: MainQuest) => {
    setEditingQuest(quest);
    setIsFormModalOpen(true);
  };

  const handleDeleteArchivedQuest = (id: string) => {
    setDeletingQuestId(id);
    setIsDeleteModalOpen(true);
  };

  // Task handlers
  const handleAddTask = (questId: string) => {
    setCreatingTaskForQuestId(questId);
    setIsTaskFormOpen(true);
  };

  const handleTaskFormSubmit = (taskData: Partial<CustomTask>) => {
    addTask(taskData as Omit<CustomTask, 'id' | 'createdAt' | 'completed'>);
    setIsTaskFormOpen(false);
    setCreatingTaskForQuestId(null);
  };

  const handleToggleTaskComplete = useCallback((taskId: string) => {
    const task = customTasks.find((t) => t.id === taskId);
    if (task) {
      updateTask(taskId, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined,
      });
    }
  }, [customTasks, updateTask]);

  // Quick edit handlers
  const handleUpdateImportance = useCallback((id: string, importance: Importance) => {
    updateQuest(id, { importance });
  }, [updateQuest]);

  const handleUpdateLinkedChapter = useCallback((id: string, chapterId: string | undefined, seasonId: string | undefined) => {
    updateQuest(id, { linkedChapterId: chapterId, seasonId: seasonId });
  }, [updateQuest]);

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          🎯 {t('quest.title')}
        </PageTitle>

        <HeaderActions>
          <Button onClick={handleOpenAddModal}>
            ➕ {t('quest.create_btn')}
          </Button>
        </HeaderActions>
      </PageHeader>

      <StatsRow>
        <StatCard>
          <StatValue>{activeCount}</StatValue>
          <StatLabel>{t('quest.stat_active')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{pausedCount}</StatValue>
          <StatLabel>{t('quest.stat_paused')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{completedCount}</StatValue>
          <StatLabel>{t('quest.stat_completed')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{avgProgress}%</StatValue>
          <StatLabel>{t('quest.stat_avg_progress')}</StatLabel>
        </StatCard>
      </StatsRow>

      <FilterBar>
        <FilterButton $active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('quest.filter_all')}
        </FilterButton>
        <FilterButton $active={filter === 'high'} onClick={() => setFilter('high')}>
          {t('quest.filter_high')}
        </FilterButton>
        <FilterButton $active={filter === 'medium'} onClick={() => setFilter('medium')}>
          {t('quest.filter_medium')}
        </FilterButton>
        <FilterButton $active={filter === 'low'} onClick={() => setFilter('low')}>
          {t('quest.filter_low')}
        </FilterButton>
      </FilterBar>

      <QuestList
        quests={filteredQuests}
        linkedTasksMap={linkedTasksMap}
        seasons={activeSeasons}
        onEdit={handleEditQuest}
        onDelete={handleDeleteClick}
        onArchive={handleArchive}
        onUpdateProgress={handleUpdateProgress}
        onStatusChange={handleStatusChange}
        onAddTask={handleAddTask}
        onToggleTaskComplete={handleToggleTaskComplete}
        onUpdateDates={handleUpdateDates}
        onUpdateImportance={handleUpdateImportance}
        onUpdateLinkedChapter={handleUpdateLinkedChapter}
        emptyMessage={t('quest.empty')}
      />

      <ArchivedSection>
        <ArchivedHeader>
          <ArchivedTitle>
            📦 {t('quest.archived_title')} ({archivedMainQuests.length})
          </ArchivedTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? t('quest.hide_btn') : t('quest.show_btn')}
          </Button>
        </ArchivedHeader>

        {showArchived && archivedMainQuests.length > 0 && (
          <QuestList
            quests={archivedMainQuests}
            onEdit={handleEditArchivedQuest}
            onDelete={handleDeleteArchivedQuest}
            onArchive={handleUnarchive}
            onUpdateProgress={() => { }}
            onStatusChange={handleArchivedStatusChange}
            emptyMessage={t('quest.empty_archived')}
            isArchived
          />
        )}
      </ArchivedSection>

      {/* Modals */}
      <QuestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        quest={editingQuest}
        seasons={activeSeasons}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('quest.delete_title')}
        message={t('quest.delete_confirm')}
        confirmText={t('quest.delete_btn')}
        variant="danger"
      />

      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setCreatingTaskForQuestId(null);
        }}
        onSubmit={handleTaskFormSubmit}
        task={null}
        mainQuests={mainQuests}
        seasons={activeSeasons}
        defaultLinkType="mainQuest"
        defaultLinkedMainQuestId={creatingTaskForQuestId}
      />

      <QuestReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setCompletingQuest(null);
        }}
        onSubmit={handleReviewSubmit}
        quest={completingQuest}
        linkedTasks={completingQuest ? linkedTasksMap[completingQuest.id] || [] : []}
      />
    </PageContainer>
  );
}

export default QuestPage;
