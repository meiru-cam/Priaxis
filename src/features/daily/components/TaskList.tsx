/**
 * TaskList Component
 * Displays tasks in a vertical list format
 */

import styled from 'styled-components';
import type { CustomTask } from '../../../types/task';
import { TaskItem } from './TaskItem';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface TaskListProps {
  tasks: CustomTask[];
  onComplete: (id: string) => void;
  onEdit: (task: CustomTask) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onPin?: (id: string) => void;
  onStart?: (id: string) => void;
  onStartPomodoro?: (task: CustomTask) => void;
  onConvertToQuest?: (id: string) => void;
  onQuickUpdate?: (id: string, updates: Partial<CustomTask>) => void;
  onDoDComplete?: (task: CustomTask) => void;
  emptyMessage?: string;
  showCompleted?: boolean;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`;

const SectionTitle = styled.h4`
  margin: 20px 0 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border.primary};
  }
`;

const TaskCount = styled.span`
  font-size: 0.8rem;
  font-weight: normal;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: 8px;
`;

export function TaskList({
  tasks,
  onComplete,
  onEdit,
  onDelete,
  onArchive,
  onPin,
  onStart,
  onStartPomodoro,
  onConvertToQuest,
  onQuickUpdate,
  onDoDComplete,
  emptyMessage,
  showCompleted = true,
}: TaskListProps) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t('daily.no_tasks');
  // Separate completed and pending tasks
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Sort pending tasks: pinned first, then by importance and deadline
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    // Pinned tasks always first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Then by importance
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    const importanceA = importanceOrder[a.importance || 'low'];
    const importanceB = importanceOrder[b.importance || 'low'];
    if (importanceA !== importanceB) return importanceA - importanceB;

    // Then by deadline
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;

    // Finally by creation time
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (tasks.length === 0) {
    return <EmptyState>{resolvedEmptyMessage}</EmptyState>;
  }

  return (
    <ListContainer>
      {sortedPendingTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onPin={onPin}
          onStart={onStart}
          onStartPomodoro={onStartPomodoro}
          onConvertToQuest={onConvertToQuest}
          onQuickUpdate={onQuickUpdate}
          onDoDComplete={onDoDComplete}
        />
      ))}

      {showCompleted && completedTasks.length > 0 && (
        <>
          <SectionTitle>
            {t('weekly.legend_completed')}
            <TaskCount>({completedTasks.length})</TaskCount>
          </SectionTitle>
          {completedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onQuickUpdate={onQuickUpdate}
              onDoDComplete={onDoDComplete}
              compact
            />
          ))}
        </>
      )}
    </ListContainer>
  );
}

export default TaskList;
