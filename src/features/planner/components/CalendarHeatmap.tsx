/**
 * CalendarHeatmap Component
 * 日历热力图 - 显示两个月的心情和完成率
 */

import { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useJournalStore } from '../../../stores/journal-store';
import { useGameStore } from '../../../stores/game-store';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Types ====================

interface DayData {
    date: string;
    dayOfMonth: number;
    mood?: 'great' | 'good' | 'okay' | 'low' | 'bad';
    completionRate: number;
    isToday: boolean;
    isCurrentMonth: boolean;
}

// ==================== Styled Components ====================

const Container = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavButton = styled.button`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 6px;
  padding: 4px 10px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 0.8rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const MonthLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TwoMonthGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MonthContainer = styled.div``;

const MonthTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  margin-bottom: 6px;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

const WeekdayHeader = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  padding: 2px 0;
  font-weight: 500;
`;

const DayCell = styled.div<{ $isCurrentMonth: boolean; $isToday: boolean }>`
  aspect-ratio: 0.85; // Allow a bit more height
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  border-radius: 6px;
  background: ${({ theme, $isCurrentMonth, $isToday }) =>
        $isToday
            ? theme.colors.accent.primary + '15'
            : $isCurrentMonth
                ? theme.colors.bg.secondary
                : 'transparent'};
  opacity: ${({ $isCurrentMonth }) => ($isCurrentMonth ? 1 : 0.3)};
  border: ${({ $isToday, theme }) =>
        $isToday ? `1px solid ${theme.colors.accent.primary}` : '1px solid transparent'};
  min-height: 50px; // Increased height
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, $isCurrentMonth }) => $isCurrentMonth ? theme.colors.bg.tertiary : 'transparent'};
    trnasform: translateY(-1px);
  }
`;

const DayNumber = styled.span<{ $isToday: boolean }>`
  font-size: 0.75rem;
  font-weight: ${({ $isToday }) => ($isToday ? '600' : '400')};
  color: ${({ theme, $isToday }) =>
        $isToday ? theme.colors.accent.primary : theme.colors.text.secondary};
  line-height: 1;
  width: 100%;
  text-align: center;
`;

const MoodContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const MoodDot = styled.span<{ $mood: DayData['mood'] }>`
  font-size: 1.4rem; // Much larger
  line-height: 1;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
  transition: transform 0.2s ease;
  
  ${DayCell}:hover & {
    transform: scale(1.1);
  }
`;

const CompletionBar = styled.div`
  width: 90%;
  height: 3px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
`;

const CompletionFill = styled.div<{ $rate: number }>`
  width: ${({ $rate }) => $rate}%;
  height: 100%;
  background: ${({ $rate }) => {
        if ($rate >= 80) return '#10b981';
        if ($rate >= 50) return '#3b82f6';
        if ($rate >= 20) return '#f59e0b';
        return '#ef4444';
    }};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const LegendRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const LegendDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const LegendBar = styled.div<{ $color: string }>`
  width: 16px;
  height: 3px;
  border-radius: 1px;
  background: ${({ $color }) => $color};
`;

// ==================== Helpers ====================

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOOD_EMOJI: Record<string, string> = {
    great: '😄',
    good: '🙂',
    okay: '😐',
    low: '😔',
    bad: '😢',
};

function getMonthDays(year: number, month: number): DayData[] {
    const days: DayData[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startPadding = firstDay.getDay();

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
        const d = prevMonthLast.getDate() - i;
        const date = new Date(year, month - 1, d);
        days.push({
            date: date.toISOString().split('T')[0],
            dayOfMonth: d,
            completionRate: 0,
            isToday: false,
            isCurrentMonth: false,
        });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toISOString().split('T')[0];
        days.push({
            date: dateStr,
            dayOfMonth: d,
            completionRate: 0,
            isToday: dateStr === todayStr,
            isCurrentMonth: true,
        });
    }

    // Next month padding (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month + 1, d);
        days.push({
            date: date.toISOString().split('T')[0],
            dayOfMonth: d,
            completionRate: 0,
            isToday: false,
            isCurrentMonth: false,
        });
    }

    return days;
}

// ==================== Component ====================

interface CalendarHeatmapProps {
    initialYear?: number;
    initialMonth?: number;
    onDateClick?: (date: Date) => void;
}

export function CalendarHeatmap({
    initialYear = new Date().getFullYear(),
    initialMonth = new Date().getMonth(),
    onDateClick
}: CalendarHeatmapProps) {
    const { t, language } = useTranslation();
    const [viewYear, setViewYear] = useState(initialYear);
    const [viewMonth, setViewMonth] = useState(initialMonth);

    const dailySuccessJournal = useJournalStore((s) => s.dailySuccessJournal);
    const archivedTasks = useGameStore((s) => s.archivedTasks);
    const customTasks = useGameStore((s) => s.customTasks);
    const dailyCompletionSnapshots = useGameStore((s) => s.dailyCompletionSnapshots || {});

    // Build mood map from journal entries
    const moodMap = useMemo(() => {
        const map: Record<string, DayData['mood']> = {};
        dailySuccessJournal.forEach((entry) => {
            const dateKey = entry.date.split('T')[0];
            map[dateKey] = entry.mood;
        });
        return map;
    }, [dailySuccessJournal]);

    // Build completion rate map from tasks
    const completionMap = useMemo(() => {
        const map: Record<string, { completed: number; total: number }> = {};

        // Count archived (completed) tasks by completedAt date
        archivedTasks.forEach((task) => {
            if (task.completedAt) {
                const dateKey = task.completedAt.split('T')[0];
                if (!map[dateKey]) map[dateKey] = { completed: 0, total: 0 };
                map[dateKey].completed++;
                map[dateKey].total++;
            }
        });

        // Count active (incomplete) tasks by deadline or createdAt
        customTasks.forEach((task) => {
            if (!task.completed) {
                const dateKey = task.deadline || task.createdAt.split('T')[0];
                if (!map[dateKey]) map[dateKey] = { completed: 0, total: 0 };
                map[dateKey].total++;
            }
        });

        return map;
    }, [archivedTasks, customTasks]);

    const todayKey = new Date().toISOString().split('T')[0];

    // Get previous month
    const getPrevMonth = () => {
        if (viewMonth === 0) {
            return { year: viewYear - 1, month: 11 };
        }
        return { year: viewYear, month: viewMonth - 1 };
    };

    const prev = getPrevMonth();

    // Build calendar days for both months
    const buildCalendarDays = useCallback((year: number, month: number) => {
        const baseDays = getMonthDays(year, month);
        return baseDays.map((day) => ({
            ...day,
            mood: moodMap[day.date],
            completionRate: day.date < todayKey && dailyCompletionSnapshots[day.date]
                ? Math.round(dailyCompletionSnapshots[day.date].completionRate)
                : completionMap[day.date]
                    ? Math.round((completionMap[day.date].completed / completionMap[day.date].total) * 100)
                    : 0,
        }));
    }, [completionMap, dailyCompletionSnapshots, moodMap, todayKey]);

    const prevMonthDays = useMemo(
        () => buildCalendarDays(prev.year, prev.month),
        [buildCalendarDays, prev.year, prev.month]
    );
    const currentMonthDays = useMemo(
        () => buildCalendarDays(viewYear, viewMonth),
        [buildCalendarDays, viewYear, viewMonth]
    );

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const getMonthLabel = (year: number, month: number) => {
        if (language === 'zh') return `${year}年${month + 1}月`;
        return new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

    const weekdays = language === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN;

    const renderMonth = (days: DayData[], year: number, month: number) => (
        <MonthContainer>
            <MonthTitle>{getMonthLabel(year, month)}</MonthTitle>
            <CalendarGrid>
                {weekdays.map((day) => (
                    <WeekdayHeader key={day}>{day}</WeekdayHeader>
                ))}
                {days.map((day, idx) => (
                    <DayCell
                        key={idx}
                        $isCurrentMonth={day.isCurrentMonth}
                        $isToday={day.isToday}
                        onClick={() => {
                            if (onDateClick && day.isCurrentMonth) {
                                onDateClick(new Date(day.date));
                            }
                        }}
                        style={{ cursor: onDateClick && day.isCurrentMonth ? 'pointer' : 'default' }}
                    >
                        <DayNumber $isToday={day.isToday}>{day.dayOfMonth}</DayNumber>

                        <MoodContainer>
                            {day.mood && day.isCurrentMonth ? (
                                <MoodDot $mood={day.mood}>
                                    {MOOD_EMOJI[day.mood]}
                                </MoodDot>
                            ) : (
                                /* Placeholder to keep layout consistent if needed, or just empty space */
                                <div style={{ height: '1.4rem' }}></div>
                            )}
                        </MoodContainer>

                        {day.isCurrentMonth && (
                            <CompletionBar>
                                <CompletionFill $rate={day.completionRate} />
                            </CompletionBar>
                        )}
                    </DayCell>
                ))}
            </CalendarGrid>
        </MonthContainer>
    );

    return (
        <Container>
            <Header>
                <Title>{t('calendar.mood_completion')}</Title>
                <MonthNav>
                    <NavButton onClick={handlePrevMonth} aria-label={t('calendar.prev_month')}>◀</NavButton>
                    <MonthLabel>{t('calendar.two_months')}</MonthLabel>
                    <NavButton onClick={handleNextMonth} aria-label={t('calendar.next_month')}>▶</NavButton>
                </MonthNav>
            </Header>

            <TwoMonthGrid>
                {renderMonth(prevMonthDays, prev.year, prev.month)}
                {renderMonth(currentMonthDays, viewYear, viewMonth)}
            </TwoMonthGrid>

            <LegendRow>
                <LegendItem>
                    <LegendDot $color="#10b981" />
                    {t('calendar.legend_great')}
                </LegendItem>
                <LegendItem>
                    <LegendDot $color="#3b82f6" />
                    {t('calendar.legend_good')}
                </LegendItem>
                <LegendItem>
                    <LegendDot $color="#f59e0b" />
                    {t('calendar.legend_okay')}
                </LegendItem>
                <LegendItem>
                    <LegendDot $color="#f97316" />
                    {t('calendar.legend_low')}
                </LegendItem>
                <LegendItem>
                    <LegendDot $color="#ef4444" />
                    {t('calendar.legend_bad')}
                </LegendItem>
                <LegendItem style={{ marginLeft: '12px' }}>
                    <LegendBar $color="#10b981" />
                    {t('calendar.legend_completion')}
                </LegendItem>
            </LegendRow>
        </Container>
    );
}

export default CalendarHeatmap;
