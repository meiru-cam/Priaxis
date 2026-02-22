/**
 * WeeklyPage Component
 * Main page for weekly calendar view - shows tasks and upcoming quests/chapters
 */

import { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { useGameStore } from '../../stores';
import { Button } from '../../components/ui';
import { WeeklyCalendarView } from './components/WeeklyCalendarView';
import { WeekSummary } from './components/WeekSummary';
import { WeeklyReviewModal } from './components/WeeklyReviewModal';

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

const WeekInfo = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: normal;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ContentSection = styled.section`
  margin-top: 20px;
`;

// Helper to get current week info
function getWeekInfo(): { weekNumber: number; weekRange: string } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d: Date) => d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const weekRange = `${format(monday)} - ${format(sunday)}`;

  return { weekNumber, weekRange };
}

export function WeeklyPage() {
  // Store state
  const customTasks = useGameStore((s) => s.customTasks);
  const archivedTasks = useGameStore((s) => s.archivedTasks);
  const mainQuests = useGameStore((s) => s.mainQuests);
  const activeSeasons = useGameStore((s) => s.activeSeasons);

  // Store actions
  const updateTask = useGameStore((s) => s.updateTask);
  const completeTask = useGameStore((s) => s.completeTask);
  const archiveTask = useGameStore((s) => s.archiveTask);
  const unarchiveTask = useGameStore((s) => s.unarchiveTask);

  // Local state
  const [weekOffset, setWeekOffset] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const { t } = useTranslation();

  // Get current week info
  const { weekNumber, weekRange } = useMemo(() => getWeekInfo(), []);

  // Safety net: Auto-archive any tasks that are completed but still in active list
  useEffect(() => {
    const completedActiveTasks = customTasks.filter(t => t.completed);
    if (completedActiveTasks.length > 0) {
      completedActiveTasks.forEach(t => archiveTask(t.id));
    }
  }, [customTasks, archiveTask]);

  // Get upcoming mainQuests (副本) and chapters (主线篇章) due this week
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - now.getDay()));
    weekEnd.setHours(23, 59, 59, 999);

    const weekEndStr = weekEnd.toISOString();

    // Filter mainQuests (副本) due this week
    const dueQuests = mainQuests.filter(mq => {
      if (!mq.deadline || mq.status === 'completed') return false;
      return mq.deadline <= weekEndStr;
    });

    // Filter season chapters (主线篇章) due this week
    const dueChapters = activeSeasons.flatMap(season =>
      season.chapters.filter(ch => {
        if (!ch.deadline || ch.status === 'completed') return false;
        return ch.deadline <= weekEndStr;
      }).map(ch => ({ ...ch, questTitle: season.name }))
    );

    return { quests: dueQuests, chapters: dueChapters };
  }, [mainQuests, activeSeasons]);

  // Handlers
  const handleToggleTaskComplete = (taskId: string) => {
    // Check active tasks
    const activeTask = customTasks.find((t) => t.id === taskId);
    if (activeTask) {
      if (activeTask.completed) {
        updateTask(taskId, { completed: false, completedAt: undefined });
      } else {
        completeTask(taskId, 'Quick completed from Weekly View');
        archiveTask(taskId);
      }
      return;
    }

    // Check archived tasks
    const archivedTask = archivedTasks.find(t => t.id === taskId);
    if (archivedTask) {
      unarchiveTask(taskId);
      updateTask(taskId, { completed: false, completedAt: undefined });
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          📅 {t('weekly.title')}
          <WeekInfo>{t('weekly.week_info').replace('{week}', weekNumber.toString())} ({weekRange})</WeekInfo>
        </PageTitle>

        <HeaderActions>
          <Button variant="secondary" onClick={() => setIsReviewModalOpen(true)}>
            ✍️ {t('weekly.review_btn')}
          </Button>
        </HeaderActions>
      </PageHeader>

      <WeekSummary
        goals={[]}
        tasks={[...customTasks, ...archivedTasks]}
        upcomingQuests={upcomingItems.quests.length}
        upcomingChapters={upcomingItems.chapters.length}
      />

      <ContentSection>
        <WeeklyCalendarView
          tasks={customTasks}
          archivedTasks={archivedTasks}
          weeklyGoals={[]}
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
          onToggleComplete={handleToggleTaskComplete}
          upcomingQuests={upcomingItems.quests}
          upcomingChapters={upcomingItems.chapters}
        />
      </ContentSection>

      <WeeklyReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
      />
    </PageContainer>
  );
}

export default WeeklyPage;
