/**
 * RecurringPage Component
 * Main page for habit tracking and recurring tasks management
 */

import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useGameStore } from '../../stores';
import { Button, ConfirmModal } from '../../components/ui';
import { HabitList } from './components/HabitList';
import { HabitFormModal } from './components/HabitFormModal';
import { HabitHeatmapCard } from './components/HabitHeatmapCard';
import { HabitStats } from './components/HabitStats';
import { RecurringTaskList } from './components/RecurringTaskList';
import { RecurringTaskFormModal } from './components/RecurringTaskFormModal';
import type { Habit, RecurringTask } from '../../types/task';

type ViewTab = 'habits' | 'recurring' | 'heatmap';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

const TabContainer = styled.div`
  display: flex;
  gap: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 24px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? 'white' : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};

  &:hover {
    background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.bg.tertiary};
  }
`;

const ContentSection = styled.section`
  margin-top: 20px;
`;

const HeatmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const EmptyHeatmap = styled.div`
  text-align: center;
  padding: 40px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
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

export function RecurringPage() {
  // Store state
  const habits = useGameStore((s) => s.habits);
  const archivedHabits = useGameStore((s) => s.archivedHabits);
  const recurringTasks = useGameStore((s) => s.recurringTasks);

  // Store actions
  const addHabit = useGameStore((s) => s.addHabit);
  const updateHabit = useGameStore((s) => s.updateHabit);
  const deleteHabit = useGameStore((s) => s.deleteHabit);
  const archiveHabit = useGameStore((s) => s.archiveHabit);
  const unarchiveHabit = useGameStore((s) => s.unarchiveHabit);
  const reorderHabits = useGameStore((s) => s.reorderHabits);
  const checkInHabit = useGameStore((s) => s.checkInHabit);

  const addRecurringTask = useGameStore((s) => s.addRecurringTask);
  const updateRecurringTask = useGameStore((s) => s.updateRecurringTask);
  const deleteRecurringTask = useGameStore((s) => s.deleteRecurringTask);
  const triggerRecurringTask = useGameStore((s) => s.triggerRecurringTask);

  // Local state
  const [activeTab, setActiveTab] = useState<ViewTab>('habits');

  // Habit state
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Recurring Task state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState<{ id: string; type: 'habit' | 'task' } | null>(null);

  const [showArchived, setShowArchived] = useState(false);
  const { t } = useTranslation();

  // Filter active habits
  const activeHabits = habits.filter((h) => h.active);

  // Handlers - Habits
  const handleOpenAddHabit = () => {
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleHabitSubmit = (habitData: Partial<Habit>) => {
    if (editingHabit) {
      updateHabit(editingHabit.id, habitData);
    } else {
      addHabit({
        name: habitData.name || '',
        frequencyType: habitData.frequencyType || 'daily',
        active: habitData.active ?? true,
        emoji: habitData.emoji,
        description: habitData.description,
        category: habitData.category,
        targetPerDay: habitData.targetPerDay,
        targetDaysPerWeek: habitData.targetDaysPerWeek,
      });
    }
  };

  // Handlers - Recurring Tasks
  const handleOpenAddTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: RecurringTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = (taskData: Omit<RecurringTask, 'id' | 'createdAt' | 'streak' | 'lastGeneratedDate'>) => {
    if (editingTask) {
      updateRecurringTask(editingTask.id, taskData);
    } else {
      addRecurringTask(taskData);
    }
  };

  // Delete
  const handleDeleteHabit = (id: string) => {
    setDeleteData({ id, type: 'habit' });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setDeleteData({ id, type: 'task' });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteData) {
      if (deleteData.type === 'habit') {
        deleteHabit(deleteData.id);
      } else {
        deleteRecurringTask(deleteData.id);
      }
      setDeleteData(null);
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          🔄 {t('recurring.title')}
        </PageTitle>

        <HeaderActions>
          {activeTab === 'recurring' ? (
            <Button onClick={handleOpenAddTask}>
              {t('recurring.add_task')}
            </Button>
          ) : (
            <Button onClick={handleOpenAddHabit}>
              {t('recurring.add_habit')}
            </Button>
          )}
        </HeaderActions>
      </PageHeader>

      <TabContainer>
        <Tab $active={activeTab === 'habits'} onClick={() => setActiveTab('habits')}>
          {t('recurring.tab_habits')} ({activeHabits.length})
        </Tab>
        <Tab $active={activeTab === 'recurring'} onClick={() => setActiveTab('recurring')}>
          {t('recurring.tab_tasks')} ({recurringTasks.length})
        </Tab>
        <Tab $active={activeTab === 'heatmap'} onClick={() => setActiveTab('heatmap')}>
          {t('recurring.tab_heatmap')}
        </Tab>
      </TabContainer>

      <ContentSection>
        {activeTab === 'habits' && (
          <>
            <HabitStats habits={activeHabits} />
            <div style={{ height: 20 }} />
            <HabitList
              habits={activeHabits}
              onCheckIn={checkInHabit}
              onEdit={handleEditHabit}
              onDelete={handleDeleteHabit}
              onArchive={archiveHabit}
              onReorder={(dragId, targetId) => reorderHabits(dragId, targetId, false)}
            />

            {archivedHabits.length > 0 && (
              <ArchivedSection>
                <ArchivedHeader>
                  <ArchivedTitle>
                    {t('recurring.archived_habits')} ({archivedHabits.length})
                  </ArchivedTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                  >
                    {showArchived ? t('recurring.hide_archived') : t('recurring.show_archived')}
                  </Button>
                </ArchivedHeader>

                {showArchived && (
                  <HabitList
                    habits={archivedHabits}
                    onCheckIn={() => { }}
                    onEdit={() => { }}
                    onDelete={handleDeleteHabit}
                    onArchive={() => { }}
                    onRestore={unarchiveHabit}
                    isArchived
                    onReorder={(dragId, targetId) => reorderHabits(dragId, targetId, true)}
                  />
                )}
              </ArchivedSection>
            )}
          </>
        )}

        {activeTab === 'recurring' && (
          <RecurringTaskList
            tasks={recurringTasks}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onTrigger={triggerRecurringTask}
          />
        )}

        {activeTab === 'heatmap' && (
          <>
            {activeHabits.length > 0 ? (
              <HeatmapGrid>
                {activeHabits.map((habit) => (
                  <HabitHeatmapCard
                    key={habit.id}
                    habit={habit}
                    onCheckIn={checkInHabit}
                    minWeeks={8}
                  />
                ))}
              </HeatmapGrid>
            ) : (
              <EmptyHeatmap>
                <p>{t('recurring.no_heatmap_data')}</p>
                <p>{t('recurring.heatmap_desc')}</p>
              </EmptyHeatmap>
            )}
          </>
        )}
      </ContentSection>

      {/* Modals */}
      <HabitFormModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSubmit={handleHabitSubmit}
        habit={editingHabit}
      />

      <RecurringTaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        task={editingTask}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('recurring.delete_confirm_title')}
        message={t('recurring.delete_confirm_msg')}
        confirmText={t('season.delete_btn')}
        variant="danger"
      />
    </PageContainer>
  );
}

export default RecurringPage;
