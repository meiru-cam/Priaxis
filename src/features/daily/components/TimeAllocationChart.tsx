import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useGameStore } from '../../../stores/game-store';
import { useTranslation } from '../../../lib/i18n/useTranslation';

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const LastSync = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;

const TotalHours = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
`;

const CustomTooltip = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.9rem;
  }
  .desc {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-top: 4px;
  }
`;

const ChartBody = styled.div`
  flex: 1;
  min-height: 220px;
`;

const ChartArea = styled.div`
  height: 100%;
  display: grid;
  grid-template-columns: minmax(78px, 0.9fr) minmax(160px, 210px) minmax(78px, 0.9fr);
  gap: 4px;
  align-items: center;
`;

const SideLegend = styled.div<{ $align: 'left' | 'right' }>`
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  padding: 2px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: ${({ $align }) => ($align === 'right' ? 'right' : 'left')};
`;

const LegendItem = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'right' ? 'flex-end' : 'flex-start')};
  gap: 5px;
  min-width: 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const LegendText = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PieWrap = styled.div`
  width: 100%;
  height: 100%;
  min-height: 200px;
`;

// Category colors matching the app's theme
const categoryColors: Record<string, string> = {
    work: '#3b82f6',
    study: '#10b981',
    life: '#f59e0b',
    health: '#ef4444',
    hobby: '#8b5cf6',
    finance: '#14b8a6', // teal color for finance
    other: '#ec4899', // pink for uncategorized
};

export const TimeAllocationChart: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [totalMinutes, setTotalMinutes] = useState(0);

    const customTasks = useGameStore(state => state.customTasks);
    const archivedTasks = useGameStore(state => state.archivedTasks);
    const habits = useGameStore(state => state.habits);
    const activeSeasons = useGameStore(state => state.activeSeasons);
    const mainQuests = useGameStore(state => state.mainQuests);
    const { t } = useTranslation();

    const toLocalDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const isSameLocalDay = (iso: string | undefined, dayKey: string): boolean => {
        if (!iso) return false;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return false;
        return toLocalDateKey(date) === dayKey;
    };

    // We load today's data whenever the component mounts or stats update
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            // 1. Calculate time from Tasks/Habits/Recurring-linked tasks in local date range.
            const today = toLocalDateKey(new Date());

            // Map: Season ID -> Total Minutes
            const seasonTimeMap: Record<string, number> = {};
            let otherTime = 0;

            // Helper to add time to a season or 'other'
            const addTime = (seasonId: string | undefined, duration: number) => {
                if (seasonId) {
                    seasonTimeMap[seasonId] = (seasonTimeMap[seasonId] || 0) + duration;
                } else {
                    otherTime += duration;
                }
            };

            // Add time from completed tasks today
            const completedToday = customTasks.filter(t => t.status === 'completed' && isSameLocalDay(t.completedAt, today));
            const archivedCompletedToday = archivedTasks.filter(t => t.status === 'completed' && isSameLocalDay(t.completedAt, today));
            // De-duplicate by task id: archived first, then current tasks override.
            const completedTaskMap = new Map<string, any>();
            archivedCompletedToday.forEach((task) => completedTaskMap.set(task.id, task));
            completedToday.forEach((task) => completedTaskMap.set(task.id, task));
            const completedTaskPool = Array.from(completedTaskMap.values());

            // Helper to resolve the correct Season ID moving up the hierarchy
            const resolveSeasonIdForTask = (task: any): string | undefined => {
                if (task.linkType === 'none') return undefined;
                if (task.seasonId) return task.seasonId;
                if (task.linkedSeasonId) return task.linkedSeasonId;

                let chapterId = task.linkedChapterId;

                if (task.linkedMainQuestId) {
                    const linkedQuest = mainQuests.find(q => q.id === task.linkedMainQuestId);
                    if (linkedQuest) {
                        if (linkedQuest.seasonId) return linkedQuest.seasonId;
                        if (linkedQuest.linkedChapterId) chapterId = linkedQuest.linkedChapterId;
                    }
                }

                if (chapterId) {
                    const season = activeSeasons.find(s => s.chapters?.some(c => c.id === chapterId));
                    if (season) return season.id;
                }

                return undefined;
            };

            completedTaskPool.forEach(task => {
                const duration = task.actualCosts?.time || task.estimatedCosts?.time || 0;
                const resolvedSeasonId = resolveSeasonIdForTask(task);
                addTime(resolvedSeasonId, duration);
            });

            // Add time from habits completed today
            habits.forEach(habit => {
                const history = habit.completionHistory[today];
                if (history && history.count > 0 && habit.estimatedDuration) {
                    const duration = history.count * habit.estimatedDuration;
                    addTime(habit.seasonId, duration);
                }
            });

            // Combine arrays into Recharts format
            const chartData: any[] = [];

            Object.entries(seasonTimeMap).forEach(([seasonId, time]) => {
                const season = activeSeasons.find(s => s.id === seasonId);
                if (season && time > 0) {
                    chartData.push({
                        name: season.name,
                        value: Math.round(time),
                        color: categoryColors[season.category] || categoryColors.other
                    });
                } else if (time > 0) {
                    otherTime += time; // Fallback for deleted seasons
                }
            });

            if (otherTime > 0) {
                chartData.push({
                    name: t('daily.chart.other'),
                    value: Math.round(otherTime),
                    color: categoryColors.other
                });
            }

            if (mounted) {
                setData(chartData);
                setTotalMinutes(chartData.reduce((sum, item) => sum + (item.value || 0), 0));
                setLastSync(new Date());
            }
        };

        loadData();
        // Refresh every 5 minutes while open
        const interval = setInterval(loadData, 5 * 60 * 1000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [customTasks, archivedTasks, habits, activeSeasons, mainQuests]);

    const renderTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <CustomTooltip>
                    <p style={{ color: data.color, fontWeight: 'bold' }}>{data.name}</p>
                    <p className="desc">{data.value} {t('daily.chart.minutes')}</p>
                </CustomTooltip>
            );
        }
        return null;
    };

    return (
        <ChartContainer>
            <Header>
                <Title>{t('daily.chart.title')}</Title>
                <HeaderMeta>
                    <TotalHours>{t('daily.chart.total_hours', { hours: (totalMinutes / 60).toFixed(1) })}</TotalHours>
                    {lastSync && <LastSync>{t('daily.chart.sync')}: {lastSync.toLocaleTimeString()}</LastSync>}
                </HeaderMeta>
            </Header>

            {data.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    {t('daily.chart.no_data')}
                </div>
            ) : (
                <>
                    <ChartBody>
                        <ChartArea>
                            <SideLegend $align="left">
                                {data.slice(0, Math.ceil(data.length / 2)).map((entry, index) => (
                                    <LegendItem key={`legend-left-${index}`} $align="left">
                                        <LegendDot $color={entry.color} />
                                        <LegendText>{entry.name} ({entry.value} {t('daily.chart.minutes')})</LegendText>
                                    </LegendItem>
                                ))}
                            </SideLegend>
                            <PieWrap>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={56}
                                            outerRadius={76}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={renderTooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </PieWrap>
                            <SideLegend $align="right">
                                {data.slice(Math.ceil(data.length / 2)).map((entry, index) => (
                                    <LegendItem key={`legend-right-${index}`} $align="right">
                                        <LegendText>{entry.name} ({entry.value} {t('daily.chart.minutes')})</LegendText>
                                        <LegendDot $color={entry.color} />
                                    </LegendItem>
                                ))}
                            </SideLegend>
                        </ChartArea>
                    </ChartBody>
                </>
            )}
        </ChartContainer>
    );
};
