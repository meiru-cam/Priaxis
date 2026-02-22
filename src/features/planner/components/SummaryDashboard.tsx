/**
 * SummaryDashboard Component
 * 复盘总结仪表盘 - 显示周期总结和历史记录
 */

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { usePlannerStore } from '../../../stores/planner-store';
import { useGameStore } from '../../../stores/game-store';
import { Button, Modal } from '../../../components/ui';
import { PeriodSummaryCard } from './PeriodSummaryCard';
import { CalendarHeatmap } from './CalendarHeatmap';
import { generatePeriodSummary, exportRLTrainingData } from '../../../services/reflection-service';
import type { PeriodSummary, TaskReflection } from '../../../types/planner';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { DailySuccessModal } from '../../daily/components/DailySuccessModal';
import WeeklyReviewContent from '../../weekly/components/WeeklyReviewContent';
import { sumTaskFocusMinutes } from '../../../lib/focus-time';

// ==================== Styled Components ====================

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  padding-bottom: 1px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const StatsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 20px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const GeneratingMessage = styled.div`
  text-align: center;
  padding: 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SummaryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SummaryListItem = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const SummaryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 1.1rem;
`;

const SummaryDate = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SummaryStats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 2px dashed ${({ theme }) => theme.colors.border.secondary};
`;

// ==================== Component ====================

export function SummaryDashboard() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal states
  const [selectedSummary, setSelectedSummary] = useState<PeriodSummary | null>(null);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { t } = useTranslation();

  const summaries = usePlannerStore((s) => s.summaries);
  const reflections = usePlannerStore((s) => s.reflections);
  const interventionHistory = usePlannerStore((s) => s.interventionHistory);
  const addSummary = usePlannerStore((s) => s.addSummary);
  const updatePlannerSummary = usePlannerStore((s) => s.updateSummary);

  const tasks = useGameStore((s) => s.customTasks);
  const activeSeasons = useGameStore((s) => s.activeSeasons);
  const seasonHistory = useGameStore((s) => s.seasonHistory);
  const seasons = useMemo(() => [...activeSeasons, ...seasonHistory], [activeSeasons, seasonHistory]);
  const quests = useGameStore((s) => s.mainQuests);

  const archivedTasks = useGameStore((s) => s.archivedTasks);
  const taskLogs = useGameStore((s) => s.taskLogs);

  const mergedReflections = useMemo<TaskReflection[]>(() => {
    const map = new Map<string, TaskReflection>();
    reflections.forEach((r) => map.set(r.taskId, r));

    const normalizeScore = (value: number): 1 | 2 | 3 | 4 | 5 => {
      const rounded = Math.round(value);
      if (rounded <= 1) return 1;
      if (rounded === 2) return 2;
      if (rounded === 3) return 3;
      if (rounded === 4) return 4;
      return 5;
    };

    [...tasks, ...archivedTasks].forEach((task) => {
      if (!task.completedAt) return;
      const hasReview = Boolean(task.review?.trim()) || typeof task.reviewSatisfaction === 'number';
      if (!hasReview) return;
      map.set(task.id, {
        taskId: task.id,
        taskName: task.name,
        completedAt: task.completedAt,
        satisfactionScore: normalizeScore(task.reviewSatisfaction ?? 3),
        goodPoints: task.review?.trim() || '',
        improvements: '',
        energyState: 'medium',
      });
    });

    taskLogs.forEach((log) => {
      if (log.type !== 'complete') return;
      const hasReview = Boolean(log.review?.trim()) || typeof log.reviewSatisfaction === 'number';
      if (!hasReview || map.has(log.task.id)) return;
      map.set(log.task.id, {
        taskId: log.task.id,
        taskName: log.task.name,
        completedAt: log.timestamp,
        satisfactionScore: normalizeScore(log.reviewSatisfaction ?? 3),
        goodPoints: log.review?.trim() || '',
        improvements: '',
        energyState: 'medium',
      });
    });

    return Array.from(map.values());
  }, [reflections, tasks, archivedTasks, taskLogs]);

  const filteredSummaries = useMemo(() => {
    // Only filter for Monthly/Quarterly/Yearly. Weekly is handled separately.
    if (activeTab === 'weekly') return [];

    const relevantSummaries = summaries.filter(s => s.type === activeTab);
    const uniqueMap = new Map();
    relevantSummaries.forEach(s => {
      uniqueMap.set(s.id, s);
    });
    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );
  }, [summaries, activeTab]);

  const overallStats = useMemo(() => {
    const totalReflections = mergedReflections.length;
    const satisfactionValues = mergedReflections.map((item) => item.satisfactionScore);
    const avgSatisfaction = satisfactionValues.length > 0
      ? satisfactionValues.reduce((sum, value) => sum + value, 0) / satisfactionValues.length
      : 0;

    // Calculate total focus time from all tasks (active + archived)
    const allTasks = [...tasks, ...archivedTasks];
    const totalFocusMinutes = sumTaskFocusMinutes(allTasks);
    const totalFocusHours = Math.round(totalFocusMinutes / 60 * 10) / 10; // Keep 1 decimal place

    return {
      totalReflections,
      avgSatisfaction: avgSatisfaction.toFixed(1),
      totalSummaries: summaries.length,
      totalFocusHours,
    };
  }, [mergedReflections, summaries, tasks, archivedTasks]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDailyModalOpen(true);
  };

  const handleGenerateSummary = async () => {
    if (activeTab === 'weekly') return; // Weekly is generated in Weekly page (or handled differently)

    setIsGenerating(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (activeTab === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (activeTab === 'quarterly') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      } else if (activeTab === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
      }

      const summary = await generatePeriodSummary(
        activeTab,
        startDate,
        endDate,
        tasks,
        mergedReflections,
        interventionHistory.filter(i => {
          const iDate = new Date(i.startedAt);
          return iDate >= startDate && iDate <= endDate;
        }).length,
        seasons, // Pass all seasons (active + history)
        quests
      );

      // Check if summary already exists
      const existingSummary = summaries.find(s => s.id === summary.id);
      if (existingSummary) {
        const { id, ...updates } = summary;
        updatePlannerSummary(id, updates);
        // Automatically open the updated summary
        setSelectedSummary({ ...existingSummary, ...updates });
      } else {
        addSummary(summary);
        setSelectedSummary(summary);
      }
    } catch (error) {
      console.error('[SummaryDashboard] Failed to generate summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportRL = () => {
    exportRLTrainingData(mergedReflections, summaries);
  };

  const getGenerateButtonLabel = () => {
    if (isGenerating) return t('reflection.loading');
    switch (activeTab) {
      case 'monthly': return t('reflection.generate_monthly');
      case 'quarterly': return t('reflection.generate_quarterly');
      case 'yearly': return t('reflection.generate_yearly');
      default: return t('reflection.generate_btn');
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getFullYear()}.${s.getMonth() + 1}.${s.getDate()} - ${e.getMonth() + 1}.${e.getDate()}`;
  };

  return (
    <Container>
      <Header>
        <Title>📊 {t('reflection.title')}</Title>
        <Actions>
          {activeTab !== 'weekly' && (
            <Button
              variant="secondary"
              onClick={handleGenerateSummary}
              disabled={isGenerating}
            >
              {getGenerateButtonLabel()}
            </Button>
          )}
          <Button variant="ghost" onClick={handleExportRL}>
            {t('reflection.export_rl')}
          </Button>
        </Actions>
      </Header>

      <StatsOverview>
        <StatCard>
          <StatValue>{overallStats.totalReflections}</StatValue>
          <StatLabel>{t('reflection.stat_reviews')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{overallStats.avgSatisfaction}</StatValue>
          <StatLabel>{t('reflection.stat_satisfaction')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{overallStats.totalSummaries}</StatValue>
          <StatLabel>{t('reflection.stat_periods')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{overallStats.totalFocusHours}h</StatValue>
          <StatLabel>{t('reflection.stat_focus_time')}</StatLabel>
        </StatCard>
      </StatsOverview>

      {/* Calendar Heatmap for mood & completion visualization */}
      <div style={{ marginBottom: '24px' }}>
        <CalendarHeatmap onDateClick={handleDateClick} />
      </div>

      <Tabs>
        <Tab
          $active={activeTab === 'weekly'}
          onClick={() => setActiveTab('weekly')}
        >
          {t('reflection.tab_weekly')}
        </Tab>
        <Tab
          $active={activeTab === 'monthly'}
          onClick={() => setActiveTab('monthly')}
        >
          {t('reflection.tab_monthly')} ({summaries.filter(s => s.type === 'monthly').length})
        </Tab>
        <Tab
          $active={activeTab === 'quarterly'}
          onClick={() => setActiveTab('quarterly')}
        >
          {t('reflection.tab_quarterly')} ({summaries.filter(s => s.type === 'quarterly').length})
        </Tab>
        <Tab
          $active={activeTab === 'yearly'}
          onClick={() => setActiveTab('yearly')}
        >
          {t('reflection.tab_yearly')} ({summaries.filter(s => s.type === 'yearly').length})
        </Tab>
      </Tabs>

      {/* Content Area */}
      {activeTab === 'weekly' ? (
        <WeeklyReviewContent />
      ) : (
        <>
          {isGenerating ? (
            <GeneratingMessage>{t('reflection.loading')}</GeneratingMessage>
          ) : filteredSummaries.length > 0 ? (
            <SummaryList>
              {filteredSummaries.map((summary) => (
                <SummaryListItem key={summary.id} onClick={() => setSelectedSummary(summary)}>
                  <SummaryInfo>
                    <SummaryTitle>
                      {summary.type === 'monthly' ? t('reflection.summary_monthly') : summary.type === 'quarterly' ? t('reflection.summary_quarterly') : t('reflection.summary_yearly')}
                    </SummaryTitle>
                    <SummaryDate>{formatDateRange(summary.startDate, summary.endDate)}</SummaryDate>
                  </SummaryInfo>
                  <SummaryStats>
                    <span>{t('reflection.completed_tasks')}: {summary.stats.tasksCompleted}</span>
                    <span>{t('reflection.completion_rate')}: {Math.round(summary.stats.completionRate)}%</span>
                    <span>{t('reflection.satisfaction')}: {summary.stats.avgSatisfaction.toFixed(1)}</span>
                  </SummaryStats>
                  <div style={{ fontSize: '1.2rem', color: '#ccc' }}>👉</div>
                </SummaryListItem>
              ))}
            </SummaryList>
          ) : (
            <EmptyState>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
              <p>{activeTab === 'monthly' ? t('reflection.empty_monthly') : activeTab === 'quarterly' ? t('reflection.empty_quarterly') : t('reflection.empty_yearly')}</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t('reflection.empty_hint')}</p>
            </EmptyState>
          )}
        </>
      )}

      {/* Summary Detail Modal */}
      {selectedSummary && (
        <Modal
          isOpen={!!selectedSummary}
          onClose={() => setSelectedSummary(null)}
          title={t('reflection.modal_title')}
          size="lg"
        >
          <div style={{ paddingBottom: '20px' }}>
            <PeriodSummaryCard
              summary={selectedSummary}
              onExportRL={() => { }} // Handle inside modal if needed
            />
          </div>
        </Modal>
      )}

      {/* Daily Success Modal */}
      <DailySuccessModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        date={selectedDate}
      />
    </Container>
  );
}

export default SummaryDashboard;
