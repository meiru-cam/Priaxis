/**
 * ArchivedTaskList Component
 * Specialized list for archived tasks - no completion filtering, sorted by archive date
 */

import styled from 'styled-components';
import type { ArchivedTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { TranslationKey } from '../../../lib/i18n/types';

interface ArchivedTaskListProps {
  tasks: ArchivedTask[];
  onUnarchive: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`;

const ArchivedItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  opacity: 0.8;
  transition: all 0.2s ease;

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`;

const TaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskName = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: line-through;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TaskMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-left: 12px;
  flex-shrink: 0;
`;

const ActionButton = styled.button<{ $variant?: 'danger' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ theme, $variant }) =>
    $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : theme.colors.bg.secondary};
  color: ${({ theme, $variant }) =>
    $variant === 'danger' ? theme.colors.status.danger.text : theme.colors.text.secondary};

  &:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }
`;

// Format relative time
function formatRelativeTime(
  dateString: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('daily.archived.today');
  if (diffDays === 1) return t('daily.archived.yesterday');
  if (diffDays < 7) return t('daily.archived.days_ago', { count: diffDays });
  if (diffDays < 30) return t('daily.archived.weeks_ago', { count: Math.floor(diffDays / 7) });
  if (diffDays < 365) return t('daily.archived.months_ago', { count: Math.floor(diffDays / 30) });
  return t('daily.archived.years_ago', { count: Math.floor(diffDays / 365) });
}

export function ArchivedTaskList({
  tasks,
  onUnarchive,
  onDelete,
  emptyMessage,
}: ArchivedTaskListProps) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t('daily.empty_archived');
  // Sort by archivedAt descending (most recent first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = new Date(a.archivedAt || a.completedAt || a.createdAt);
    const dateB = new Date(b.archivedAt || b.completedAt || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  if (tasks.length === 0) {
    return <EmptyState>{resolvedEmptyMessage}</EmptyState>;
  }

  return (
    <ListContainer>
      {sortedTasks.map((task) => (
        <ArchivedItem key={task.id}>
          <TaskInfo>
            <TaskName>
              {task.completed ? '✓ ' : ''}
              {task.name}
            </TaskName>
            <TaskMeta>
              <span>{t('daily.archived.archived_at', { time: formatRelativeTime(task.archivedAt || task.createdAt, t) })}</span>
              {task.completedAt && (
                <span>{t('daily.archived.completed_at', { time: formatRelativeTime(task.completedAt, t) })}</span>
              )}
              {task.pomodoroCount && task.pomodoroCount > 0 && (
                <span>🍅 x{task.pomodoroCount}</span>
              )}
            </TaskMeta>
          </TaskInfo>
          <ActionButtons>
            <ActionButton onClick={() => onUnarchive(task.id)}>{t('daily.archived.restore')}</ActionButton>
            {onDelete && (
              <ActionButton $variant="danger" onClick={() => onDelete(task.id)}>
                🗑️
              </ActionButton>
            )}
          </ActionButtons>
        </ArchivedItem>
      ))}
    </ListContainer>
  );
}

export default ArchivedTaskList;
