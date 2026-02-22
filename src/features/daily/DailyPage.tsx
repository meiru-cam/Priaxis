/**
 * DailyPage Component
 * Main page for daily task management
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useGameStore } from '../../stores';
import { usePomodoroStore } from '../../stores/pomodoro-store';
import { Button, ConfirmModal, ImeSafeInputBase } from '../../components/ui';
import { DoDCompletionModal } from '../../components/DoDCompletionModal';
import { TaskList } from './components/TaskList';
import { ArchivedTaskList } from './components/ArchivedTaskList';
import { LockedTaskList, type LockedTaskMeta } from './components/LockedTaskList';
import { MatrixView } from './components/MatrixView';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskReviewModal, type TaskReviewData } from './components/TaskReviewModal';
import { DailySuccessModal } from './components/DailySuccessModal';
import { TimeAllocationChart } from './components/TimeAllocationChart';
import { ActivityWatchUsageChart } from './components/ActivityWatchUsageChart';
import type { CustomTask, ChecklistItem, TaskType } from '../../types/task';
import {
  getChapterEffectiveDisplayStatus,
  getEffectiveQuestStatus,
  getEffectiveSeasonStatus,
} from '../../lib/hierarchy-status';

type ViewMode = 'list' | 'matrix';

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

const ViewToggle = styled.div`
  display: flex;
  gap: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  overflow: hidden;
`;

const ViewButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? 'white' : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.bg.tertiary};
  }
`;

const QuickAddForm = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-bottom: 24px;
  align-items: center;
  overflow-x: auto;
`;

const VisuallyHiddenLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  overflow: hidden;
  white-space: nowrap;
`;

const QuickInput = styled(ImeSafeInputBase)`
  flex: 1.2;
  min-width: 180px;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.input.bg};
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.95rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.input.placeholder};
  }
`;

const QuickSelect = styled.select`
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.input.bg};
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.85rem;
  cursor: pointer;
  width: 120px;
  min-width: 110px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const QuickDateInput = styled(ImeSafeInputBase)`
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.input.bg};
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.85rem;
  width: 130px;
  min-width: 130px;
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(0.5);
    cursor: pointer;
  }
`;

const TaskSection = styled.section`
  margin-top: 20px;
`;

const ChartsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px;
  margin-bottom: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCell = styled.div`
  min-width: 0;
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

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
`;

const PageButton = styled.button<{ $disabled?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme, $disabled }) => $disabled ? theme.colors.text.tertiary : theme.colors.text.primary};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const PageInfo = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export function DailyPage() {
  // Store state
  const customTasks = useGameStore((s) => s.customTasks);
  const archivedTasks = useGameStore((s) => s.archivedTasks);
  const mainQuests = useGameStore((s) => s.mainQuests);
  const activeSeasons = useGameStore((s) => s.activeSeasons);

  // Store actions
  const addTask = useGameStore((s) => s.addTask);
  const updateTask = useGameStore((s) => s.updateTask);
  const startTask = useGameStore((s) => s.startTask);
  const deleteTask = useGameStore((s) => s.deleteTask);
  const completeTask = useGameStore((s) => s.completeTask);
  const archiveTask = useGameStore((s) => s.archiveTask);
  const unarchiveTask = useGameStore((s) => s.unarchiveTask);
  const clearArchivedTasks = useGameStore((s) => s.clearArchivedTasks);
  const convertTaskToQuest = useGameStore((s) => s.convertTaskToQuest);
  const refreshTaskImportance = useGameStore((s) => s.refreshTaskImportance);

  // Safety net: Auto-archive any tasks that are completed but still in active list
  useEffect(() => {
    const completedActiveTasks = customTasks.filter(t => t.completed);
    if (completedActiveTasks.length > 0) {
      completedActiveTasks.forEach(t => archiveTask(t.id));
    }
  }, [customTasks, archiveTask]);

  // Pomodoro store actions
  const setLinkedTask = usePomodoroStore((s) => s.setLinkedTask);
  const startPomodoro = usePomodoroStore((s) => s.start);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskType, setQuickTaskType] = useState<TaskType>('creative');
  const [quickTaskDate, setQuickTaskDate] = useState('');
  const [quickTaskQuestId, setQuickTaskQuestId] = useState('');
  const [quickTaskChapterId, setQuickTaskChapterId] = useState('');
  const [showLocked, setShowLocked] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<CustomTask | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // DoD completion modal state
  const [isDoDModalOpen, setIsDoDModalOpen] = useState(false);
  const [dodCompletingTask, setDodCompletingTask] = useState<CustomTask | null>(null);

  // Daily Success modal state
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Pagination for archived tasks
  const [archivedPage, setArchivedPage] = useState(1);
  const ARCHIVED_PER_PAGE = 20;

  const { t } = useTranslation();

  const lockedTaskMetaById = useMemo<Record<string, LockedTaskMeta>>(() => {
    const meta: Record<string, LockedTaskMeta> = {};
    const questById = new Map(mainQuests.map((q) => [q.id, q]));
    const seasonById = new Map(activeSeasons.map((s) => [s.id, s]));

    const getLinkedChapter = (task: CustomTask) => {
      if (!task.linkedChapterId) return null;
      if (task.linkedSeasonId || task.seasonId) {
        const season = seasonById.get(task.linkedSeasonId || task.seasonId || '');
        if (!season) return null;
        const chapter = season?.chapters.find((ch) => ch.id === task.linkedChapterId);
        return chapter ? { chapter, season } : null;
      }
      for (const season of activeSeasons) {
        const chapter = season.chapters.find((ch) => ch.id === task.linkedChapterId);
        if (chapter) return { chapter, season };
      }
      return null;
    };

    customTasks.forEach((task) => {
      const linkedQuestId = task.linkedMainQuestId || task.linkedQuestId;
      if (linkedQuestId) {
        const quest = questById.get(linkedQuestId);
        const effectiveQuestStatus = quest ? getEffectiveQuestStatus(quest, activeSeasons) : undefined;
        if (effectiveQuestStatus === 'locked') {
          meta[task.id] = { type: 'quest', unlockTime: quest?.unlockTime };
          return;
        }
      }

      const linkedChapterInfo = getLinkedChapter(task);
      if (linkedChapterInfo) {
        const parentSeasonLocked = getEffectiveSeasonStatus(linkedChapterInfo.season) === 'locked';
        const chapterStatus = getChapterEffectiveDisplayStatus(linkedChapterInfo.chapter, { parentSeasonLocked });
        if (chapterStatus === 'locked') {
          meta[task.id] = { type: 'chapter', unlockTime: linkedChapterInfo.chapter.unlockTime };
          return;
        }
      }

      const linkedSeasonId = task.linkedSeasonId || task.seasonId;
      if (linkedSeasonId) {
        const season = seasonById.get(linkedSeasonId);
        if (season && getEffectiveSeasonStatus(season) === 'locked') {
          meta[task.id] = { type: 'season', unlockTime: season.startDate };
          return;
        }
      }

      if (!linkedSeasonId && linkedChapterInfo?.season && getEffectiveSeasonStatus(linkedChapterInfo.season) === 'locked') {
        meta[task.id] = { type: 'season', unlockTime: linkedChapterInfo.season.startDate };
        return;
      }
    });

    return meta;
  }, [customTasks, mainQuests, activeSeasons]);

  const lockedTasks = useMemo(
    () => customTasks.filter((task) => Boolean(lockedTaskMetaById[task.id])),
    [customTasks, lockedTaskMetaById]
  );
  const visibleTasks = useMemo(
    () => customTasks.filter((task) => !lockedTaskMetaById[task.id]),
    [customTasks, lockedTaskMetaById]
  );

  // Handlers
  const handleQuickAdd = () => {
    if (!quickTaskName.trim()) return;

    // Find the linked quest to determine importance
    const linkedQuest = quickTaskQuestId
      ? mainQuests.find(q => q.id === quickTaskQuestId)
      : undefined;

    // Find the linked chapter (for importance fallback)
    let linkedChapterInfo: { seasonId: string; chapter: { id: string } } | undefined;
    if (quickTaskChapterId) {
      for (const season of activeSeasons) {
        const chapter = season.chapters?.find(c => c.id === quickTaskChapterId);
        if (chapter) {
          linkedChapterInfo = { seasonId: season.id, chapter };
          break;
        }
      }
    }

    // Determine link type (quest takes priority)
    let linkType: 'mainQuest' | 'chapter' | 'none' = 'none';
    if (linkedQuest) linkType = 'mainQuest';
    else if (linkedChapterInfo) linkType = 'chapter';

    addTask({
      name: quickTaskName.trim(),
      taskType: quickTaskType,
      effort: 'medium',
      importance: linkedQuest?.importance || 'medium',
      linkType,
      linkedMainQuestId: linkedQuest?.id,
      linkedChapterId: linkedChapterInfo?.chapter.id,
      linkedSeasonId: linkedChapterInfo?.seasonId,
      deadline: quickTaskDate || undefined,
    });

    setQuickTaskName('');
    setQuickTaskDate('');
    // Keep quest/chapter selection for convenience
  };

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    // Prevent triggering during IME composition (e.g., Chinese input)
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleQuickAdd();
    }
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsFormModalOpen(true);
  };

  const handleEditTask = (task: CustomTask) => {
    setEditingTask(task);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (taskData: Partial<CustomTask>) => {
    if (editingTask) {
      // Update existing task
      updateTask(editingTask.id, taskData);
    } else {
      // Add new task
      addTask(taskData as Omit<CustomTask, 'id' | 'createdAt' | 'completed'>);
    }
  };

  const handleComplete = useCallback((id: string) => {
    const task = customTasks.find((t) => t.id === id);
    if (task && !task.completed) {
      setCompletingTask(task);
      setIsReviewModalOpen(true);
    } else if (task && task.completed) {
      // Uncomplete task
      updateTask(id, { completed: false, completedAt: undefined });
    }
  }, [customTasks, updateTask]);

  const handleReviewSubmit = (reviewData: TaskReviewData) => {
    if (completingTask) {
      // Complete task and persist actual costs in store-level settlement logic
      completeTask(
        completingTask.id,
        reviewData.review,
        reviewData.actualEnergy,
        reviewData.actualTime !== undefined ? Math.round(reviewData.actualTime * 60) : undefined,
        reviewData.satisfaction
      );

      // XP/stats are settled centrally in store.completeTask to avoid double counting.

      // Auto-archive after completing review
      archiveTask(completingTask.id);
    }
    // Don't set completingTask to null here - let the modal handle closing
    // after AI analysis is shown. The modal's onClose will clear this.
  };

  const handleDeleteClick = (id: string) => {
    setDeletingTaskId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingTaskId) {
      deleteTask(deletingTaskId);
      setDeletingTaskId(null);
    }
    setIsDeleteModalOpen(false);
  };

  const handleArchive = (id: string) => {
    archiveTask(id);
  };

  const handleUnarchive = (id: string) => {
    unarchiveTask(id);
  };

  const handleStartTask = (id: string) => {
    startTask(id);
  };

  const handleStartPomodoro = useCallback((task: CustomTask) => {
    // Request notification permission on user interaction
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setLinkedTask(task.id, task.name);
    startPomodoro(task.id, task.name);
  }, [setLinkedTask, startPomodoro]);

  const handlePin = useCallback((id: string) => {
    const task = customTasks.find((t) => t.id === id);
    if (task) {
      updateTask(id, { pinned: !task.pinned });
    }
  }, [customTasks, updateTask]);

  const handleConvertToQuest = useCallback((id: string) => {
    if (window.confirm(t('daily.convert_quest_confirm'))) {
      convertTaskToQuest(id);
    }
  }, [convertTaskToQuest, t]);

  // DoD completion handlers
  const handleDoDComplete = useCallback((task: CustomTask) => {
    setDodCompletingTask(task);
    setIsDoDModalOpen(true);
  }, []);

  const handleConfirmDoDComplete = useCallback(() => {
    if (dodCompletingTask) {
      // Trigger the review modal for proper completion flow
      setCompletingTask(dodCompletingTask);
      setIsReviewModalOpen(true);
    }
    setIsDoDModalOpen(false);
    setDodCompletingTask(null);
  }, [dodCompletingTask]);

  const handleAddMoreDoD = useCallback((newItems: string[]) => {
    if (dodCompletingTask) {
      const existingChecklist = dodCompletingTask.checklist || [];
      const newChecklist: ChecklistItem[] = [
        ...existingChecklist,
        ...newItems.map(text => ({
          id: crypto.randomUUID(),
          text,
          completed: false,
        })),
      ];
      updateTask(dodCompletingTask.id, { checklist: newChecklist });
    }
    setIsDoDModalOpen(false);
    setDodCompletingTask(null);
  }, [dodCompletingTask, updateTask]);

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          💫 {t('daily.title')}
        </PageTitle>

        <HeaderActions>
          <Button variant="secondary" onClick={() => setIsSuccessModalOpen(true)}>
            📝 {t('daily.success_btn')}
          </Button>

          <ViewToggle>
            <ViewButton
              $active={viewMode === 'matrix'}
              onClick={() => setViewMode('matrix')}
            >
              📊 {t('daily.view_matrix')}
            </ViewButton>
            <ViewButton
              $active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              📋 {t('daily.view_list')}
            </ViewButton>
          </ViewToggle>

          <Button variant="secondary" onClick={refreshTaskImportance} title={t('daily.refresh_importance')}>
            🔄 {t('daily.refresh_btn')}
          </Button>

          <Button onClick={handleOpenAddModal}>
            ➕ {t('daily.add_task_btn')}
          </Button>
        </HeaderActions>
      </PageHeader>

      <QuickAddForm>
        <VisuallyHiddenLabel htmlFor="quick-add-task">{t('daily.quick_add_aria')}</VisuallyHiddenLabel>
        <QuickInput
          type="text"
          id="quick-add-task"
          name="quickTaskName"
          aria-label={t('daily.quick_add_aria')}
          value={quickTaskName}
          onChange={(e) => setQuickTaskName(e.target.value)}
          onKeyDown={handleQuickAddKeyDown}
          placeholder={t('daily.quick_add_placeholder')}
        />
        <VisuallyHiddenLabel htmlFor="quick-add-type">{t('task.label_type')}</VisuallyHiddenLabel>
        <QuickSelect
          id="quick-add-type"
          name="quickTaskType"
          aria-label={t('task.label_type')}
          value={quickTaskType}
          onChange={(e) => setQuickTaskType(e.target.value as TaskType)}
        >
          <option value="creative">{t('task.type_creative')}</option>
          <option value="tax">{t('task.type_tax')}</option>
          <option value="maintenance">{t('task.type_maintenance')}</option>
        </QuickSelect>
        <VisuallyHiddenLabel htmlFor="quick-add-date">{t('daily.deadline_aria')}</VisuallyHiddenLabel>
        <QuickDateInput
          type="date"
          id="quick-add-date"
          name="quickTaskDate"
          aria-label={t('daily.deadline_aria')}
          value={quickTaskDate}
          onChange={(e) => setQuickTaskDate(e.target.value)}
        />
        <VisuallyHiddenLabel htmlFor="quick-add-quest">{t('daily.link_quest_aria')}</VisuallyHiddenLabel>
        <QuickSelect
          id="quick-add-quest"
          name="quickTaskQuest"
          aria-label={t('daily.link_quest_aria')}
          value={quickTaskQuestId}
          onChange={(e) => setQuickTaskQuestId(e.target.value)}
        >
          <option value="">{t('daily.no_link')}</option>
          {mainQuests.filter(q => q.status === 'active').map(quest => (
            <option key={quest.id} value={quest.id}>
              🎯 {quest.title}
            </option>
          ))}
        </QuickSelect>
        <VisuallyHiddenLabel htmlFor="quick-add-chapter">{t('daily.link_chapter_aria')}</VisuallyHiddenLabel>
        <QuickSelect
          id="quick-add-chapter"
          name="quickTaskChapter"
          aria-label={t('daily.link_chapter_aria')}
          value={quickTaskChapterId}
          onChange={(e) => setQuickTaskChapterId(e.target.value)}
        >
          <option value="">{t('daily.no_chapter')}</option>
          {activeSeasons.flatMap(season =>
            (season.chapters || []).filter(ch => ch.status === 'active').map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                📖 {season.name} - {chapter.title}
              </option>
            ))
          )}
        </QuickSelect>
        <Button onClick={handleQuickAdd} disabled={!quickTaskName.trim()}>
          {t('daily.add_btn')}
        </Button>
      </QuickAddForm>

      <ChartsRow>
        <ChartCell>
          <TimeAllocationChart />
        </ChartCell>
        <ChartCell>
          <ActivityWatchUsageChart />
        </ChartCell>
      </ChartsRow>

      <TaskSection>
        {viewMode === 'matrix' ? (
          <>
            <MatrixView
              tasks={visibleTasks}
              onComplete={handleComplete}
              onEdit={handleEditTask}
              onDelete={handleDeleteClick}
              onArchive={handleArchive}
              onPin={handlePin}
              onStart={handleStartTask}
              onStartPomodoro={handleStartPomodoro}
              onConvertToQuest={handleConvertToQuest}
              onQuickUpdate={updateTask}
              onDoDComplete={handleDoDComplete}
            />
            {/* Show completed tasks below matrix */}
            {visibleTasks.some(t => t.completed) && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{
                  margin: '0 0 12px',
                  fontSize: '0.9rem',
                  color: '#6b7280', // text-secondary
                  borderBottom: '1px solid #e5e7eb', // border-primary
                  paddingBottom: '8px'
                }}>
                  ✅ {t('daily.completed_today')} ({visibleTasks.filter(t => t.completed).length})
                </h4>
                <TaskList
                  tasks={visibleTasks.filter(t => t.completed)}
                  onComplete={handleComplete}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteClick}
                  onArchive={handleArchive}
                  onQuickUpdate={updateTask}
                  onPin={handlePin}
                  onStartPomodoro={handleStartPomodoro}
                  onConvertToQuest={handleConvertToQuest}
                  onDoDComplete={handleDoDComplete}
                  showCompleted={true}
                />
              </div>
            )}
          </>
        ) : (
          <TaskList
            tasks={visibleTasks}
            onComplete={handleComplete}
            onEdit={handleEditTask}
            onDelete={handleDeleteClick}
            onArchive={handleArchive}
            onQuickUpdate={updateTask}
            onPin={handlePin}
            onStart={handleStartTask}
            onStartPomodoro={handleStartPomodoro}
            onConvertToQuest={handleConvertToQuest}
            onDoDComplete={handleDoDComplete}
            emptyMessage={t('daily.empty_tasks')}
          />
        )}
      </TaskSection>

      <ArchivedSection>
        <ArchivedHeader>
          <ArchivedTitle>
            🔒 {t('daily.locked_title')} ({lockedTasks.length})
          </ArchivedTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLocked(!showLocked)}
          >
            {showLocked ? t('daily.hide_btn') : t('daily.show_btn')}
          </Button>
        </ArchivedHeader>

        {showLocked && (
          <LockedTaskList
            tasks={lockedTasks}
            lockMetaByTaskId={lockedTaskMetaById}
            onEdit={handleEditTask}
            onDelete={handleDeleteClick}
            emptyMessage={t('daily.empty_locked')}
          />
        )}
      </ArchivedSection>

      <ArchivedSection>
        <ArchivedHeader>
          <ArchivedTitle>
            📦 {t('daily.archived_title')} ({archivedTasks.length})
          </ArchivedTitle>
          <div style={{ display: 'flex', gap: '8px' }}>
            {archivedTasks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(t('daily.clear_archived_confirm'))) {
                    clearArchivedTasks();
                  }
                }}
              >
                🗑️ {t('daily.clear_btn')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? t('daily.hide_btn') : t('daily.show_btn')}
            </Button>
          </div>
        </ArchivedHeader>

        {showArchived && archivedTasks.length > 0 && (
          <>
            <ArchivedTaskList
              tasks={archivedTasks.slice(
                (archivedPage - 1) * ARCHIVED_PER_PAGE,
                archivedPage * ARCHIVED_PER_PAGE
              )}
              onUnarchive={handleUnarchive}
              onDelete={handleDeleteClick}
              emptyMessage={t('daily.empty_archived')}
            />
            {archivedTasks.length > ARCHIVED_PER_PAGE && (
              <Pagination>
                <PageButton
                  $disabled={archivedPage === 1}
                  onClick={() => setArchivedPage((p) => Math.max(1, p - 1))}
                  disabled={archivedPage === 1}
                >
                  {t('daily.prev_page')}
                </PageButton>
                <PageInfo>
                  {archivedPage} / {Math.ceil(archivedTasks.length / ARCHIVED_PER_PAGE)}
                </PageInfo>
                <PageButton
                  $disabled={archivedPage >= Math.ceil(archivedTasks.length / ARCHIVED_PER_PAGE)}
                  onClick={() => setArchivedPage((p) => Math.min(Math.ceil(archivedTasks.length / ARCHIVED_PER_PAGE), p + 1))}
                  disabled={archivedPage >= Math.ceil(archivedTasks.length / ARCHIVED_PER_PAGE)}
                >
                  {t('daily.next_page')}
                </PageButton>
              </Pagination>
            )}
          </>
        )}
      </ArchivedSection>

      {/* Modals */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        task={editingTask}
        mainQuests={mainQuests}
        seasons={activeSeasons}
      />

      <TaskReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setCompletingTask(null);
        }}
        onSubmit={handleReviewSubmit}
        task={completingTask}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('daily.delete_task_title')}
        message={t('daily.delete_task_confirm')}
        confirmText={t('daily.delete_btn')}
        variant="danger"
      />

      {/* DoD Completion Modal */}
      <DoDCompletionModal
        isOpen={isDoDModalOpen}
        taskTitle={dodCompletingTask?.name || ''}
        checklistCount={dodCompletingTask?.checklist?.length || 5}
        onConfirmComplete={handleConfirmDoDComplete}
        onAddMore={handleAddMoreDoD}
        onCancel={() => {
          setIsDoDModalOpen(false);
          setDodCompletingTask(null);
        }}
      />

      {/* Daily Success Modal */}
      <DailySuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />
    </PageContainer>
  );
}

export default DailyPage;
