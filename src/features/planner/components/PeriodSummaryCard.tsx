/**
 * PeriodSummaryCard Component
 * 显示周期（周/月）总结的卡片组件
 */

import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import type { PeriodSummary } from '../../../types/planner';
import { usePlannerStore } from '../../../stores/planner-store';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { ImeSafeTextareaBase } from '../../../components/ui';

// ==================== Types ====================

interface PeriodSummaryCardProps {
  summary: PeriodSummary;
  onExportRL?: () => void;
}

// ==================== Animations ====================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ==================== Styled Components ====================

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 16px;
  padding: 24px;
  animation: ${fadeIn} 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TypeBadge = styled.span<{ $type: 'weekly' | 'monthly' | 'quarterly' | 'yearly' }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  
  ${({ theme, $type }) => {
    if ($type === 'weekly') return `
      background: ${theme.colors.badge.info.bg};
      color: ${theme.colors.badge.info.text};
    `;
    if ($type === 'monthly') return `
      background: ${theme.colors.badge.success.bg};
      color: ${theme.colors.badge.success.text};
    `;
    if ($type === 'quarterly') return `
      background: ${theme.colors.badge.warning.bg};
      color: ${theme.colors.badge.warning.text};
    `;
    return `
      background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
      color: white;
    `;
  }}
`;

const DateRange = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// Stats Grid
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme, $color }) => $color || theme.colors.text.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// Insights Section
const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InsightList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const InsightItem = styled.li`
  padding: 10px 16px;
  margin-bottom: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  
  &::before {
    content: '•';
    margin-right: 8px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const EmptyMessage = styled.div`
  padding: 12px 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
  font-size: 0.9rem;
`;

// Recommendations
const RecommendationCard = styled.div`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.accent.primary}15,
    ${({ theme }) => theme.colors.accent.purple}15
  );
  border: 1px solid ${({ theme }) => theme.colors.accent.primary}40;
  border-radius: 12px;
  padding: 16px;
`;

const RecommendationTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RecommendationItem = styled.div`
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 8px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

// Footer
const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const GeneratedAt = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ExportButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const UserNotes = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.95rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const SaveButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.accent.purple};
  color: white;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.purple}e6;
  }
`;

// ==================== Component ====================

export function PeriodSummaryCard({ summary, onExportRL }: PeriodSummaryCardProps) {
  const { t } = useTranslation();
  const updateSummary = usePlannerStore((s) => s.updateSummary);

  const [notes, setNotes] = useState(summary.userNotes || '');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setNotes(summary.userNotes || '');
    setIsDirty(false);
  }, [summary.id, summary.userNotes]);

  const handleSaveNotes = () => {
    updateSummary(summary.id, { userNotes: notes });
    setIsDirty(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return '#22c55e'; // green
    if (rate >= 50) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const getSatisfactionColor = (avg: number) => {
    if (avg >= 4) return '#22c55e';
    if (avg >= 3) return '#eab308';
    return '#ef4444';
  };

  return (
    <Card>
      <Header>
        <Title>
          {summary.type === 'weekly' ? '📅' : summary.type === 'monthly' ? '📆' : summary.type === 'quarterly' ? '📊' : '🎊'}
          {summary.type === 'weekly' ? t('reflection.card_weekly') : summary.type === 'monthly' ? t('reflection.card_monthly') : summary.type === 'quarterly' ? t('reflection.card_quarterly') : t('reflection.card_yearly')}
          <TypeBadge $type={summary.type}>
            {summary.type === 'weekly' ? 'Weekly' : summary.type === 'monthly' ? 'Monthly' : summary.type === 'quarterly' ? 'Quarterly' : 'Yearly'}
          </TypeBadge>
        </Title>
        <DateRange>
          {formatDate(summary.startDate)} - {formatDate(summary.endDate)}
        </DateRange>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatValue>{summary.stats.tasksCompleted}</StatValue>
          <StatLabel>{t('reflection.completed_tasks')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue $color={getCompletionColor(summary.stats.completionRate)}>
            {summary.stats.completionRate.toFixed(0)}%
          </StatValue>
          <StatLabel>{t('reflection.completion_rate')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue $color={getSatisfactionColor(summary.stats.avgSatisfaction)}>
            {summary.stats.avgSatisfaction.toFixed(1)}
          </StatValue>
          <StatLabel>{t('reflection.satisfaction')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{Math.round(summary.stats.totalFocusTime / 60)}h</StatValue>
          <StatLabel>{t('reflection.stat_focus_time')}</StatLabel>
        </StatCard>
      </StatsGrid>

      <Section>
        <SectionTitle>{t('reflection.section_story')}</SectionTitle>
        {summary.insights.narrativeProgress && summary.insights.narrativeProgress.length > 0 ? (
          <InsightList>
            {summary.insights.narrativeProgress.map((np, idx) => (
              <InsightItem key={idx}>
                {np.seasonTitle}
                {np.chapters.length > 0 && ` - ${t('recurring.chapter_item_prefix')}: ${np.chapters.join(', ')}`}
              </InsightItem>
            ))}
          </InsightList>
        ) : (
          <EmptyMessage>{t('reflection.empty_story')}</EmptyMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>{t('reflection.section_quests')}</SectionTitle>
        {summary.insights.questHighlights && summary.insights.questHighlights.completedCount > 0 ? (
          <StatsGrid style={{ marginBottom: 0 }}>
            <StatCard>
              <StatValue $color="#3b82f6">{summary.insights.questHighlights.completedCount}</StatValue>
              <StatLabel>{t('reflection.quests_completed')}</StatLabel>
            </StatCard>
            {summary.insights.questHighlights.toughestQuest && (
              <StatCard>
                <StatValue $color="#f59e0b" style={{ fontSize: '1.2rem' }}>{summary.insights.questHighlights.toughestQuest.duration}d</StatValue>
                <StatLabel>{t('reflection.quest_longest')}: {summary.insights.questHighlights.toughestQuest.title}</StatLabel>
              </StatCard>
            )}
            {summary.insights.questHighlights.quickestQuest && (
              <StatCard>
                <StatValue $color="#10b981" style={{ fontSize: '1.2rem' }}>{summary.insights.questHighlights.quickestQuest.duration}d</StatValue>
                <StatLabel>{t('reflection.quest_quickest')}: {summary.insights.questHighlights.quickestQuest.title}</StatLabel>
              </StatCard>
            )}
          </StatsGrid>
        ) : (
          <EmptyMessage>{t('reflection.empty_quests')}</EmptyMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>{t('reflection.section_highlights')}</SectionTitle>
        {summary.insights.topAccomplishments.length > 0 ? (
          <InsightList>
            {summary.insights.topAccomplishments.map((item, idx) => (
              <InsightItem key={idx}>{item}</InsightItem>
            ))}
          </InsightList>
        ) : (
          <EmptyMessage>{t('reflection.empty_highlights')}</EmptyMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>{t('reflection.section_blockers')}</SectionTitle>
        {summary.insights.commonBlockers.length > 0 ? (
          <InsightList>
            {summary.insights.commonBlockers.map((item, i) => (
              <InsightItem key={i}>{item}</InsightItem>
            ))}
          </InsightList>
        ) : (
          <EmptyMessage>{t('reflection.empty_blockers')}</EmptyMessage>
        )}
      </Section>

      {summary.insights.growthAreas.length > 0 && (
        <Section>
          <SectionTitle>{t('reflection.section_growth')}</SectionTitle>
          <InsightList>
            {summary.insights.growthAreas.map((item, i) => (
              <InsightItem key={i}>{item}</InsightItem>
            ))}
          </InsightList>
        </Section>
      )}

      {summary.insights.recommendations.length > 0 && (
        <RecommendationCard>
          <RecommendationTitle>
            {t('reflection.section_recommendations')}
          </RecommendationTitle>
          <RecommendationList>
            {summary.insights.recommendations.map((item, i) => (
              <RecommendationItem key={i}>{item}</RecommendationItem>
            ))}
          </RecommendationList>
        </RecommendationCard>
      )}

      <Section>
        <SectionTitle>{t('reflection.section_notes')}</SectionTitle>
        <UserNotes
          id={`notes-${summary.id}`}
          name="userNotes"
          aria-label={t('reflection.section_notes')}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setIsDirty(true);
          }}
          placeholder={t('reflection.notes_placeholder')}
        />
        {isDirty && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <SaveButton onClick={handleSaveNotes}>
              {t('reflection.save_notes')}
            </SaveButton>
          </div>
        )}
      </Section>

      <Footer>
        <GeneratedAt>
          {t('reflection.generated_at').replace('{date}', new Date(summary.generatedAt).toLocaleString())}
        </GeneratedAt>
        {onExportRL && (
          <ExportButton onClick={onExportRL}>
            {t('reflection.export_rl')}
          </ExportButton>
        )}
      </Footer>
    </Card>
  );
}

export default PeriodSummaryCard;
