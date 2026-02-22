/**
 * CommandCenterPage Component
 * Unified hierarchy view: Season -> Chapter -> Quest -> Task
 * With collapsible tree and breadcrumb navigation
 */

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useGameStore } from '../../stores';
import { HierarchyTree } from './components/HierarchyTree';
import { Breadcrumb, type BreadcrumbItem } from './components/Breadcrumb';
import { QuestFormModal } from '../quest/components/QuestFormModal';
import { ChapterFormModal } from '../season/components/ChapterFormModal';
import { SeasonWizardModal } from '../season/components/SeasonWizardModal';
import { TaskFormModal } from '../daily/components/TaskFormModal';
import type { Season, MainQuest, CustomTask, Chapter, Category } from '../../types/task';

// Types for selected items
type SelectedItem =
  | { type: 'season'; id: string }
  | { type: 'chapter'; seasonId: string; chapterId: string }
  | { type: 'quest'; id: string }
  | { type: 'task'; id: string }
  | null;

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 1.8rem;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PageSubtitle = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const TreePanel = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
`;

const DetailPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 20px;
`;

const DetailHeader = styled.div`
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const DetailTitle = styled.h2`
  font-size: 1.3rem;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const DetailMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const MetaBadge = styled.span<{ $variant?: 'success' | 'warning' | 'info' }>`
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  background: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'success':
        return 'rgba(16, 185, 129, 0.15)';
      case 'warning':
        return 'rgba(251, 191, 36, 0.15)';
      default:
        return theme.colors.bg.tertiary;
    }
  }};
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.accent.green;
      case 'warning':
        return '#f59e0b';
      default:
        return theme.colors.text.secondary;
    }
  }};
`;

const ProgressBar = styled.div`
  margin: 16px 0;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ProgressTrack = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #8b5cf6, #a855f7);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const Description = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const LinkedItemsSection = styled.div`
  margin-top: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LinkedItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LinkedItemCard = styled.div<{ $completed?: boolean }>`
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${({ $completed }) => ($completed ? 0.6 : 1)};

  &:hover {
    transform: translateX(4px);
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const LinkedItemName = styled.div<{ $completed?: boolean }>`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
`;

const LinkedItemMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const EmptyDetail = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 10px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const EditButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.accent.purple};
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 16px;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

// Default categories for seasons
const DEFAULT_CATEGORIES_BASE: Omit<Category, 'name'>[] = [
  { id: 'work', icon: '💼', color: '#3b82f6' },
  { id: 'personal', icon: '🎯', color: '#10b981' },
  { id: 'study', icon: '📚', color: '#f59e0b' },
  { id: 'health', icon: '❤️', color: '#ef4444' },
];

export function CommandCenterPage() {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const defaultCategories = useMemo<Category[]>(
    () => [
      { ...DEFAULT_CATEGORIES_BASE[0], name: t('cmd.category_work') },
      { ...DEFAULT_CATEGORIES_BASE[1], name: t('cmd.category_personal') },
      { ...DEFAULT_CATEGORIES_BASE[2], name: t('cmd.category_study') },
      { ...DEFAULT_CATEGORIES_BASE[3], name: t('cmd.category_health') },
    ],
    [t],
  );

  // Modal states
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [editingQuest, setEditingQuest] = useState<MainQuest | null>(null);
  const [editingChapter, setEditingChapter] = useState<{ chapter: Chapter; seasonId: string } | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editingTask, setEditingTask] = useState<CustomTask | null>(null);

  // Store data
  const activeSeasons = useGameStore((s) => s.activeSeasons);
  const mainQuests = useGameStore((s) => s.mainQuests);
  const customTasks = useGameStore((s) => s.customTasks);

  // Store actions
  const updateQuest = useGameStore((s) => s.updateQuest);
  const updateSeason = useGameStore((s) => s.updateSeason);
  const updateTask = useGameStore((s) => s.updateTask);

  // Calculate stats
  const stats = useMemo(() => {
    const activeQuestsCount = mainQuests.filter((q) => q.status === 'active').length;
    const completedQuestsCount = mainQuests.filter((q) => q.status === 'completed').length;
    const pendingTasksCount = customTasks.filter((t) => !t.completed).length;
    const completedTasksCount = customTasks.filter((t) => t.completed).length;

    return {
      seasons: activeSeasons.length,
      quests: activeQuestsCount,
      questsCompleted: completedQuestsCount,
      tasks: pendingTasksCount,
      tasksCompleted: completedTasksCount,
    };
  }, [activeSeasons, mainQuests, customTasks]);

  // Build breadcrumb items based on selection
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { id: 'home', label: t('cmd.title'), icon: '🏠' },
    ];

    if (!selectedItem) return items;

    if (selectedItem.type === 'season') {
      const season = activeSeasons.find((s) => s.id === selectedItem.id);
      if (season) {
        items.push({ id: season.id, label: season.name, icon: '📜' });
      }
    } else if (selectedItem.type === 'chapter') {
      const season = activeSeasons.find((s) => s.id === selectedItem.seasonId);
      if (season) {
        items.push({ id: season.id, label: season.name, icon: '📜' });
        const chapter = season.chapters.find((c) => c.id === selectedItem.chapterId);
        if (chapter) {
          items.push({ id: chapter.id, label: chapter.title, icon: '📖' });
        }
      }
    } else if (selectedItem.type === 'quest') {
      const quest = mainQuests.find((q) => q.id === selectedItem.id);
      if (quest) {
        if (quest.seasonId) {
          const season = activeSeasons.find((s) => s.id === quest.seasonId);
          if (season) {
            items.push({ id: season.id, label: season.name, icon: '📜' });
            if (quest.linkedChapterId) {
              const chapter = season.chapters.find(
                (c) => c.id === quest.linkedChapterId
              );
              if (chapter) {
                items.push({ id: chapter.id, label: chapter.title, icon: '📖' });
              }
            }
          }
        }
        items.push({ id: quest.id, label: quest.title, icon: '📋' });
      }
    } else if (selectedItem.type === 'task') {
      const task = customTasks.find((t) => t.id === selectedItem.id);
      if (task) {
        if (task.linkedMainQuestId) {
          const quest = mainQuests.find((q) => q.id === task.linkedMainQuestId);
          if (quest) {
            if (quest.seasonId) {
              const season = activeSeasons.find((s) => s.id === quest.seasonId);
              if (season) {
                items.push({ id: season.id, label: season.name, icon: '📜' });
              }
            }
            items.push({ id: quest.id, label: quest.title, icon: '📋' });
          }
        }
        items.push({ id: task.id, label: task.name, icon: '✅' });
      }
    }

    return items;
  }, [selectedItem, activeSeasons, mainQuests, customTasks, t]);

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.id === 'home') {
      setSelectedItem(null);
    }
    // Could implement navigation to specific item here
  };

  // Edit handlers
  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setIsSeasonModalOpen(true);
  };

  const handleEditChapter = (chapter: Chapter, seasonId: string) => {
    setEditingChapter({ chapter, seasonId });
    setIsChapterModalOpen(true);
  };

  const handleEditQuest = (quest: MainQuest) => {
    setEditingQuest(quest);
    setIsQuestModalOpen(true);
  };

  const handleEditTask = (task: CustomTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSeasonSubmit = (seasonData: Partial<Season>) => {
    if (editingSeason) {
      updateSeason(editingSeason.id, seasonData);
    }
  };

  const handleChapterSubmit = (chapterData: Partial<Chapter>) => {
    if (editingChapter) {
      const season = activeSeasons.find((s) => s.id === editingChapter.seasonId);
      if (season) {
        const updatedChapters = season.chapters.map((ch) =>
          ch.id === editingChapter.chapter.id ? { ...ch, ...chapterData } : ch
        );
        updateSeason(editingChapter.seasonId, { chapters: updatedChapters });
      }
    }
  };

  const handleQuestSubmit = (questData: Partial<MainQuest>) => {
    if (editingQuest) {
      updateQuest(editingQuest.id, questData);
    }
  };

  const handleTaskSubmit = (taskData: Partial<CustomTask>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    }
  };

  // Get detail data based on selection
  const renderDetail = () => {
    if (!selectedItem) {
      return (
        <EmptyDetail>
          <h3>{t('cmd.empty_select_title')}</h3>
          <p>{t('cmd.empty_select_desc')}</p>
        </EmptyDetail>
      );
    }

    if (selectedItem.type === 'season') {
      const season = activeSeasons.find((s) => s.id === selectedItem.id);
      if (!season) return null;

      const linkedQuests = mainQuests.filter((q) => q.seasonId === season.id);
      const avgProgress =
        linkedQuests.length > 0
          ? Math.round(
            linkedQuests.reduce((sum, q) => sum + q.progress, 0) /
            linkedQuests.length
          )
          : 0;

      return (
        <>
          <DetailHeader>
            <DetailTitle>📜 {season.name}</DetailTitle>
            <DetailMeta>
              <MetaBadge $variant="success">{season.status}</MetaBadge>
              <MetaBadge>{season.chapters.length} {t('cmd.chapters_count')}</MetaBadge>
              <MetaBadge>{linkedQuests.length} {t('cmd.quests_count')}</MetaBadge>
            </DetailMeta>
            <EditButton onClick={() => handleEditSeason(season)}>
              ✏️ {t('cmd.edit_season')}
            </EditButton>
          </DetailHeader>

          <ProgressBar>
            <ProgressLabel>
              <span>{t('cmd.overall_progress')}</span>
              <span>{avgProgress}%</span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $percent={avgProgress} />
            </ProgressTrack>
          </ProgressBar>

          {season.description && <Description>{season.description}</Description>}

          <LinkedItemsSection>
            <SectionTitle>📖 {t('cmd.chapters_count')} ({season.chapters.length})</SectionTitle>
            <LinkedItemList>
              {season.chapters.map((chapter) => (
                <LinkedItemCard
                  key={chapter.id}
                  onClick={() =>
                    setSelectedItem({
                      type: 'chapter',
                      seasonId: season.id,
                      chapterId: chapter.id,
                    })
                  }
                >
                  <LinkedItemName>{chapter.title}</LinkedItemName>
                  <LinkedItemMeta>
                    {t('cmd.progress')}: {chapter.progress}% • {chapter.status}
                  </LinkedItemMeta>
                </LinkedItemCard>
              ))}
            </LinkedItemList>
          </LinkedItemsSection>
        </>
      );
    }

    if (selectedItem.type === 'chapter') {
      const season = activeSeasons.find((s) => s.id === selectedItem.seasonId);
      const chapter = season?.chapters.find(
        (c) => c.id === selectedItem.chapterId
      );
      if (!chapter) return null;

      const linkedQuests = mainQuests.filter(
        (q) =>
          q.linkedChapterId === chapter.id && q.seasonId === selectedItem.seasonId
      );

      return (
        <>
          <DetailHeader>
            <DetailTitle>📖 {chapter.title}</DetailTitle>
            <DetailMeta>
              <MetaBadge $variant="success">{chapter.status}</MetaBadge>
              <MetaBadge>{linkedQuests.length} {t('cmd.quests_count')}</MetaBadge>
            </DetailMeta>
            <EditButton onClick={() => handleEditChapter(chapter, selectedItem.seasonId)}>
              ✏️ {t('cmd.edit_chapter')}
            </EditButton>
          </DetailHeader>

          <ProgressBar>
            <ProgressLabel>
              <span>{t('cmd.chapter_progress')}</span>
              <span>{chapter.progress}%</span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $percent={chapter.progress} />
            </ProgressTrack>
          </ProgressBar>

          {chapter.description && <Description>{chapter.description}</Description>}

          <LinkedItemsSection>
            <SectionTitle>📋 {t('cmd.linked_quests')} ({linkedQuests.length})</SectionTitle>
            <LinkedItemList>
              {linkedQuests.map((quest) => (
                <LinkedItemCard
                  key={quest.id}
                  $completed={quest.status === 'completed'}
                  onClick={() => setSelectedItem({ type: 'quest', id: quest.id })}
                >
                  <LinkedItemName $completed={quest.status === 'completed'}>
                    {quest.title}
                  </LinkedItemName>
                  <LinkedItemMeta>
                    {t('cmd.progress')}: {quest.progress}% • {quest.status}
                  </LinkedItemMeta>
                </LinkedItemCard>
              ))}
            </LinkedItemList>
          </LinkedItemsSection>
        </>
      );
    }

    if (selectedItem.type === 'quest') {
      const quest = mainQuests.find((q) => q.id === selectedItem.id);
      if (!quest) return null;

      const linkedTasks = customTasks.filter(
        (t) => t.linkedMainQuestId === quest.id
      );
      const completedTasks = linkedTasks.filter((t) => t.completed);

      return (
        <>
          <DetailHeader>
            <DetailTitle>📋 {quest.title}</DetailTitle>
            <DetailMeta>
              <MetaBadge
                $variant={quest.status === 'completed' ? 'success' : undefined}
              >
                {quest.status}
              </MetaBadge>
              <MetaBadge>
                {completedTasks.length}/{linkedTasks.length} {t('cmd.tasks_completed')}
              </MetaBadge>
              {quest.deadline && <MetaBadge $variant="warning">📅 {quest.deadline}</MetaBadge>}
            </DetailMeta>
            <EditButton onClick={() => handleEditQuest(quest)}>
              ✏️ {t('cmd.edit_quest')}
            </EditButton>
          </DetailHeader>

          <ProgressBar>
            <ProgressLabel>
              <span>{t('cmd.quest_progress')}</span>
              <span>{quest.progress}%</span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $percent={quest.progress} />
            </ProgressTrack>
          </ProgressBar>

          {quest.description && <Description>{quest.description}</Description>}

          <LinkedItemsSection>
            <SectionTitle>✅ {t('cmd.linked_tasks')} ({linkedTasks.length})</SectionTitle>
            <LinkedItemList>
              {linkedTasks.map((task) => (
                <LinkedItemCard
                  key={task.id}
                  $completed={task.completed}
                  onClick={() => setSelectedItem({ type: 'task', id: task.id })}
                >
                  <LinkedItemName $completed={task.completed}>
                    {task.completed ? '✓ ' : '○ '}
                    {task.name}
                  </LinkedItemName>
                  <LinkedItemMeta>
                    {task.completed
                      ? `${t('cmd.completed_at')} ${task.completedAt?.split('T')[0] || t('cmd.unknown_date')}`
                      : task.deadline
                        ? `${t('cmd.due_date')}: ${task.deadline}`
                        : t('cmd.no_deadline')}
                  </LinkedItemMeta>
                </LinkedItemCard>
              ))}
            </LinkedItemList>
          </LinkedItemsSection>
        </>
      );
    }

    if (selectedItem.type === 'task') {
      const task = customTasks.find((t) => t.id === selectedItem.id);
      if (!task) return null;

      return (
        <>
          <DetailHeader>
            <DetailTitle>
              {task.completed ? '✅' : '📝'} {task.name}
            </DetailTitle>
            <DetailMeta>
              <MetaBadge $variant={task.completed ? 'success' : undefined}>
                {task.completed ? t('cmd.status_completed') : t('cmd.status_in_progress')}
              </MetaBadge>
              <MetaBadge>{task.importance} {t('cmd.importance')}</MetaBadge>
              <MetaBadge>{task.effort} {t('cmd.effort')}</MetaBadge>
              {task.deadline && <MetaBadge $variant="warning">📅 {task.deadline}</MetaBadge>}
            </DetailMeta>
            <EditButton onClick={() => handleEditTask(task)}>
              ✏️ {t('cmd.edit_task')}
            </EditButton>
          </DetailHeader>

          {task.description && <Description>{task.description}</Description>}

          {task.pomodoroCount && task.pomodoroCount > 0 && (
            <LinkedItemsSection>
              <SectionTitle>🍅 {t('cmd.pomodoro_records')}</SectionTitle>
              <MetaBadge>{t('cmd.pomodoro_count').replace('{count}', task.pomodoroCount.toString())}</MetaBadge>
            </LinkedItemsSection>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>🎯 {t('cmd.title')}</PageTitle>
        <PageSubtitle>{t('cmd.subtitle')}</PageSubtitle>
      </PageHeader>

      <StatsGrid>
        <StatCard>
          <StatValue>{stats.seasons}</StatValue>
          <StatLabel>{t('cmd.stat_active_seasons')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.quests}</StatValue>
          <StatLabel>{t('cmd.stat_active_quests')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.tasks}</StatValue>
          <StatLabel>{t('cmd.stat_pending_tasks')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.tasksCompleted}</StatValue>
          <StatLabel>{t('cmd.stat_completed_tasks')}</StatLabel>
        </StatCard>
      </StatsGrid>

      <Breadcrumb items={breadcrumbItems} onClick={handleBreadcrumbClick} />

      <ContentLayout>
        <TreePanel>
          <HierarchyTree
            seasons={activeSeasons}
            quests={mainQuests}
            tasks={customTasks}
            selectedItem={selectedItem}
            onSelect={setSelectedItem}
          />
        </TreePanel>

        <DetailPanel>{renderDetail()}</DetailPanel>
      </ContentLayout>

      {/* Edit Modals */}
      <SeasonWizardModal
        isOpen={isSeasonModalOpen}
        onClose={() => {
          setIsSeasonModalOpen(false);
          setEditingSeason(null);
        }}
        onSubmit={handleSeasonSubmit}
        season={editingSeason}
        categories={defaultCategories}
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
          setEditingQuest(null);
        }}
        onSubmit={handleQuestSubmit}
        quest={editingQuest}
        seasons={activeSeasons}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        mainQuests={mainQuests}
        seasons={activeSeasons}
      />
    </PageContainer>
  );
}

export default CommandCenterPage;
