/**
 * WeeklyGoalCard Component
 * Card for displaying a weekly goal with progress
 */

import styled from 'styled-components';
import type { WeeklyGoal, Importance } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface WeeklyGoalCardProps {
  goal: WeeklyGoal;
  onEdit: (goal: WeeklyGoal) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

const Card = styled.div<{ $status: string; $importance: Importance }>`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  opacity: ${({ $status }) => ($status === 'completed' || $status === 'cancelled' ? 0.7 : 1)};
  border-left: 4px solid ${({ $importance }) =>
    $importance === 'high' ? '#ef4444' : $importance === 'medium' ? '#f59e0b' : '#10b981'};

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const GoalTitle = styled.h3<{ $completed: boolean }>`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
`;

const GoalDescription = styled.p`
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`;

const ProgressContainer = styled.div`
  margin-bottom: 12px;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number; $status: string }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: ${({ $status, theme }) =>
    $status === 'completed'
      ? theme.colors.accent.green
      : theme.colors.accent.purple};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const ProgressSlider = styled.input`
  width: 100%;
  margin-top: 8px;
  cursor: pointer;
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 12px;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $status }) =>
    $status === 'completed'
      ? 'rgba(16, 185, 129, 0.2)'
      : $status === 'cancelled'
      ? 'rgba(107, 114, 128, 0.2)'
      : 'rgba(139, 92, 246, 0.2)'};
  color: ${({ $status }) =>
    $status === 'completed'
      ? '#10b981'
      : $status === 'cancelled'
      ? '#6b7280'
      : '#8b5cf6'};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'success' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? 'rgba(239, 68, 68, 0.1)'
      : $variant === 'success'
      ? 'rgba(16, 185, 129, 0.1)'
      : theme.colors.bg.tertiary};
  color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? '#ef4444'
      : $variant === 'success'
      ? '#10b981'
      : theme.colors.text.secondary};

  &:hover {
    background: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? 'rgba(239, 68, 68, 0.2)'
        : $variant === 'success'
        ? 'rgba(16, 185, 129, 0.2)'
        : theme.colors.bg.secondary};
  }
`;

export function WeeklyGoalCard({
  goal,
  onEdit,
  onDelete,
  onComplete,
  onUpdateProgress,
}: WeeklyGoalCardProps) {
  const { t, language } = useTranslation();
  const isCompleted = goal.status === 'completed';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('weekly.goal_card.status_completed');
      case 'cancelled':
        return t('weekly.goal_card.status_cancelled');
      default:
        return t('weekly.goal_card.status_active');
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseInt(e.target.value, 10);
    onUpdateProgress(goal.id, newProgress);

    // Auto-complete when reaching 100%
    if (newProgress >= 100 && goal.status === 'active') {
      onComplete(goal.id);
    }
  };

  return (
    <Card $status={goal.status} $importance={goal.importance}>
      <CardHeader>
        <GoalTitle $completed={isCompleted}>{goal.name}</GoalTitle>
        <StatusBadge $status={goal.status}>{getStatusLabel(goal.status)}</StatusBadge>
      </CardHeader>

      {goal.description && <GoalDescription>{goal.description}</GoalDescription>}

      <ProgressContainer>
        <ProgressBar>
          <ProgressFill $progress={goal.progress} $status={goal.status} />
        </ProgressBar>
        <ProgressText>
          <span>{goal.progress}%</span>
          <span>{t('weekly.goal_card.deadline', { date: formatDate(goal.deadline) })}</span>
        </ProgressText>
        {goal.status === 'active' && (
          <ProgressSlider
            type="range"
            min="0"
            max="100"
            value={goal.progress}
            onChange={handleProgressChange}
          />
        )}
      </ProgressContainer>

      <MetaInfo>
        <MetaItem>
          <span>
            {goal.importance === 'high' ? '🔴' : goal.importance === 'medium' ? '🟡' : '🟢'}
          </span>
          <span>{goal.importance === 'high' ? t('weekly.legend_high') : goal.importance === 'medium' ? t('weekly.legend_medium') : t('weekly.legend_low')}</span>
        </MetaItem>
        <MetaItem>
          📅 {formatDate(goal.weekStartDate)} - {formatDate(goal.deadline)}
        </MetaItem>
        {goal.linkedTasks && goal.linkedTasks.length > 0 && (
          <MetaItem>{t('weekly.goal_card.linked_tasks', { count: goal.linkedTasks.length })}</MetaItem>
        )}
        {goal.linkedQuestIds && goal.linkedQuestIds.length > 0 && (
          <MetaItem>{t('weekly.goal_card.linked_quests', { count: goal.linkedQuestIds.length })}</MetaItem>
        )}
      </MetaInfo>

      <Actions>
        <ActionButton onClick={() => onEdit(goal)}>{t('weekly.goal_card.edit')}</ActionButton>
        {goal.status === 'active' && (
          <ActionButton $variant="success" onClick={() => onComplete(goal.id)}>
            {t('weekly.goal_card.complete')}
          </ActionButton>
        )}
        <ActionButton $variant="danger" onClick={() => onDelete(goal.id)}>
          {t('daily.delete_btn')}
        </ActionButton>
      </Actions>
    </Card>
  );
}

export default WeeklyGoalCard;
