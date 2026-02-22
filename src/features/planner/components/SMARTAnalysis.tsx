/**
 * SMART Analysis Component
 * 分析目标/任务是否符合 SMART 原则，并提供改进建议
 */

import { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { MainQuest } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Animations ====================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

// ==================== Types ====================

export interface SMARTScore {
  specific: { score: number; feedback: string };
  measurable: { score: number; feedback: string };
  achievable: { score: number; feedback: string };
  relevant: { score: number; feedback: string };
  timeBound: { score: number; feedback: string };
  overall: number;
  suggestions: string[];
}

interface SMARTAnalysisProps {
  quest: MainQuest;
  analysis: SMARTScore;
  onApplySuggestion?: (suggestion: string) => void;
  onClose?: () => void;
}

// ==================== Styled Components ====================

const Container = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 16px;
  padding: 20px;
  animation: ${css`${fadeIn}`} 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const QuestName = styled.p`
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const OverallScore = styled.div<{ $score: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  border-radius: 12px;
  background: ${({ theme, $score }) => 
    $score >= 80 ? theme.colors.badge.success.bg :
    $score >= 50 ? theme.colors.badge.warning.bg :
    theme.colors.badge.danger.bg};
  animation: ${({ $score }) => $score < 50 ? css`${pulse} 2s infinite` : 'none'};
`;

const ScoreValue = styled.span<{ $score: number }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme, $score }) => 
    $score >= 80 ? theme.colors.badge.success.text :
    $score >= 50 ? theme.colors.badge.warning.text :
    theme.colors.badge.danger.text};
`;

const ScoreLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CriteriaGrid = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
`;

const CriteriaItem = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const CriteriaLabel = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CriteriaFeedback = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`;

const ScoreBadge = styled.div<{ $score: number }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  
  background: ${({ theme, $score }) => {
    if ($score >= 80) return `linear-gradient(135deg, ${theme.colors.accent.green}, #2d8a4e)`;
    if ($score >= 50) return `linear-gradient(135deg, ${theme.colors.accent.gold}, #c4a000)`;
    return `linear-gradient(135deg, ${theme.colors.accent.red}, #a31515)`;
  }};
  color: white;
  
  @media (max-width: 600px) {
    width: 36px;
    height: 36px;
    font-size: 0.8rem;
  }
`;

const SuggestionsSection = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.primary};
`;

const SuggestionsTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SuggestionList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const SuggestionItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ApplyButton = styled.button`
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  background: ${({ theme }) => theme.colors.accent.primary};
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    filter: brightness(1.1);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// ==================== Helper Functions ====================

const getCriteriaIcon = (criteria: string): string => {
  const icons: Record<string, string> = {
    specific: '🎯',
    measurable: '📏',
    achievable: '✅',
    relevant: '🔗',
    timeBound: '⏰',
  };
  return icons[criteria] || '•';
};

// ==================== Component ====================

export function SMARTAnalysis({ quest, analysis, onApplySuggestion, onClose }: SMARTAnalysisProps) {
  const { t } = useTranslation();
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const getCriteriaLabel = (criteria: string): string => {
    const labels: Record<string, string> = {
      specific: t('planner.smart.criteria_specific'),
      measurable: t('planner.smart.criteria_measurable'),
      achievable: t('planner.smart.criteria_achievable'),
      relevant: t('planner.smart.criteria_relevant'),
      timeBound: t('planner.smart.criteria_time_bound'),
    };
    return labels[criteria] || criteria;
  };
  
  const criteria = [
    { key: 'specific', data: analysis.specific },
    { key: 'measurable', data: analysis.measurable },
    { key: 'achievable', data: analysis.achievable },
    { key: 'relevant', data: analysis.relevant },
    { key: 'timeBound', data: analysis.timeBound },
  ];
  
  const handleApply = (suggestion: string, index: number) => {
    setAppliedSuggestions(prev => new Set([...prev, index]));
    onApplySuggestion?.(suggestion);
  };
  
  return (
    <Container>
      <Header>
        <div>
          <Title>{t('planner.smart.title')}</Title>
          <QuestName>{quest.title}</QuestName>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <OverallScore $score={analysis.overall}>
            <ScoreValue $score={analysis.overall}>{analysis.overall}</ScoreValue>
            <ScoreLabel>{t('planner.smart.total_score')}</ScoreLabel>
          </OverallScore>
          {onClose && (
            <CloseButton onClick={onClose}>✕</CloseButton>
          )}
        </div>
      </Header>
      
      <CriteriaGrid>
        {criteria.map(({ key, data }) => (
          <CriteriaItem key={key}>
            <CriteriaLabel>
              {getCriteriaIcon(key)} {getCriteriaLabel(key)}
            </CriteriaLabel>
            <CriteriaFeedback>{data.feedback}</CriteriaFeedback>
            <ScoreBadge $score={data.score}>{data.score}</ScoreBadge>
          </CriteriaItem>
        ))}
      </CriteriaGrid>
      
      {analysis.suggestions.length > 0 && (
        <SuggestionsSection>
          <SuggestionsTitle>
            {t('planner.smart.suggestions')}
          </SuggestionsTitle>
          <SuggestionList>
            {analysis.suggestions.map((suggestion, index) => (
              <SuggestionItem key={index}>
                <span>{suggestion}</span>
                {onApplySuggestion && !appliedSuggestions.has(index) && (
                  <ApplyButton onClick={() => handleApply(suggestion, index)}>
                    {t('planner.smart.apply')}
                  </ApplyButton>
                )}
                {appliedSuggestions.has(index) && (
                  <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem' }}>
                    {t('planner.smart.applied')}
                  </span>
                )}
              </SuggestionItem>
            ))}
          </SuggestionList>
        </SuggestionsSection>
      )}
    </Container>
  );
}

// ==================== Pruning Decision Component ====================

export interface PruningDecision {
  questId: string;
  questTitle: string;
  currentProgress: number;
  deadline: string;
  timeRemaining: number; // days
  requiredDailyProgress: number;
  feasibility: 'feasible' | 'challenging' | 'impossible';
  recommendation: 'continue' | 'prune' | 'modify';
  reason: string;
  alternatives?: string[];
}

interface PruningCardProps {
  decision: PruningDecision;
  onPrune: () => void;
  onContinue: () => void;
  onModify?: () => void;
}

const PruningContainer = styled.div<{ $feasibility: string }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid ${({ theme, $feasibility }) => 
    $feasibility === 'feasible' ? theme.colors.accent.green :
    $feasibility === 'challenging' ? theme.colors.accent.gold :
    theme.colors.accent.red};
  margin-bottom: 12px;
  animation: ${css`${fadeIn}`} 0.3s ease;
`;

const PruningHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const QuestTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FeasibilityBadge = styled.span<{ $feasibility: string }>`
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  
  background: ${({ theme, $feasibility }) => 
    $feasibility === 'feasible' ? theme.colors.badge.success.bg :
    $feasibility === 'challenging' ? theme.colors.badge.warning.bg :
    theme.colors.badge.danger.bg};
  color: ${({ theme, $feasibility }) => 
    $feasibility === 'feasible' ? theme.colors.badge.success.text :
    $feasibility === 'challenging' ? theme.colors.badge.warning.text :
    theme.colors.badge.danger.text};
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 6px;
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
`;

const RecommendationBox = styled.div<{ $type: string }>`
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  
  background: ${({ theme, $type }) => 
    $type === 'continue' ? theme.colors.badge.success.bg :
    $type === 'prune' ? theme.colors.badge.danger.bg :
    theme.colors.badge.warning.bg};
`;

const RecommendationTitle = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 4px;
  
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RecommendationReason = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PruningActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'danger' | 'secondary' }>`
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ theme, $variant }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.colors.button.success.bg};
        color: ${theme.colors.button.success.text};
        border: none;
      `;
    }
    if ($variant === 'danger') {
      return `
        background: ${theme.colors.button.danger.bg};
        color: ${theme.colors.button.danger.text};
        border: none;
      `;
    }
    return `
      background: transparent;
      color: ${theme.colors.text.secondary};
      border: 1px solid ${theme.colors.border.primary};
    `;
  }}
  
  &:hover {
    filter: brightness(1.1);
  }
`;

export function PruningCard({ decision, onPrune, onContinue, onModify }: PruningCardProps) {
  const { t } = useTranslation();
  const getFeasibilityLabel = (f: string) => {
    if (f === 'feasible') return t('planner.pruning.feasible');
    if (f === 'challenging') return t('planner.pruning.challenging');
    return t('planner.pruning.impossible');
  };
  
  const getRecommendationLabel = (r: string) => {
    if (r === 'continue') return t('planner.pruning.recommend_continue');
    if (r === 'prune') return t('planner.pruning.recommend_prune');
    return t('planner.pruning.recommend_modify');
  };
  
  return (
    <PruningContainer $feasibility={decision.feasibility}>
      <PruningHeader>
        <QuestTitle>{decision.questTitle}</QuestTitle>
        <FeasibilityBadge $feasibility={decision.feasibility}>
          {getFeasibilityLabel(decision.feasibility)}
        </FeasibilityBadge>
      </PruningHeader>
      
      <Stats>
        <StatItem>
          <StatValue>{decision.currentProgress}%</StatValue>
          <StatLabel>{t('planner.pruning.current_progress')}</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{t('planner.pruning.days_value', { days: decision.timeRemaining })}</StatValue>
          <StatLabel>{t('planner.pruning.time_remaining')}</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{decision.requiredDailyProgress.toFixed(1)}%</StatValue>
          <StatLabel>{t('planner.pruning.daily_required')}</StatLabel>
        </StatItem>
      </Stats>
      
      <RecommendationBox $type={decision.recommendation}>
        <RecommendationTitle>
          {getRecommendationLabel(decision.recommendation)}
        </RecommendationTitle>
        <RecommendationReason>{decision.reason}</RecommendationReason>
      </RecommendationBox>
      
      <PruningActions>
        {decision.recommendation === 'prune' ? (
          <>
            <ActionButton $variant="danger" onClick={onPrune}>
              {t('planner.pruning.action_prune')}
            </ActionButton>
            <ActionButton $variant="secondary" onClick={onContinue}>
              {t('planner.pruning.action_continue')}
            </ActionButton>
          </>
        ) : decision.recommendation === 'modify' ? (
          <>
            <ActionButton $variant="primary" onClick={onModify}>
              {t('planner.pruning.action_modify')}
            </ActionButton>
            <ActionButton $variant="secondary" onClick={onContinue}>
              {t('planner.pruning.action_keep')}
            </ActionButton>
          </>
        ) : (
          <ActionButton $variant="primary" onClick={onContinue}>
            {t('planner.pruning.action_keep_going')}
          </ActionButton>
        )}
      </PruningActions>
    </PruningContainer>
  );
}
