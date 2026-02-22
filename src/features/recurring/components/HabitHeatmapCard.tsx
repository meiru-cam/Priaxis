/**
 * HabitHeatmapCard Component
 * GitHub-style heatmap that dynamically fills the container width
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { Habit } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface HabitHeatmapCardProps {
  habit: Habit;
  onCheckIn: (id: string) => void;
  minWeeks?: number; // Minimum weeks to show even with no data
}

const Card = styled.div<{ $completed: boolean }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;

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
  align-items: center;
  margin-bottom: 12px;
`;

const HabitInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`;

const Emoji = styled.span`
  font-size: 1.5rem;
`;

const HabitName = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CheckInButton = styled.button<{ $checked: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid
    ${({ $checked, theme }) =>
      $checked ? theme.colors.accent.green : theme.colors.border.secondary};
  background: ${({ $checked, theme }) =>
    $checked ? theme.colors.accent.green : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;

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
  margin-bottom: 12px;
`;

const StatItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const StatValue = styled.span`
  font-size: 1.1rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const HeatmapContainer = styled.div`
  width: 100%;
  overflow: hidden;
`;

const HeatmapWrapper = styled.div`
  display: flex;
  gap: 2px;
  width: 100%;
`;

const DayLabels = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  padding-right: 4px;
`;

const DayLabel = styled.div`
  height: 12px;
  font-size: 9px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  line-height: 1;
  width: 16px;
`;

const HeatmapGrid = styled.div`
  display: flex;
  gap: 2px;
  flex: 1;
  justify-content: flex-end; /* Right-align: most recent on right */
`;

const WeekColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DaySquare = styled.div<{
  $level: number;
  $isToday: boolean;
  $isEmpty: boolean;
}>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${({ $level, $isEmpty, theme }) => {
    if ($isEmpty) return theme.colors.bg.tertiary; // Empty/future days
    if ($level === 0) return '#ebedf0';
    if ($level === 1) return '#9be9a8';
    if ($level === 2) return '#40c463';
    if ($level === 3) return '#30a14e';
    return '#216e39';
  }};
  ${({ $isToday }) =>
    $isToday && 'outline: 2px solid #8b5cf6; outline-offset: -1px;'}
  cursor: ${({ $isEmpty }) => ($isEmpty ? 'default' : 'pointer')};

  &:hover {
    ${({ $isEmpty }) => !$isEmpty && 'filter: brightness(0.9);'}
  }
`;

const MonthLabels = styled.div`
  display: flex;
  margin-left: 20px;
  margin-bottom: 4px;
  font-size: 9px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const MonthLabel = styled.span<{ $width: number }>`
  width: ${({ $width }) => $width * 14}px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
`;

const TodayBadge = styled.span<{ $completed: boolean }>`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${({ $completed }) =>
    $completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)'};
  color: ${({ $completed }) => ($completed ? '#10b981' : '#8b5cf6')};
`;

// Helpers - use local timezone for date formatting
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLevel(count: number, target: number): number {
  if (count === 0) return 0;
  const ratio = count / target;
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  if (ratio === 1) return 3;
  return 4;
}

function getToday(): string {
  const now = new Date();
  return formatDate(now);
}

// Date comparison utilities - reserved for future features
// function isSameDay(d1: Date, d2: Date): boolean {
//   return formatDate(d1) === formatDate(d2);
// }
// function isAfterDay(d1: Date, d2: Date): boolean {
//   return formatDate(d1) > formatDate(d2);
// }

export function HabitHeatmapCard({
  habit,
  onCheckIn,
  minWeeks = 8,
}: HabitHeatmapCardProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [calculatedWeeks, setCalculatedWeeks] = useState(minWeeks);

  const targetPerDay = habit.targetPerDay || 1;
  const today = getToday();
  const todayEntry = habit.completionHistory[today];
  const todayCount = todayEntry?.count || 0;
  const isCompletedToday = todayCount >= targetPerDay;

  // Calculate how many weeks fit in the container
  useEffect(() => {
    const calculateWeeks = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const dayLabelWidth = 20; // Day labels (一、三、五)
      const squareSize = 12;
      const gap = 2;

      const availableWidth = containerWidth - dayLabelWidth - 16; // padding
      const weeksCanFit = Math.floor(availableWidth / (squareSize + gap));

      // Use at least minWeeks, but fill container if possible
      setCalculatedWeeks(Math.max(minWeeks, weeksCanFit));
    };

    calculateWeeks();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(calculateWeeks);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [minWeeks]);

  // Generate grid data
  const { gridData, monthLabels } = useMemo(() => {
    const data: {
      date: Date;
      count: number;
      level: number;
      isEmpty: boolean;
    }[][] = [];

    // Get today's date string for comparison
    const todayStr = getToday();
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Calculate the end date: last day of the current week (Saturday)
    // GitHub style: week ends on Saturday
    const endDate = new Date(today);
    const todayDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSaturday = (6 - todayDayOfWeek + 7) % 7;
    endDate.setDate(endDate.getDate() + daysUntilSaturday);

    // Calculate start date: go back N weeks from end date
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (calculatedWeeks * 7) + 1);

    // Align to Sunday (start of week)
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const currentDate = new Date(startDate);
    currentDate.setHours(12, 0, 0, 0);

    // Build week columns (7 days each, Sunday to Saturday)
    while (data.length < calculatedWeeks) {
      const week: {
        date: Date;
        count: number;
        level: number;
        isEmpty: boolean;
      }[] = [];

      for (let day = 0; day < 7; day++) {
        const dateStr = formatDate(currentDate);
        const isFuture = dateStr > todayStr;
        const count = isFuture
          ? 0
          : habit.completionHistory[dateStr]?.count || 0;
        const level = isFuture ? 0 : getLevel(count, targetPerDay);

        week.push({
          date: new Date(currentDate),
          count,
          level,
          isEmpty: isFuture,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      data.push(week);
    }

    // Calculate month labels
    const months: { month: string; width: number }[] = [];
    let currentMonth = '';
    let currentWidth = 0;

    data.forEach((week) => {
      if (week.length > 0) {
        const firstDay = week[0];
        const month = firstDay.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'short',
        });

        if (month !== currentMonth) {
          if (currentMonth && currentWidth > 0) {
            months.push({ month: currentMonth, width: currentWidth });
          }
          currentMonth = month;
          currentWidth = 1;
        } else {
          currentWidth++;
        }
      }
    });

    if (currentMonth && currentWidth > 0) {
      months.push({ month: currentMonth, width: currentWidth });
    }

    return { gridData: data, monthLabels: months };
  }, [habit.completionHistory, calculatedWeeks, targetPerDay, language]);

  const todayStr = formatDate(new Date());

  return (
    <Card $completed={isCompletedToday}>
      <CardHeader>
        <HabitInfo>
          {habit.emoji && <Emoji>{habit.emoji}</Emoji>}
          <div>
            <HabitName>{habit.name}</HabitName>
            <TodayBadge $completed={isCompletedToday}>
              {isCompletedToday
                ? t('recurring.heatmap_card.done_today', { current: todayCount, target: targetPerDay })
                : t('recurring.heatmap_card.today_progress', { current: todayCount, target: targetPerDay })}
            </TodayBadge>
          </div>
        </HabitInfo>
        <CheckInButton
          $checked={isCompletedToday}
          onClick={() => onCheckIn(habit.id)}
          title={isCompletedToday ? t('recurring.heatmap_card.keep_checking') : t('recurring.habit_card.check_in')}
        >
          {isCompletedToday ? '✓' : '+'}
        </CheckInButton>
      </CardHeader>

      <StatsRow>
        <StatItem>
          <StatValue>{habit.streak}</StatValue>
          <StatLabel>{t('recurring.heatmap_card.streak')}</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{habit.longestStreak}</StatValue>
          <StatLabel>{t('recurring.heatmap_card.longest')}</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{habit.totalCompletions}</StatValue>
          <StatLabel>{t('recurring.heatmap_card.total')}</StatLabel>
        </StatItem>
      </StatsRow>

      <HeatmapContainer ref={containerRef}>
        <MonthLabels>
          {monthLabels.map((label, i) => (
            <MonthLabel key={i} $width={label.width}>
              {label.month}
            </MonthLabel>
          ))}
        </MonthLabels>

        <HeatmapWrapper>
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
                    $isEmpty={day.isEmpty}
                    title={
                      day.isEmpty
                        ? ''
                        : t('recurring.heatmap.day_count', {
                            date: day.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US'),
                            count: day.count,
                          })
                    }
                  />
                ))}
              </WeekColumn>
            ))}
          </HeatmapGrid>
        </HeatmapWrapper>
      </HeatmapContainer>
    </Card>
  );
}

export default HabitHeatmapCard;
