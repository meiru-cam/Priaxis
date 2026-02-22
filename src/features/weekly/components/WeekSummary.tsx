/**
 * WeekSummary Component
 * Weekly statistics summary - shows upcoming quests and task stats
 */

import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { CustomTask } from '../../../types/task';

interface WeekSummaryProps {
  goals?: never[]; // Deprecated, kept for compatibility
  tasks: CustomTask[];
  upcomingQuests?: number;
  upcomingChapters?: number;
}

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div<{ $color: string }>`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border-top: 3px solid ${({ $color }) => $color};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const ProgressRing = styled.div<{ $progress: number; $color: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: conic-gradient(
    ${({ $color }) => $color} ${({ $progress }) => $progress * 3.6}deg,
    ${({ theme }) => theme.colors.bg.tertiary} ${({ $progress }) => $progress * 3.6}deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
`;

const ProgressInner = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
`;

// Helper to get week boundaries
function getWeekBoundaries(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Helper to check if date is within this week
function isThisWeek(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { start, end } = getWeekBoundaries();
  return date >= start && date <= end;
}

export function WeekSummary({ tasks, upcomingQuests = 0, upcomingChapters = 0 }: WeekSummaryProps) {
  const { t } = useTranslation();
  // Filter for this week
  const thisWeekTasks = tasks.filter((t) => isThisWeek(t.deadline));
  const completedTasks = thisWeekTasks.filter((t) => t.completed);

  // Calculate task completion progress
  const taskProgress = thisWeekTasks.length > 0
    ? Math.round((completedTasks.length / thisWeekTasks.length) * 100)
    : 0;

  return (
    <Container>
      <StatCard $color="#8b5cf6">
        <ProgressRing $progress={taskProgress} $color="#8b5cf6">
          <ProgressInner>{taskProgress}%</ProgressInner>
        </ProgressRing>
        <StatLabel>{t('weekly.completion_rate')}</StatLabel>
      </StatCard>

      <StatCard $color="#f59e0b">
        <StatValue>{completedTasks.length}/{thisWeekTasks.length}</StatValue>
        <StatLabel>{t('weekly.tasks')}</StatLabel>
      </StatCard>

      <StatCard $color="#3b82f6">
        <StatValue>{upcomingQuests}</StatValue>
        <StatLabel>{t('weekly.quests_due')}</StatLabel>
      </StatCard>

      <StatCard $color="#10b981">
        <StatValue>{upcomingChapters}</StatValue>
        <StatLabel>{t('weekly.chapters_due')}</StatLabel>
      </StatCard>
    </Container>
  );
}

export default WeekSummary;
