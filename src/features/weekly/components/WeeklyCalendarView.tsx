/**
 * WeeklyCalendarView Component
 * 2x4 grid view: Mon-Thu in first row, Fri-Sun + Upcoming Quests in second row
 */

import { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { CustomTask, ArchivedTask, MainQuest } from '../../../types/task';

interface UpcomingChapter {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  questTitle: string;
}

interface WeeklyCalendarViewProps {
  tasks: CustomTask[];
  archivedTasks?: ArchivedTask[];
  weeklyGoals?: never[]; // Deprecated
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onTaskClick?: (task: CustomTask) => void;
  onToggleComplete?: (taskId: string) => void;
  upcomingQuests?: MainQuest[];
  upcomingChapters?: UpcomingChapter[];
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const WeekNavigation = styled.div`
  display: flex;
  gap: 8px;
`;

const NavButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${({ theme, $primary }) =>
    $primary ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ $primary }) =>
    $primary ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.accent.purple : theme.colors.text.secondary};
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const DateRange = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const DayCard = styled.div<{ $isToday?: boolean }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 2px solid ${({ theme, $isToday }) =>
    $isToday ? theme.colors.accent.purple : theme.colors.border.primary};
  border-radius: 12px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${({ $isToday }) =>
    $isToday &&
    `
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  `}
`;

const DayHeader = styled.div<{ $isToday?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: ${({ theme, $isToday }) =>
    $isToday ? 'rgba(139, 92, 246, 0.1)' : theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const DayName = styled.div<{ $isToday?: boolean }>`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${({ theme, $isToday }) =>
    $isToday ? theme.colors.accent.purple : theme.colors.text.primary};
`;

const DayDate = styled.div<{ $isToday?: boolean }>`
  font-size: 0.85rem;
  color: ${({ theme, $isToday }) =>
    $isToday ? theme.colors.accent.purple : theme.colors.text.tertiary};
  font-weight: ${({ $isToday }) => ($isToday ? '600' : '400')};
`;

const DayTasks = styled.div`
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 200px;
`;

const TaskItem = styled.div<{ $completed: boolean; $importance: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${({ $completed }) => ($completed ? 0.6 : 1)};
  border-left: 3px solid ${({ $importance }) =>
    $importance === 'high' ? '#ef4444' : $importance === 'medium' ? '#f59e0b' : '#10b981'};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const TaskCheckmark = styled.span<{ $completed: boolean }>`
  font-size: 0.75rem;
  color: ${({ $completed }) => ($completed ? '#10b981' : '#9ca3af')};
`;

const TaskName = styled.span<{ $completed: boolean }>`
  flex: 1;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NoTasks = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.8rem;
  text-align: center;
  padding: 20px 10px;
`;

// Upcoming Card (last cell in second row)
const UpcomingCard = styled(DayCard)`
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors.bg.card} 0%,
    rgba(59, 130, 246, 0.05) 100%);
`;

const UpcomingHeader = styled(DayHeader)`
  background: rgba(59, 130, 246, 0.1);
`;

const UpcomingContent = styled.div`
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
`;

const UpcomingItem = styled.div<{ $type: 'quest' | 'chapter' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 6px;
  border-left: 3px solid ${({ $type }) =>
    $type === 'quest' ? '#3b82f6' : '#10b981'};
`;

const UpcomingIcon = styled.span`
  font-size: 0.9rem;
`;

const UpcomingName = styled.span`
  flex: 1;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UpcomingDue = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Legend = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 8px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LegendBadge = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

// Date helpers
function getMonday(weekOffset: number): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateFull(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

const DAYS = [
  'weekly.day_mon',
  'weekly.day_tue',
  'weekly.day_wed',
  'weekly.day_thu',
  'weekly.day_fri',
  'weekly.day_sat',
  'weekly.day_sun',
] as const;

export function WeeklyCalendarView({
  tasks,
  archivedTasks = [],
  weekOffset,
  onWeekChange,
  onTaskClick,
  onToggleComplete,
  upcomingQuests = [],
  upcomingChapters = [],
}: WeeklyCalendarViewProps) {
  const { t } = useTranslation();
  const monday = useMemo(() => getMonday(weekOffset), [weekOffset]);

  // Get week date range
  const weekRange = useMemo(() => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekLabel = weekOffset === 0
      ? t('weekly.this_week')
      : weekOffset < 0
        ? t('weekly.weeks_ago').replace('{count}', (-weekOffset).toString())
        : t('weekly.weeks_later').replace('{count}', weekOffset.toString());
    return `${weekLabel}: ${formatDate(monday)} - ${formatDate(sunday)}`;
  }, [monday, weekOffset, t]);

  // Group tasks by date (including archived tasks)
  const tasksByDate = useMemo(() => {
    const map: Record<string, CustomTask[]> = {};

    // Helper to add task to map
    const addToMap = (task: CustomTask) => {
      // For completed tasks, use completedAt date
      if (task.completed && task.completedAt) {
        const completedDate = task.completedAt.split('T')[0];
        if (!map[completedDate]) map[completedDate] = [];
        map[completedDate].push(task);
      }
      // For incomplete tasks, use deadline
      else if (!task.completed && task.deadline) {
        if (!map[task.deadline]) map[task.deadline] = [];
        map[task.deadline].push(task);
      }
    };

    // Add active tasks
    tasks.forEach(addToMap);

    // Add archived tasks (they are always completed)
    archivedTasks.forEach((archivedTask) => {
      addToMap(archivedTask as CustomTask);
    });

    return map;
  }, [tasks, archivedTasks]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): CustomTask[] => {
    const dateStr = formatDateFull(date);
    const dayTasks = tasksByDate[dateStr] || [];

    // Sort: incomplete first, then by importance
    return dayTasks.sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return (importanceOrder[a.importance] || 2) - (importanceOrder[b.importance] || 2);
    });
  };

  // Render a day card
  const renderDayCard = (dayInfo: { name: string; index: number }) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayInfo.index);
    const today = isToday(date);
    const dayTasks = getTasksForDate(date);

    return (
      <DayCard key={dayInfo.name} $isToday={today}>
        <DayHeader $isToday={today}>
          <DayName $isToday={today}>{dayInfo.name}</DayName>
          <DayDate $isToday={today}>{formatDate(date)}</DayDate>
        </DayHeader>
        <DayTasks>
          {dayTasks.length > 0 ? (
            dayTasks.map((task) => (
              <TaskItem
                key={task.id}
                $completed={task.completed}
                $importance={task.importance}
                onClick={() => onTaskClick?.(task)}
              >
                <TaskCheckmark
                  $completed={task.completed}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete?.(task.id);
                  }}
                >
                  {task.completed ? '✓' : '○'}
                </TaskCheckmark>
                <TaskName $completed={task.completed}>{task.name}</TaskName>
              </TaskItem>
            ))
          ) : (
            <NoTasks>{t('weekly.no_tasks')}</NoTasks>
          )}
        </DayTasks>
      </DayCard>
    );
  };

  // Render upcoming quests/chapters card
  const renderUpcomingCard = () => {
    const totalUpcoming = upcomingQuests.length + upcomingChapters.length;

    return (
      <UpcomingCard>
        <UpcomingHeader>
          <DayName>📋 {t('weekly.due_soon')}</DayName>
          <DayDate>{totalUpcoming} {t('weekly.count_suffix')}</DayDate>
        </UpcomingHeader>
        <UpcomingContent>
          {totalUpcoming > 0 ? (
            <>
              {upcomingQuests.map((quest) => (
                <UpcomingItem key={quest.id} $type="quest">
                  <UpcomingIcon>📋</UpcomingIcon>
                  <UpcomingName>{quest.title}</UpcomingName>
                  {quest.deadline && (
                    <UpcomingDue>{new Date(quest.deadline).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</UpcomingDue>
                  )}
                </UpcomingItem>
              ))}
              {upcomingChapters.map((chapter) => (
                <UpcomingItem key={chapter.id} $type="chapter">
                  <UpcomingIcon>📜</UpcomingIcon>
                  <UpcomingName title={chapter.questTitle}>{chapter.title}</UpcomingName>
                  {chapter.dueDate && (
                    <UpcomingDue>{new Date(chapter.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</UpcomingDue>
                  )}
                </UpcomingItem>
              ))}
            </>
          ) : (
            <NoTasks>{t('weekly.no_due_soon')}</NoTasks>
          )}
        </UpcomingContent>
      </UpcomingCard>
    );
  };

  return (
    <Container>
      <Header>
        <WeekNavigation>
          <NavButton onClick={() => onWeekChange(weekOffset - 1)}>{t('weekly.prev_week')}</NavButton>
          <NavButton $primary onClick={() => onWeekChange(0)}>{t('weekly.this_week')}</NavButton>
          <NavButton onClick={() => onWeekChange(weekOffset + 1)}>{t('weekly.next_week')}</NavButton>
        </WeekNavigation>
        <DateRange>{weekRange}</DateRange>
      </Header>

      <CalendarGrid>
        {/* First row: Mon-Thu */}
        {DAYS.slice(0, 4).map((key, i) => renderDayCard({ name: t(key), index: i }))}

        {/* Second row: Fri-Sun + Upcoming */}
        {DAYS.slice(4).map((key, i) => renderDayCard({ name: t(key), index: i + 4 }))}
        {renderUpcomingCard()}
      </CalendarGrid>

      <Legend>
        <LegendItem>
          <LegendBadge $color="#ef4444" /> {t('weekly.legend_high')}
        </LegendItem>
        <LegendItem>
          <LegendBadge $color="#f59e0b" /> {t('weekly.legend_medium')}
        </LegendItem>
        <LegendItem>
          <LegendBadge $color="#10b981" /> {t('weekly.legend_low')}
        </LegendItem>
        <LegendItem>
          <LegendBadge $color="#3b82f6" /> {t('weekly.legend_quest')}
        </LegendItem>
        <LegendItem>
          <TaskCheckmark $completed>✓</TaskCheckmark> {t('weekly.legend_completed')}
        </LegendItem>
      </Legend>
    </Container>
  );
}

export default WeeklyCalendarView;
