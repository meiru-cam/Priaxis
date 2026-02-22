/**
 * ReflectionModal Component
 * 综合复盘模态框 - 显示任务复盘问卷和总结
 */

import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Modal, Button } from '../../../components/ui';
import { ReflectionQuestionnaire } from './ReflectionQuestionnaire';
import type { TaskReflection } from '../../../types/planner';
import type { CustomTask } from '../../../types/task';
import { usePlannerStore } from '../../../stores/planner-store';
import { useGameStore } from '../../../stores';
import { analyzeTaskCompletion } from '../../../services/ai-analysis';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { normalizeLoggedTimeToMinutes } from '../../../lib/focus-time';

// ==================== Types ====================

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CustomTask | null;
  onComplete?: (reflection: TaskReflection) => void;
}

type Phase = 'questionnaire' | 'analyzing' | 'result';

// ==================== Animations ====================

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ==================== Styled Components ====================

const Container = styled.div`
  min-height: 300px;
`;

const AnalyzingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid ${({ theme }) => theme.colors.border.primary};
  border-top-color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const AnalyzingText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1rem;
`;

const ResultContainer = styled.div`
  animation: ${fadeIn} 0.3s ease;
`;

const TaskHeader = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const TaskName = styled.h4`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TaskMeta = styled.div`
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h5`
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SummaryBox = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 16px;
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
`;

const InsightList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const InsightItem = styled.li`
  padding: 10px 14px;
  margin-bottom: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  border-left: 3px solid ${({ theme }) => theme.colors.accent.primary};
`;

const AffirmationBox = styled.div`
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors.accent.primary}15,
    ${({ theme }) => theme.colors.accent.purple}15
  );
  border: 1px solid ${({ theme }) => theme.colors.accent.primary}30;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const AffirmationText = styled.p`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-style: italic;
`;

const GainsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
  
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const GainCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 10px;
  padding: 14px;
`;

const GainTitle = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 8px;
`;

const GainItem = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
  
  &::before {
    content: '+';
    margin-right: 6px;
    color: ${({ theme }) => theme.colors.accent.green};
    font-weight: bold;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

// ==================== Component ====================

export function ReflectionModal({ isOpen, onClose, task, onComplete }: ReflectionModalProps) {
  const { t, language } = useTranslation();
  const [phase, setPhase] = useState<Phase>('questionnaire');
  const [reflection, setReflection] = useState<TaskReflection | null>(null);
  const addReflection = usePlannerStore((s) => s.addReflection);
  const beliefSystem = useGameStore((s) => s.beliefSystem);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('questionnaire');
      setReflection(null);
    }
  }, [isOpen]);

  const handleQuestionnaireComplete = async (data: Omit<TaskReflection, 'aiAnalysis'>) => {
    setPhase('analyzing');

    try {
      // Call AI Analysis
      const aiResult = await analyzeTaskCompletion({
        taskName: task!.name,
        taskDescription: task!.description,
        review: data.goodPoints,
        satisfaction: data.satisfactionScore,
        taskType: task?.taskType,
        analysisMode: 'detailed',
        beliefSystem: {
          mode: beliefSystem.mode,
          profileBeliefs: beliefSystem.profileBeliefs,
        },
        actualTime: task?.actualCosts?.time ? normalizeLoggedTimeToMinutes(task.actualCosts.time) / 60 : undefined,
        actualEnergy: task?.actualCosts?.energy,
        language: language as 'zh' | 'en',
      });

      const fullReflection: TaskReflection = {
        ...data,
        aiAnalysis: aiResult.success ? aiResult.analysis : undefined,
      };

      setReflection(fullReflection);
      addReflection(fullReflection);
      setPhase('result');

    } catch (error) {
      console.error('[ReflectionModal] AI analysis failed:', error);

      // Save even if AI fails
      const basicReflection: TaskReflection = {
        ...data,
        aiAnalysis: undefined,
      };

      setReflection(basicReflection);
      addReflection(basicReflection);
      setPhase('result');
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleClose = () => {
    if (reflection && onComplete) {
      onComplete(reflection);
    }
    onClose();
  };

  const getSatisfactionEmoji = (score: number) => {
    const emojis: Record<number, string> = {
      1: '😫',
      2: '😔',
      3: '😐',
      4: '😊',
      5: '🤩',
    };
    return emojis[score] || '😐';
  };

  const getEnergyEmoji = (state: string) => {
    const emojis: Record<string, string> = {
      high: '⚡',
      medium: '🔋',
      low: '🪫',
    };
    return emojis[state] || '🔋';
  };

  const getEnergyLabel = (state: string) => {
    switch (state) {
      case 'high': return t('reflection.energy_high');
      case 'medium': return t('reflection.energy_medium');
      default: return t('reflection.energy_low');
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('reflection.modal_title')} size="md">
      <Container>
        {phase === 'questionnaire' && (
          <ReflectionQuestionnaire
            task={task}
            onComplete={handleQuestionnaireComplete}
            onSkip={handleSkip}
          />
        )}

        {phase === 'analyzing' && (
          <AnalyzingContainer>
            <Spinner />
            <AnalyzingText>{t('reflection.analyzing')}</AnalyzingText>
          </AnalyzingContainer>
        )}

        {phase === 'result' && reflection && (
          <ResultContainer>
            <TaskHeader>
              <TaskName>✓ {reflection.taskName}</TaskName>
              <TaskMeta>
                <MetaItem>
                  {getSatisfactionEmoji(reflection.satisfactionScore)} {t('reflection.satisfaction')} {reflection.satisfactionScore}/5
                </MetaItem>
                <MetaItem>
                  {getEnergyEmoji(reflection.energyState)}
                  {getEnergyLabel(reflection.energyState)}
                </MetaItem>
              </TaskMeta>
            </TaskHeader>

            {reflection.aiAnalysis && (
              <>
                <Section>
                  <SectionTitle>{t('review.analysis_summary')}</SectionTitle>
                  <SummaryBox>{reflection.aiAnalysis.summary}</SummaryBox>
                </Section>

                {reflection.aiAnalysis.emotionalInsights && reflection.aiAnalysis.emotionalInsights.length > 0 && (
                  <Section>
                    <SectionTitle>{t('reflection.emotional_insights')}</SectionTitle>
                    <InsightList>
                      {reflection.aiAnalysis.emotionalInsights.map((insight, i) => (
                        <InsightItem key={i}>{insight}</InsightItem>
                      ))}
                    </InsightList>
                  </Section>
                )}

                {reflection.aiAnalysis.growthSuggestions && reflection.aiAnalysis.growthSuggestions.length > 0 && (
                  <Section>
                    <SectionTitle>{t('review.growth_suggestions')}</SectionTitle>
                    <InsightList>
                      {reflection.aiAnalysis.growthSuggestions.map((suggestion, i) => (
                        <InsightItem key={i}>{suggestion}</InsightItem>
                      ))}
                    </InsightList>
                  </Section>
                )}

                {(reflection.aiAnalysis.attributeGains?.length || reflection.aiAnalysis.skillProgress?.length) && (
                  <GainsSection>
                    {reflection.aiAnalysis.attributeGains && reflection.aiAnalysis.attributeGains.length > 0 && (
                      <GainCard>
                        <GainTitle>{t('reflection.attribute_gains')}</GainTitle>
                        {reflection.aiAnalysis.attributeGains.map((gain, i) => (
                          <GainItem key={i}>{gain.attribute}: {gain.reason}</GainItem>
                        ))}
                      </GainCard>
                    )}
                    {reflection.aiAnalysis.skillProgress && reflection.aiAnalysis.skillProgress.length > 0 && (
                      <GainCard>
                        <GainTitle>{t('reflection.skill_progress')}</GainTitle>
                        {reflection.aiAnalysis.skillProgress.map((skill, i) => (
                          <GainItem key={i}>{skill.skill}: {skill.reason}</GainItem>
                        ))}
                      </GainCard>
                    )}
                  </GainsSection>
                )}

                {reflection.aiAnalysis.affirmation && (
                  <Section>
                    <AffirmationBox>
                      <AffirmationText>
                        💖 {reflection.aiAnalysis.affirmation}
                      </AffirmationText>
                    </AffirmationBox>
                  </Section>
                )}
              </>
            )}

            {!reflection.aiAnalysis && (
              <Section>
                <SummaryBox>
                  {t('reflection.ai_unavailable')}
                </SummaryBox>
              </Section>
            )}

            <Footer>
              <Button onClick={handleClose}>{t('review.done_btn')}</Button>
            </Footer>
          </ResultContainer>
        )}
      </Container>
    </Modal>
  );
}

export default ReflectionModal;
