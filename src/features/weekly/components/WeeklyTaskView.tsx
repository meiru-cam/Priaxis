/**
 * WeeklyTaskView Component
 * Shows this week's tasks grouped by status
 */

import styled from 'styled-components';
import type { CustomTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { TranslationKey } from '../../../lib/i18n/types';

interface WeeklyTaskViewProps {
  tasks: CustomTask[];
  onTaskClick?: (task: CustomTask) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Section = styled.div``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TaskCount = styled.span`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaskItem = styled.div<{ $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${({ $completed }) => ($completed ? 0.7 : 1)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const TaskCheckbox = styled.div<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $checked, theme }) =>
    $checked ? theme.colors.accent.green : theme.colors.border.secondary};
  background: ${({ $checked, theme }) =>
    $checked ? theme.colors.accent.green : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &::after {
    content: '${({ $checked }) => ($checked ? '✓' : '')}';
    color: white;
    font-size: 0.75rem;
  }
`;

const TaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskName = styled.div<{ $completed: boolean }>`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TaskMeta = styled.div`
  display: flex;
  gap: 8px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const DeadlineBadge = styled.span<{ $urgent: boolean }>`
  color: ${({ $urgent }) => ($urgent ? '#ef4444' : 'inherit')};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
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

// Helper to check if date is past
function isPast(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
}

// Helper to format date
function formatDeadline(
  dateStr: string,
  language: 'zh' | 'en',
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return t('weekly.task_view.today');
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return t('weekly.task_view.tomorrow');
  }

  return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function WeeklyTaskView({ tasks, onTaskClick }: WeeklyTaskViewProps) {
  const { t, language } = useTranslation();
  // Filter tasks for this week
  const thisWeekTasks = tasks.filter((task) => isThisWeek(task.deadline));

  // Group tasks by status
  const scheduledTasks = thisWeekTasks.filter(
    (t) => !t.completed && t.deadline && !isPast(t.deadline)
  );
  const completedTasks = thisWeekTasks.filter((t) => t.completed);
  const overdueTasks = thisWeekTasks.filter(
    (t) => !t.completed && t.deadline && isPast(t.deadline)
  );

  // Calculate stats
  const totalTasks = thisWeekTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const renderTask = (task: CustomTask) => (
    <TaskItem
      key={task.id}
      $completed={task.completed}
      onClick={() => onTaskClick?.(task)}
    >
      <TaskCheckbox $checked={task.completed} />
      <TaskInfo>
        <TaskName $completed={task.completed}>{task.name}</TaskName>
        <TaskMeta>
          {task.deadline && (
            <DeadlineBadge $urgent={isPast(task.deadline) && !task.completed}>
              {formatDeadline(task.deadline, language, t)}
            </DeadlineBadge>
          )}
          <span>
            {task.importance === 'high' ? '🔴' : task.importance === 'medium' ? '🟡' : '🟢'}
          </span>
        </TaskMeta>
      </TaskInfo>
    </TaskItem>
  );

  return (
    <Container>
      {/* Summary */}
      <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{completionRate}%</div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          {t('weekly.task_view.summary', { completed: completedTasks.length, total: totalTasks })}
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>
              <span>⏰</span> {t('weekly.task_view.overdue')}
              <TaskCount>{overdueTasks.length}</TaskCount>
            </SectionTitle>
          </SectionHeader>
          <TaskList>{overdueTasks.map(renderTask)}</TaskList>
        </Section>
      )}

      {/* Scheduled */}
      <Section>
        <SectionHeader>
          <SectionTitle>
            <span>📅</span> {t('weekly.task_view.scheduled')}
            <TaskCount>{scheduledTasks.length}</TaskCount>
          </SectionTitle>
        </SectionHeader>
        {scheduledTasks.length > 0 ? (
          <TaskList>{scheduledTasks.map(renderTask)}</TaskList>
        ) : (
          <EmptyState>{t('weekly.task_view.empty')}</EmptyState>
        )}
      </Section>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>
              <span>✅</span> {t('weekly.task_view.completed')}
              <TaskCount>{completedTasks.length}</TaskCount>
            </SectionTitle>
          </SectionHeader>
          <TaskList>{completedTasks.map(renderTask)}</TaskList>
        </Section>
      )}
    </Container>
  );
}

export default WeeklyTaskView;
