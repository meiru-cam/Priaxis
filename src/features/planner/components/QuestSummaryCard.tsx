/**
 * QuestSummaryCard Component
 * 显示副本完成总结的卡片组件
 */

import styled, { keyframes } from 'styled-components';
import type { QuestSummary } from '../../../services/reflection-service';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Types ====================

interface QuestSummaryCardProps {
  summary: QuestSummary;
  onClose?: () => void;
}

// ==================== Animations ====================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ==================== Styled Components ====================

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 16px;
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;
`;

const Banner = styled.div`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.accent.primary},
    ${({ theme }) => theme.colors.accent.purple}
  );
  padding: 24px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    background-size: 200% 100%;
    animation: ${shimmer} 3s infinite;
  }
`;

const QuestTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 1.4rem;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const CompletedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  font-size: 0.85rem;
  color: white;
`;

const Content = styled.div`
  padding: 24px;
`;

// Stats
const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
  
  @media (max-width: 500px) {
    flex-wrap: wrap;
  }
`;

const Stat = styled.div`
  flex: 1;
  text-align: center;
  min-width: 80px;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// Sections
const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ItemList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Item = styled.li`
  padding: 8px 12px;
  margin-bottom: 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};
  border-left: 3px solid ${({ theme }) => theme.colors.accent.primary};
`;

const EmptyMessage = styled.div`
  padding: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
  font-size: 0.9rem;
`;

// AI Summary
const AISummaryBox = styled.div`
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors.accent.purple}10,
    ${({ theme }) => theme.colors.accent.primary}10
  );
  border: 1px solid ${({ theme }) => theme.colors.accent.purple}30;
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
`;

const AISummaryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.purple};
`;

const AISummaryText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
`;

// Footer
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const CloseButton = styled.button`
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.button.primary.bg};
  color: ${({ theme }) => theme.colors.button.primary.text};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    filter: brightness(1.1);
  }
`;

// ==================== Component ====================

export function QuestSummaryCard({ summary, onClose }: QuestSummaryCardProps) {
  const { t, language } = useTranslation();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const getSatisfactionEmoji = (score: number) => {
    if (score >= 4.5) return '🤩';
    if (score >= 4) return '😊';
    if (score >= 3) return '😐';
    if (score >= 2) return '😔';
    return '😫';
  };
  
  return (
    <Card>
      <Banner>
        <QuestTitle>🏆 {summary.questTitle}</QuestTitle>
        <CompletedBadge>
          {t('planner.quest_summary.completed_badge').replace('{date}', formatDate(summary.completedAt))}
        </CompletedBadge>
      </Banner>
      
      <Content>
        <StatsRow>
          <Stat>
            <StatValue>{summary.stats.completedTasks}/{summary.stats.totalTasks}</StatValue>
            <StatLabel>{t('planner.quest_summary.stat_tasks')}</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{t('planner.quest_summary.value_duration_days').replace('{days}', summary.stats.duration.toString())}</StatValue>
            <StatLabel>{t('planner.quest_summary.stat_duration')}</StatLabel>
          </Stat>
          <Stat>
            <StatValue>
              {getSatisfactionEmoji(summary.stats.avgSatisfaction)} {summary.stats.avgSatisfaction.toFixed(1)}
            </StatValue>
            <StatLabel>{t('planner.quest_summary.stat_satisfaction')}</StatLabel>
          </Stat>
          <Stat>
            <StatValue>{Math.round(summary.stats.totalFocusTime / 60)}h</StatValue>
            <StatLabel>{t('planner.quest_summary.stat_focus_time')}</StatLabel>
          </Stat>
        </StatsRow>
        
        <Section>
          <SectionTitle>{t('planner.quest_summary.section_highlights')}</SectionTitle>
          {summary.highlights.length > 0 ? (
            <ItemList>
              {summary.highlights.map((item, i) => (
                <Item key={i}>{item}</Item>
              ))}
            </ItemList>
          ) : (
            <EmptyMessage>{t('planner.quest_summary.empty')}</EmptyMessage>
          )}
        </Section>
        
        <Section>
          <SectionTitle>{t('planner.quest_summary.section_challenges')}</SectionTitle>
          {summary.challenges.length > 0 ? (
            <ItemList>
              {summary.challenges.map((item, i) => (
                <Item key={i}>{item}</Item>
              ))}
            </ItemList>
          ) : (
            <EmptyMessage>{t('planner.quest_summary.empty')}</EmptyMessage>
          )}
        </Section>
        
        <Section>
          <SectionTitle>{t('planner.quest_summary.section_learnings')}</SectionTitle>
          {summary.learnings.length > 0 ? (
            <ItemList>
              {summary.learnings.map((item, i) => (
                <Item key={i}>{item}</Item>
              ))}
            </ItemList>
          ) : (
            <EmptyMessage>{t('planner.quest_summary.empty')}</EmptyMessage>
          )}
        </Section>
        
        {summary.aiSummary && (
          <AISummaryBox>
            <AISummaryHeader>
              {t('planner.quest_summary.ai_summary')}
            </AISummaryHeader>
            <AISummaryText>{summary.aiSummary}</AISummaryText>
          </AISummaryBox>
        )}
      </Content>
      
      {onClose && (
        <Footer>
          <CloseButton onClick={onClose}>{t('planner.quest_summary.confirm')}</CloseButton>
        </Footer>
      )}
    </Card>
  );
}

export default QuestSummaryCard;
