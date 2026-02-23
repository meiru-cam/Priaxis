import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { AWEvent } from '../../../services/activity-watch';
import { activityWatchService } from '../../../services/activity-watch';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { TranslationKey } from '../../../lib/i18n/types';

const ChartContainer = styled.div`
  width: 100%;
  height: 320px;
  box-sizing: border-box;
  min-width: 0;
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

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.colors.status.danger.text};
  font-size: 0.9rem;
  margin-bottom: 8px;
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

type UsageKey = 'arxiv' | 'video' | 'entertainment' | 'social' | 'dev' | 'apps' | 'idle' | 'other';

const usageColors: Record<UsageKey, string> = {
    arxiv: '#3b82f6',
    video: '#f59e0b',
    entertainment: '#f97316',
    social: '#ef4444',
    dev: '#10b981',
    apps: '#8b5cf6',
    idle: '#94a3b8',
    other: '#ec4899',
};

const usageLabelKeys: Record<UsageKey, TranslationKey> = {
    arxiv: 'daily.aw_chart.category.arxiv',
    video: 'daily.aw_chart.category.video',
    entertainment: 'daily.aw_chart.category.entertainment',
    social: 'daily.aw_chart.category.social',
    dev: 'daily.aw_chart.category.dev',
    apps: 'daily.aw_chart.category.apps',
    idle: 'daily.aw_chart.category.idle',
    other: 'daily.aw_chart.category.other',
};

const browserAppKeywords = ['chrome', 'safari', 'edge', 'firefox', 'arc', 'browser'];
const devAppKeywords = ['cursor', 'code', 'vscode', 'terminal', 'iterm', 'pycharm', 'intellij', 'xcode', 'webstorm', 'antigravity'];
const appProductivityKeywords = ['notion', 'obsidian', 'word', 'excel', 'powerpoint', 'preview', 'pages', 'keynote'];
const socialAppKeywords = ['wechat', 'weixin', '微信', 'qq', 'discord', 'slack', 'telegram'];
const idleAppKeywords = ['loginwindow', 'screensaver', 'screen saver'];

const toLower = (v: string | undefined) => (v || '').toLowerCase();

const overlapMs = (startA: number, endA: number, startB: number, endB: number): number => {
    const start = Math.max(startA, startB);
    const end = Math.min(endA, endB);
    return Math.max(0, end - start);
};

const getEventMinutesInRange = (
    event: AWEvent,
    rangeStartMs: number,
    rangeEndMs: number
): number => {
    const startMs = Date.parse(event.timestamp);
    const rawDuration = Number(event.duration) || 0;
    if (!Number.isFinite(startMs) || !Number.isFinite(rawDuration) || rawDuration <= 0) return 0;

    // ActivityWatch duration is typically seconds, but some pipelines can expose millisecond-like values.
    // Use a conservative heuristic to avoid explosive overcounting.
    const durationMs = rawDuration > 10_000 ? rawDuration : rawDuration * 1000;
    const endMs = startMs + durationMs;
    const inRangeMs = overlapMs(startMs, endMs, rangeStartMs, rangeEndMs);
    return inRangeMs / 60_000;
};

const classifyWebEvent = (event: AWEvent): UsageKey => {
    const url = toLower(event.data.url);
    const title = toLower(event.data.title);
    const text = `${url} ${title}`;

    if (text.includes('arxiv.org')) return 'arxiv';

    if (
        text.includes('youtube.com') ||
        text.includes('youtu.be') ||
        text.includes('bilibili.com') ||
        text.includes('xiaohongshu.com') ||
        text.includes('netflix.com') ||
        text.includes('vimeo.com') ||
        text.includes('twitch.tv')
    ) {
        return text.includes('xiaohongshu.com') ? 'entertainment' : 'video';
    }

    if (
        text.includes('x.com') ||
        text.includes('twitter.com') ||
        text.includes('weibo.com') ||
        text.includes('instagram.com') ||
        text.includes('facebook.com') ||
        text.includes('reddit.com')
    ) {
        return 'social';
    }

    if (
        text.includes('github.com') ||
        text.includes('gitlab.com') ||
        text.includes('docs.') ||
        text.includes('readthedocs')
    ) {
        return 'dev';
    }

    return 'other';
};

const classifyWindowApp = (event: AWEvent): UsageKey => {
    const app = toLower(event.data.app);
    if (!app) return 'apps';
    if (idleAppKeywords.some(k => app.includes(k))) return 'idle';
    if (browserAppKeywords.some(k => app.includes(k))) return 'other';
    if (socialAppKeywords.some(k => app.includes(k))) return 'social';
    if (devAppKeywords.some(k => app.includes(k))) return 'dev';
    if (appProductivityKeywords.some(k => app.includes(k))) return 'apps';
    return 'apps';
};

export const ActivityWatchUsageChart: React.FC = () => {
    const { t } = useTranslation();
    const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);
    const [awRunning, setAwRunning] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [totalMinutes, setTotalMinutes] = useState(0);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            const isRunning = await activityWatchService.checkConnection();
            if (!mounted) return;
            setAwRunning(isRunning);

            if (!isRunning) {
                setData([]);
                return;
            }

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const rangeStartMs = startOfDay.getTime();
            const rangeEndMs = now.getTime();
            const rangeTotalMinutes = Math.max(0, (rangeEndMs - rangeStartMs) / 60_000);

            const [webEvents, windowEvents, afkEvents] = await Promise.all([
                activityWatchService.getWebEvents(startOfDay.toISOString(), now.toISOString()),
                activityWatchService.getWindowEvents(startOfDay.toISOString(), now.toISOString()),
                activityWatchService.getAFKEvents(startOfDay.toISOString(), now.toISOString()),
            ]);

            const usageMinutes: Record<UsageKey, number> = {
                arxiv: 0,
                video: 0,
                entertainment: 0,
                social: 0,
                dev: 0,
                apps: 0,
                idle: 0,
                other: 0,
            };

            webEvents.forEach((event) => {
                const key = classifyWebEvent(event);
                usageMinutes[key] += getEventMinutesInRange(event, rangeStartMs, rangeEndMs);
            });

            windowEvents.forEach((event) => {
                const key = classifyWindowApp(event);
                if (key !== 'other' && key !== 'idle') {
                    usageMinutes[key] += getEventMinutesInRange(event, rangeStartMs, rangeEndMs);
                }
            });

            afkEvents.forEach((event) => {
                if (toLower(event.data.status) === 'afk') {
                    usageMinutes.idle += getEventMinutesInRange(event, rangeStartMs, rangeEndMs);
                }
            });

            const activeKeys: UsageKey[] = ['arxiv', 'video', 'entertainment', 'social', 'dev', 'apps', 'other'];
            const activeTotal = activeKeys.reduce((sum, key) => sum + usageMinutes[key], 0);

            // Keep active data untouched; only constrain idle so total cannot exceed elapsed minutes.
            usageMinutes.idle = Math.min(usageMinutes.idle, Math.max(0, rangeTotalMinutes - activeTotal));

            // Per-bucket hard cap for any outlier records.
            (Object.keys(usageMinutes) as UsageKey[]).forEach((key) => {
                usageMinutes[key] = Math.min(usageMinutes[key], rangeTotalMinutes);
            });

            const chartData = (Object.keys(usageMinutes) as UsageKey[])
                .filter((key) => usageMinutes[key] > 0)
                .map((key) => ({
                    name: t(usageLabelKeys[key]),
                    value: Math.round(usageMinutes[key]),
                    color: usageColors[key],
                }))
                .sort((a, b) => b.value - a.value);

            if (mounted) {
                setData(chartData);
                setTotalMinutes(chartData.reduce((sum, item) => sum + (item.value || 0), 0));
                setLastSync(new Date());
            }
        };

        loadData();
        const interval = setInterval(loadData, 5 * 60 * 1000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const renderTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <CustomTooltip>
                    <p style={{ color: item.color, fontWeight: 'bold' }}>{item.name}</p>
                    <p className="desc">{item.value} {t('daily.chart.minutes')}</p>
                </CustomTooltip>
            );
        }
        return null;
    };

    return (
        <ChartContainer>
            <Header>
                <Title>{t('daily.aw_chart.title')}</Title>
                <HeaderMeta>
                    <TotalHours>{t('daily.chart.total_hours', { hours: (totalMinutes / 60).toFixed(1) })}</TotalHours>
                    {lastSync && <LastSync>{t('daily.chart.sync')}: {lastSync.toLocaleTimeString()}</LastSync>}
                </HeaderMeta>
            </Header>

            {!awRunning && (
                <ErrorMsg>{t('daily.aw_chart.offline')}</ErrorMsg>
            )}

            {data.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    {t('daily.aw_chart.no_data')}
                </div>
            ) : (
                <>
                    <ChartBody>
                        <ChartArea>
                            <SideLegend $align="left">
                                {data.slice(0, Math.ceil(data.length / 2)).map((entry, index) => (
                                    <LegendItem key={`usage-legend-left-${index}`} $align="left">
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
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`usage-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={renderTooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </PieWrap>
                            <SideLegend $align="right">
                                {data.slice(Math.ceil(data.length / 2)).map((entry, index) => (
                                    <LegendItem key={`usage-legend-right-${index}`} $align="right">
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
