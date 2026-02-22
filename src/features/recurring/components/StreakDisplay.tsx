/**
 * StreakDisplay Component
 * Shows streak information for habits
 */

import styled, { keyframes } from 'styled-components';
import type { Habit } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface StreakDisplayProps {
  habit: Habit;
  size?: 'sm' | 'md' | 'lg';
}

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const Container = styled.div<{ $size: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => ($size === 'lg' ? '16px' : $size === 'md' ? '12px' : '8px')};
  padding: ${({ $size }) =>
    $size === 'lg' ? '20px 28px' : $size === 'md' ? '14px 20px' : '8px 14px'};
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  border-radius: ${({ $size }) => ($size === 'lg' ? '16px' : $size === 'md' ? '12px' : '8px')};
  color: white;
`;

const FireIcon = styled.div<{ $size: string; $active: boolean }>`
  font-size: ${({ $size }) => ($size === 'lg' ? '2.5rem' : $size === 'md' ? '1.8rem' : '1.2rem')};
  animation: ${({ $active }) => ($active ? pulse : 'none')} 2s ease-in-out infinite;
`;

const StreakInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StreakValue = styled.div<{ $size: string }>`
  font-size: ${({ $size }) => ($size === 'lg' ? '2rem' : $size === 'md' ? '1.4rem' : '1rem')};
  font-weight: bold;
  line-height: 1;
`;

const StreakLabel = styled.div<{ $size: string }>`
  font-size: ${({ $size }) => ($size === 'lg' ? '0.9rem' : $size === 'md' ? '0.8rem' : '0.7rem')};
  opacity: 0.9;
`;

const BestBadge = styled.div<{ $size: string }>`
  padding: ${({ $size }) => ($size === 'lg' ? '4px 10px' : '2px 6px')};
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: ${({ $size }) => ($size === 'lg' ? '0.8rem' : '0.65rem')};
  display: flex;
  align-items: center;
  gap: 4px;
`;

// Helper to check if streak is at personal best
function isPersonalBest(habit: Habit): boolean {
  return habit.streak > 0 && habit.streak >= habit.longestStreak;
}

// Helper to get streak message
export function StreakDisplay({ habit, size = 'md' }: StreakDisplayProps) {
  const { t } = useTranslation();
  const isPB = isPersonalBest(habit);
  const message = habit.streak === 0
    ? t('recurring.streak.msg_0')
    : habit.streak === 1
      ? t('recurring.streak.msg_1')
      : habit.streak < 7
        ? t('recurring.streak.msg_lt_7')
        : habit.streak < 21
          ? t('recurring.streak.msg_lt_21')
          : habit.streak < 30
            ? t('recurring.streak.msg_lt_30')
            : habit.streak < 66
              ? t('recurring.streak.msg_lt_66')
              : t('recurring.streak.msg_master');

  return (
    <Container $size={size}>
      <FireIcon $size={size} $active={habit.streak > 0}>
        🔥
      </FireIcon>
      <StreakInfo>
        <StreakValue $size={size}>{t('recurring.streak.days', { count: habit.streak })}</StreakValue>
        <StreakLabel $size={size}>{message}</StreakLabel>
      </StreakInfo>
      {isPB && habit.streak > 1 && (
        <BestBadge $size={size}>
          <span>👑</span>
          <span>{t('recurring.streak.best')}</span>
        </BestBadge>
      )}
    </Container>
  );
}

// Compact version for list views
const CompactContainer = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${({ $active }) => ($active ? '#f59e0b' : '#e5e7eb')};
  border-radius: 12px;
  color: ${({ $active }) => ($active ? 'white' : '#6b7280')};
  font-size: 0.85rem;
  font-weight: 600;
`;

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <CompactContainer $active={streak > 0}>
      <span>🔥</span>
      <span>{streak}</span>
    </CompactContainer>
  );
}

export default StreakDisplay;
