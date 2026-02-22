/**
 * HabitCard Component
 * Card for displaying a habit with check-in button
 */

import styled from 'styled-components';
import type { Habit } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface HabitCardProps {
  habit: Habit;
  onCheckIn: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  isArchived?: boolean;
}

const Card = styled.div<{ $completed: boolean }>`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;

  ${({ $completed }) =>
    $completed &&
    `
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.3);
  `}

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const HabitInfo = styled.div`
  flex: 1;
`;

const HabitTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Emoji = styled.span`
  font-size: 1.3rem;
`;

const HabitDescription = styled.p`
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const CheckInButton = styled.button<{ $checked: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid ${({ $checked, theme }) =>
    $checked ? theme.colors.accent.green : theme.colors.border.secondary};
  background: ${({ $checked, theme }) =>
    $checked ? theme.colors.accent.green : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;

  &:hover {
    transform: scale(1.05);
    border-color: ${({ theme }) => theme.colors.accent.green};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const StatItem = styled.div`
  text-align: center;
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const FrequencyBadge = styled.span`
  padding: 4px 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 4px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CategoryBadge = styled.span`
  padding: 4px 8px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  font-size: 0.75rem;
  color: #8b5cf6;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ActionButton = styled.button<{ $variant?: 'danger' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ theme, $variant }) =>
    $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : theme.colors.bg.tertiary};
  color: ${({ theme, $variant }) =>
    $variant === 'danger' ? '#ef4444' : theme.colors.text.secondary};

  &:hover {
    background: ${({ theme, $variant }) =>
      $variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' : theme.colors.bg.secondary};
  }
`;

const TodayProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ProgressDots = styled.div`
  display: flex;
  gap: 4px;
`;

const ProgressDot = styled.div<{ $filled: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $filled, theme }) =>
    $filled ? theme.colors.accent.green : theme.colors.border.secondary};
`;

// Helper to get today's date string
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get category label
export function HabitCard({
  habit,
  onCheckIn,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  isArchived = false,
}: HabitCardProps) {
  const { t } = useTranslation();
  const today = getToday();
  const todayEntry = habit.completionHistory[today];
  const todayCount = todayEntry?.count || 0;
  const targetPerDay = habit.targetPerDay || 1;
  const isCompletedToday = todayCount >= targetPerDay;

  const getCategoryLabel = (category?: string): string => {
    const labels: Record<string, string> = {
      health: t('recurring.cat_health'),
      productivity: t('recurring.cat_productivity'),
      mindfulness: t('recurring.cat_mindfulness'),
      learning: t('recurring.cat_learning'),
      fitness: t('recurring.cat_fitness'),
      social: t('recurring.cat_social'),
    };
    return category ? labels[category] || category : '';
  };

  const getFrequencyLabel = () => {
    if (habit.frequencyType === 'daily') {
      return t('recurring.habit_card.daily_frequency', { count: targetPerDay });
    }
    return t('recurring.habit_card.weekly_frequency', { count: habit.targetDaysPerWeek || 7 });
  };

  return (
    <Card $completed={isCompletedToday}>
      <CardHeader>
        <HabitInfo>
          <HabitTitle>
            {habit.emoji && <Emoji>{habit.emoji}</Emoji>}
            {habit.name}
          </HabitTitle>
          {habit.description && (
            <HabitDescription>{habit.description}</HabitDescription>
          )}
        </HabitInfo>
        <CheckInButton
          $checked={isCompletedToday}
          onClick={() => !isArchived && onCheckIn(habit.id)}
          title={isCompletedToday ? t('recurring.habit_card.done_today') : t('recurring.habit_card.check_in')}
          disabled={isArchived}
        >
          {isCompletedToday ? '✓' : '+'}
        </CheckInButton>
      </CardHeader>

      {targetPerDay > 1 && (
        <TodayProgress>
          <span>{t('recurring.habit_card.today_progress')}</span>
          <ProgressDots>
            {Array.from({ length: targetPerDay }).map((_, i) => (
              <ProgressDot key={i} $filled={i < todayCount} />
            ))}
          </ProgressDots>
          <span>{todayCount}/{targetPerDay}</span>
        </TodayProgress>
      )}

      <StatsRow>
        <StatItem>
          <StatValue>{habit.streak}</StatValue>
          <StatLabel>{t('recurring.habit_card.current_streak')}</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{habit.longestStreak}</StatValue>
          <StatLabel>{t('recurring.habit_card.longest_streak')}</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{habit.totalCompletions}</StatValue>
          <StatLabel>{t('recurring.habit_card.total_completions')}</StatLabel>
        </StatItem>
      </StatsRow>

      <BadgeRow>
        <FrequencyBadge>{getFrequencyLabel()}</FrequencyBadge>
        {habit.category && (
          <CategoryBadge>{getCategoryLabel(habit.category)}</CategoryBadge>
        )}
      </BadgeRow>

      <Actions>
        {!isArchived && (
          <ActionButton onClick={() => onEdit(habit)}>{t('recurring.action_edit')}</ActionButton>
        )}
        {isArchived ? (
          <ActionButton onClick={() => onRestore?.(habit.id)}>{t('quest.card.unarchive')}</ActionButton>
        ) : (
          <ActionButton onClick={() => onArchive(habit.id)}>{t('quest.action.archive')}</ActionButton>
        )}
        <ActionButton $variant="danger" onClick={() => onDelete(habit.id)}>
          {t('daily.delete_btn')}
        </ActionButton>
      </Actions>
    </Card>
  );
}

export default HabitCard;
