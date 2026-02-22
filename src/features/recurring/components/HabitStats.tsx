/**
 * HabitStats Component
 * Statistics summary for all habits
 */

import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { Habit } from '../../../types/task';

interface HabitStatsProps {
  habits: Habit[];
}

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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

const StatIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const ProgressRing = styled.div<{ $progress: number; $color: string }>`
  width: 50px;
  height: 50px;
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
`;

// Helper to get today's date string
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to calculate week's completion rate
function getWeekCompletionRate(habits: Habit[]): number {
  if (habits.length === 0) return 0;

  const today = new Date();
  const weekDays: string[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    weekDays.push(d.toISOString().split('T')[0]);
  }

  let totalTarget = 0;
  let totalCompleted = 0;

  habits.forEach((habit) => {
    const targetPerDay = habit.targetPerDay || 1;

    weekDays.forEach((day) => {
      totalTarget += targetPerDay;
      const count = habit.completionHistory[day]?.count || 0;
      totalCompleted += Math.min(count, targetPerDay);
    });
  });

  return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
}

export function HabitStats({ habits }: HabitStatsProps) {
  const { t } = useTranslation();
  const today = getToday();
  const activeHabits = habits.filter((h) => h.active);

  // Calculate stats
  const totalHabits = activeHabits.length;

  const completedToday = activeHabits.filter((habit) => {
    const todayCount = habit.completionHistory[today]?.count || 0;
    const target = habit.targetPerDay || 1;
    return todayCount >= target;
  }).length;

  const todayRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const weekRate = getWeekCompletionRate(activeHabits);

  const longestStreak = activeHabits.reduce((max, h) => Math.max(max, h.longestStreak), 0);

  const currentStreaks = activeHabits.filter((h) => h.streak > 0).length;

  return (
    <Container>
      <StatCard $color="#10b981">
        <ProgressRing $progress={todayRate} $color="#10b981">
          <ProgressInner>{todayRate}%</ProgressInner>
        </ProgressRing>
        <StatLabel>{t('recurring.stat_today_rate')}</StatLabel>
      </StatCard>

      <StatCard $color="#8b5cf6">
        <StatIcon>✅</StatIcon>
        <StatValue>{completedToday}/{totalHabits}</StatValue>
        <StatLabel>{t('recurring.stat_today_habits')}</StatLabel>
      </StatCard>

      <StatCard $color="#f59e0b">
        <StatIcon>🔥</StatIcon>
        <StatValue>{currentStreaks}</StatValue>
        <StatLabel>{t('recurring.stat_current_streak')}</StatLabel>
      </StatCard>

      <StatCard $color="#ef4444">
        <StatIcon>👑</StatIcon>
        <StatValue>{longestStreak}</StatValue>
        <StatLabel>{t('recurring.stat_longest_streak')}</StatLabel>
      </StatCard>

      <StatCard $color="#3b82f6">
        <ProgressRing $progress={weekRate} $color="#3b82f6">
          <ProgressInner>{weekRate}%</ProgressInner>
        </ProgressRing>
        <StatLabel>{t('recurring.stat_weekly_rate')}</StatLabel>
      </StatCard>
    </Container>
  );
}

export default HabitStats;
