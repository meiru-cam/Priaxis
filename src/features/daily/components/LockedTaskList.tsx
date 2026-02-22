import styled from 'styled-components';
import type { CustomTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

export interface LockedTaskMeta {
  type: 'quest' | 'chapter' | 'season';
  unlockTime?: string;
}

interface LockedTaskListProps {
  tasks: CustomTask[];
  lockMetaByTaskId: Record<string, LockedTaskMeta>;
  onEdit: (task: CustomTask) => void;
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

const LockedItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TaskMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const LockBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #9ca3af;
  background: rgba(156, 163, 175, 0.12);
  color: #6b7280;
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

export function LockedTaskList({
  tasks,
  lockMetaByTaskId,
  onEdit,
  onDelete,
  emptyMessage,
}: LockedTaskListProps) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t('daily.empty_locked');

  if (tasks.length === 0) {
    return <EmptyState>{resolvedEmptyMessage}</EmptyState>;
  }

  return (
    <ListContainer>
      {tasks.map((task) => {
        const meta = lockMetaByTaskId[task.id];
        const reason = meta?.type === 'quest'
          ? t('daily.locked_reason_quest')
          : meta?.type === 'chapter'
            ? t('daily.locked_reason_chapter')
            : t('daily.locked_reason_season');

        return (
          <LockedItem key={task.id}>
            <TaskInfo>
              <TaskName>🔒 {task.name}</TaskName>
              <TaskMeta>
                <LockBadge>{reason}</LockBadge>
                {meta?.unlockTime && (
                  <span>{t('daily.locked_unlock_time', { date: meta.unlockTime })}</span>
                )}
              </TaskMeta>
            </TaskInfo>
            <ActionButtons>
              <ActionButton onClick={() => onEdit(task)}>{t('cmd.edit_task')}</ActionButton>
              {onDelete && (
                <ActionButton $variant="danger" onClick={() => onDelete(task.id)}>
                  🗑️
                </ActionButton>
              )}
            </ActionButtons>
          </LockedItem>
        );
      })}
    </ListContainer>
  );
}

export default LockedTaskList;
