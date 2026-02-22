/**
 * HabitHeatmap Component
 * GitHub-style contribution heatmap for habit tracking
 */

import { useMemo } from 'react';
import styled from 'styled-components';
import type { Habit } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface HabitHeatmapProps {
  habit: Habit;
  weeks?: number; // Number of weeks to display
}

const Container = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const Title = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const LegendSquare = styled.div<{ $level: number }>`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${({ $level }) => {
    if ($level === 0) return '#ebedf0';
    if ($level === 1) return '#9be9a8';
    if ($level === 2) return '#40c463';
    if ($level === 3) return '#30a14e';
    return '#216e39';
  }};
`;

const HeatmapGrid = styled.div`
  display: flex;
  gap: 3px;
  overflow-x: auto;
  padding-bottom: 8px;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 2px;
  }
`;

const WeekColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const DaySquare = styled.div<{ $level: number; $isToday: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${({ $level }) => {
    if ($level === 0) return '#ebedf0';
    if ($level === 1) return '#9be9a8';
    if ($level === 2) return '#40c463';
    if ($level === 3) return '#30a14e';
    return '#216e39';
  }};
  cursor: pointer;
  border: ${({ $isToday }) => ($isToday ? '2px solid #8b5cf6' : 'none')};

  &:hover {
    opacity: 0.8;
  }
`;

const MonthLabels = styled.div`
  display: flex;
  gap: 3px;
  margin-bottom: 4px;
  padding-left: 20px;
`;

const MonthLabel = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width * 15}px;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const DayLabels = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-right: 4px;
`;

const DayLabel = styled.div`
  height: 12px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
`;

const GridWrapper = styled.div`
  display: flex;
`;

// Helper to format date
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get completion level (0-4)
function getLevel(count: number, target: number): number {
  if (count === 0) return 0;
  const ratio = count / target;
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  if (ratio === 1) return 3;
  return 4; // Over target
}

export function HabitHeatmap({ habit, weeks = 12 }: HabitHeatmapProps) {
  const { t, language } = useTranslation();
  const targetPerDay = habit.targetPerDay || 1;

  // Generate grid data
  const gridData = useMemo(() => {
    const today = new Date();
    const data: { date: Date; count: number; level: number }[][] = [];

    // Calculate start date (beginning of the first week)
    const totalDays = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    // Adjust to Monday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const currentDate = new Date(startDate);
    let currentWeek: { date: Date; count: number; level: number }[] = [];

    while (currentDate <= today) {
      const dateStr = formatDate(currentDate);
      const count = habit.completionHistory[dateStr]?.count || 0;
      const level = getLevel(count, targetPerDay);

      currentWeek.push({
        date: new Date(currentDate),
        count,
        level,
      });

      if (currentWeek.length === 7) {
        data.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      data.push(currentWeek);
    }

    return data;
  }, [habit.completionHistory, weeks, targetPerDay]);

  // Calculate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; width: number }[] = [];
    let currentMonth = '';
    let currentWidth = 0;

    gridData.forEach((week) => {
      const firstDayOfWeek = week[0];
      const month = firstDayOfWeek.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' });

      if (month !== currentMonth) {
        if (currentMonth) {
          labels.push({ month: currentMonth, width: currentWidth });
        }
        currentMonth = month;
        currentWidth = 1;
      } else {
        currentWidth++;
      }
    });

    if (currentMonth) {
      labels.push({ month: currentMonth, width: currentWidth });
    }

    return labels;
  }, [gridData, language]);

  const todayStr = formatDate(new Date());

  return (
    <Container>
      <Header>
        <Title>
          {t('recurring.heatmap.title', { emoji: habit.emoji || '', name: habit.name })}
        </Title>
        <Legend>
          <span>{t('recurring.heatmap.low')}</span>
          <LegendSquare $level={0} />
          <LegendSquare $level={1} />
          <LegendSquare $level={2} />
          <LegendSquare $level={3} />
          <LegendSquare $level={4} />
          <span>{t('recurring.heatmap.high')}</span>
        </Legend>
      </Header>

      <MonthLabels>
        {monthLabels.map((label, i) => (
          <MonthLabel key={i} $width={label.width}>
            {label.month}
          </MonthLabel>
        ))}
      </MonthLabels>

      <GridWrapper>
        <DayLabels>
          <DayLabel></DayLabel>
          <DayLabel>{t('recurring.heatmap.day_mon')}</DayLabel>
          <DayLabel></DayLabel>
          <DayLabel>{t('recurring.heatmap.day_wed')}</DayLabel>
          <DayLabel></DayLabel>
          <DayLabel>{t('recurring.heatmap.day_fri')}</DayLabel>
          <DayLabel></DayLabel>
        </DayLabels>

        <HeatmapGrid>
          {gridData.map((week, weekIndex) => (
            <WeekColumn key={weekIndex}>
              {week.map((day, dayIndex) => (
                <DaySquare
                  key={dayIndex}
                  $level={day.level}
                  $isToday={formatDate(day.date) === todayStr}
                  title={t('recurring.heatmap.day_count', {
                    date: day.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US'),
                    count: day.count,
                  })}
                />
              ))}
            </WeekColumn>
          ))}
        </HeatmapGrid>
      </GridWrapper>
    </Container>
  );
}

export default HabitHeatmap;
