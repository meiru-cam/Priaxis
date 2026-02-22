/**
 * TaskReviewModal Component
 * Modal for reviewing task completion with AI analysis
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Modal, Button, Textarea, Input } from '../../../components/ui';
import { BeliefConfigModal } from '../../../components/belief/BeliefConfigModal';
import { generateLocalAnalysis, analyzeTaskCompletion } from '../../../services/ai-analysis';
import type { CustomTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { useGameStore } from '../../../stores';

interface TaskReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: TaskReviewData) => void;
  task: CustomTask | null;
}

export interface TaskReviewData {
  taskId: string;
  review: string;
  actualTime?: number;
  actualEnergy?: number;
  satisfaction?: number;
}

type ModalPhase = 'review' | 'analyzing' | 'result';

interface AnalysisResult {
  summary: string;
  beliefPatterns?: string[];
  limitingBeliefAlerts?: string[];
  reframeSuggestions?: string[];
  emotionalInsights?: string[];
  growthSuggestions?: string[];
  affirmation?: string;
  attributeGains?: {
    attribute: string;
    reason: string;
  }[];
  skillProgress?: {
    skill: string;
    reason: string;
  }[];
}

const QUOTE_KEYS = [
  'review.quote_1',
  'review.quote_2',
  'review.quote_3',
  'review.quote_4',
  'review.quote_5',
] as const;

const ReviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TaskInfo = styled.div`
  background: ${({ theme }) => theme.colors.card.purple.bg};
  border: 1px solid ${({ theme }) => theme.colors.accent.purple};
  border-radius: 10px;
  padding: 16px;
`;

const TaskName = styled.h4`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TaskDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-style: italic;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MetricGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MetricLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SatisfactionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SatisfactionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SatisfactionButton = styled.button<{ $selected: boolean; $level: number }>`
  flex: 1;
  padding: 12px 8px;
  border: 2px solid ${({ $selected, theme }) =>
    $selected ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 10px;
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.card.purple.bg : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    background: ${({ theme }) => theme.colors.card.purple.bg};
  }

  span:first-child {
    font-size: 1.5rem;
  }

  span:last-child {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const QuoteBox = styled.div`
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
  border-left: 4px solid ${({ theme }) => theme.colors.accent.purple};
  border-radius: 0 10px 10px 0;
  padding: 16px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const AnalysisModeRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const AnalysisModeButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.accent.purple : theme.colors.border.secondary};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.card.purple.bg : theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

// Analyzing phase styles
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const AnalyzingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 20px;
`;

const AnalyzingIcon = styled.div`
  font-size: 3rem;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const AnalyzingText = styled.div`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const ProgressBar = styled.div`
  width: 100%;
  max-width: 300px;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: linear-gradient(90deg, #8b5cf6, #3b82f6);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

// Result phase styles
const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ResultSection = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 10px;
  padding: 16px;
`;

const ResultTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResultText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
`;

const ResultList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
  line-height: 1.8;
`;

const AffirmationBox = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-style: italic;
`;

export function TaskReviewModal({
  isOpen,
  onClose,
  onSubmit,
  task,
}: TaskReviewModalProps) {
  const { t, language } = useTranslation();
  const [review, setReview] = useState('');
  const [actualTimeInput, setActualTimeInput] = useState('');
  const [actualEnergyInput, setActualEnergyInput] = useState('');
  const [satisfaction, setSatisfaction] = useState<number>(3);

  // AI Analysis state
  const [phase, setPhase] = useState<ModalPhase>('review');
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'detailed'>('quick');
  const [beliefConfigOpen, setBeliefConfigOpen] = useState(false);
  const beliefSystem = useGameStore((s) => s.beliefSystem);
  const setBeliefMode = useGameStore((s) => s.setBeliefMode);
  const setProfileBeliefs = useGameStore((s) => s.setProfileBeliefs);

  useEffect(() => {
    if (isOpen && task?.id) {
      setQuoteIndex(Math.floor(Math.random() * QUOTE_KEYS.length));
    }
  }, [isOpen, task?.id]);

  const satisfactionLevels = [
    { level: 1, emoji: '😫', label: t('review.satisfaction.tired') },
    { level: 2, emoji: '😐', label: t('review.satisfaction.ok') },
    { level: 3, emoji: '😊', label: t('review.satisfaction.good') },
    { level: 4, emoji: '😄', label: t('review.satisfaction.great') },
    { level: 5, emoji: '🤩', label: t('review.satisfaction.perfect') },
  ];

  const analyzingSteps = useMemo(() => [
    { text: t('review.step.analyzing'), progress: 20 },
    { text: t('review.step.patterns'), progress: 40 },
    { text: t('review.step.emotions'), progress: 60 },
    { text: t('review.step.suggestions'), progress: 80 },
    { text: t('review.step.done'), progress: 100 },
  ], [t]);

  const resetForm = useCallback(() => {
    setReview('');
    setActualTimeInput('');
    setActualEnergyInput('');
    setSatisfaction(3);
    setPhase('review');
    setAnalyzingStep(0);
    setAnalysisResult(null);
  }, []);

  const parseActualTime = useCallback(() => {
    const value = actualTimeInput.trim();
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed;
  }, [actualTimeInput]);

  const parseActualEnergy = useCallback(() => {
    const value = actualEnergyInput.trim();
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.min(100, Math.max(0, Math.round(parsed)));
  }, [actualEnergyInput]);

  const handleSubmit = async () => {
    if (!task) return;

    const actualTime = parseActualTime();
    const actualEnergy = parseActualEnergy();

    // Submit the review data first
    onSubmit({
      taskId: task.id,
      review: review.trim(),
      actualTime,
      actualEnergy,
      satisfaction,
    });

    // Start AI analysis phase
    setPhase('analyzing');

    // Animate through steps
    for (let i = 0; i < analyzingSteps.length; i++) {
      setAnalyzingStep(i);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Try AI analysis, fallback to local
    try {
      const result = await analyzeTaskCompletion({
        taskName: task.name,
        taskDescription: task.description,
        review: review.trim(),
        satisfaction,
        taskType: task.taskType,
        analysisMode,
        beliefSystem: {
          mode: beliefSystem.mode,
          profileBeliefs: beliefSystem.profileBeliefs,
        },
        actualTime,
        actualEnergy,
        language: language as 'zh' | 'en',
      });

      if (result.success && result.analysis) {
        setAnalysisResult(result.analysis);
      } else {
        // Use local analysis as fallback
        const localResult = generateLocalAnalysis({
          taskName: task.name,
          review: review.trim(),
          satisfaction,
          language: language as 'zh' | 'en',
        });
        if (localResult.analysis) {
          setAnalysisResult(localResult.analysis);
        }
      }
    } catch {
      // Use local analysis as fallback
      const localResult = generateLocalAnalysis({
        taskName: task.name,
        review: review.trim(),
        satisfaction,
        language: language as 'zh' | 'en',
      });
      if (localResult.analysis) {
        setAnalysisResult(localResult.analysis);
      }
    }

    setPhase('result');
  };

  const handleSkip = () => {
    if (!task) return;

    onSubmit({
      taskId: task.id,
      review: '',
      satisfaction: 3,
    });

    resetForm();
    onClose();
  };

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!task) return null;

  // Render based on phase
  const renderContent = () => {
    switch (phase) {
      case 'analyzing':
        return (
          <AnalyzingContainer>
            <AnalyzingIcon>🤖</AnalyzingIcon>
            <AnalyzingText>{analyzingSteps[analyzingStep]?.text}</AnalyzingText>
            <ProgressBar>
              <ProgressFill $progress={analyzingSteps[analyzingStep]?.progress || 0} />
            </ProgressBar>
          </AnalyzingContainer>
        );

      case 'result':
        return (
          <ResultContainer>
            <TaskInfo>
              <TaskName>✅ {task.name}</TaskName>
              <TaskDescription>{t('review.task_archived')}</TaskDescription>
            </TaskInfo>

            {analysisResult && (
              <>
                <ResultSection>
                  <ResultTitle>{t('review.analysis_summary')}</ResultTitle>
                  <ResultText>{analysisResult.summary}</ResultText>
                </ResultSection>

                {analysisResult.growthSuggestions && analysisResult.growthSuggestions.length > 0 && (
                  <ResultSection>
                    <ResultTitle>{t('review.growth_suggestions')}</ResultTitle>
                    <ResultList>
                      {analysisResult.growthSuggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ResultList>
                  </ResultSection>
                )}

                {analysisResult.beliefPatterns && analysisResult.beliefPatterns.length > 0 && (
                  <ResultSection>
                    <ResultTitle>{t('review.belief_patterns')}</ResultTitle>
                    <ResultList>
                      {analysisResult.beliefPatterns.map((pattern, i) => (
                        <li key={i}>{pattern}</li>
                      ))}
                    </ResultList>
                  </ResultSection>
                )}

                {analysisResult.limitingBeliefAlerts && analysisResult.limitingBeliefAlerts.length > 0 && (
                  <ResultSection>
                    <ResultTitle>{t('review.limiting_beliefs')}</ResultTitle>
                    <ResultList>
                      {analysisResult.limitingBeliefAlerts.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ResultList>
                  </ResultSection>
                )}

                {analysisResult.reframeSuggestions && analysisResult.reframeSuggestions.length > 0 && (
                  <ResultSection>
                    <ResultTitle>{t('review.reframe_suggestions')}</ResultTitle>
                    <ResultList>
                      {analysisResult.reframeSuggestions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ResultList>
                  </ResultSection>
                )}

                {analysisResult.attributeGains && analysisResult.attributeGains.length > 0 && (
                  <ResultSection>
                    <ResultTitle>{t('reflection.attribute_gains')}</ResultTitle>
                    <ResultList>
                      {analysisResult.attributeGains.map((gain, i) => (
                        <li key={i}>
                          <strong>{gain.attribute}</strong>: {gain.reason}
                        </li>
                      ))}
                    </ResultList>
                  </ResultSection>
                )}

                {analysisResult.skillProgress && analysisResult.skillProgress.length > 0 && (
                  <ResultSection>
                    <ResultTitle>{t('reflection.skill_progress')}</ResultTitle>
                    <ResultList>
                      {analysisResult.skillProgress.map((skill, i) => (
                        <li key={i}>
                          <strong>{skill.skill}</strong>: {skill.reason}
                        </li>
                      ))}
                    </ResultList>
                  </ResultSection>
                )}

                {analysisResult.affirmation && (
                  <AffirmationBox>
                    ✨ {analysisResult.affirmation}
                  </AffirmationBox>
                )}
              </>
            )}

            <ButtonRow>
              <Button onClick={handleClose}>{t('review.done_btn')}</Button>
            </ButtonRow>
          </ResultContainer>
        );

      default: // review phase
        return (
          <ReviewContainer>
            <TaskInfo>
              <TaskName>{task.name}</TaskName>
              {task.description && <TaskDescription>{task.description}</TaskDescription>}
            </TaskInfo>

            <QuoteBox>
              💫 {t(QUOTE_KEYS[quoteIndex] || 'review.quote_1')}
            </QuoteBox>

            <MetricGroup>
              <MetricLabel>{t('review.analysis_mode')}</MetricLabel>
              <AnalysisModeRow>
                <AnalysisModeButton
                  type="button"
                  $active={analysisMode === 'quick'}
                  onClick={() => setAnalysisMode('quick')}
                >
                  {t('review.mode_quick')}
                </AnalysisModeButton>
                <AnalysisModeButton
                  type="button"
                  $active={analysisMode === 'detailed'}
                  onClick={() => setAnalysisMode('detailed')}
                >
                  {t('review.mode_detailed')}
                </AnalysisModeButton>
                <Button type="button" variant="secondary" onClick={() => setBeliefConfigOpen(true)}>
                  {t('belief.configure')}
                </Button>
              </AnalysisModeRow>
            </MetricGroup>

            <SatisfactionGroup>
              <MetricLabel>{t('review.satisfaction')}</MetricLabel>
              <SatisfactionButtons>
                {satisfactionLevels.map((level) => (
                  <SatisfactionButton
                    key={level.level}
                    $selected={satisfaction === level.level}
                    $level={level.level}
                    onClick={() => setSatisfaction(level.level)}
                    type="button"
                  >
                    <span>{level.emoji}</span>
                    <span>{level.label}</span>
                  </SatisfactionButton>
                ))}
              </SatisfactionButtons>
            </SatisfactionGroup>

            <MetricsRow>
              <MetricGroup>
                <MetricLabel htmlFor="review-actual-time">{t('review.actual_time')}</MetricLabel>
                <Input
                  id="review-actual-time"
                  name="actualTime"
                  type="text"
                  inputMode="decimal"
                  value={actualTimeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setActualTimeInput(val);
                    }
                  }}
                  placeholder={t('review.placeholder_time')}
                />
              </MetricGroup>

              <MetricGroup>
                <MetricLabel htmlFor="review-actual-energy">{t('review.actual_energy')}</MetricLabel>
                <Input
                  id="review-actual-energy"
                  name="actualEnergy"
                  type="text"
                  inputMode="numeric"
                  value={actualEnergyInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) {
                      setActualEnergyInput(val);
                    }
                  }}
                  placeholder={t('review.placeholder_energy')}
                />
              </MetricGroup>

              <MetricGroup>
                <MetricLabel htmlFor="review-estimated-energy">{t('review.estimated_energy')}</MetricLabel>
                <Input
                  id="review-estimated-energy"
                  name="estimatedEnergy"
                  type="number"
                  value={task.estimatedCosts?.energy ? Math.abs(task.estimatedCosts.energy) : 0}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </MetricGroup>
            </MetricsRow>

            <MetricGroup>
              <MetricLabel htmlFor="review-text">{t('review.comment_label')}</MetricLabel>
              <Textarea
                id="review-text"
                name="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder={t('review.comment_placeholder')}
                minRows={3}
              />
            </MetricGroup>

            <ButtonRow>
              <Button type="button" variant="secondary" onClick={handleSkip}>
                {t('review.skip_btn')}
              </Button>
              <Button onClick={handleSubmit}>
                {t('review.submit_btn')}
              </Button>
            </ButtonRow>
          </ReviewContainer>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={phase === 'analyzing' ? () => { } : handleClose}
      title={
        phase === 'analyzing'
          ? t('review.title_analyzing')
          : phase === 'result'
            ? t('review.title_complete')
            : t('review.title_task_done')
      }
      subtitle={
        phase === 'analyzing'
          ? t('review.subtitle_waiting')
          : phase === 'result'
            ? undefined
            : t('review.subtitle_record')
      }
      size="md"
    >
      {renderContent()}
      <BeliefConfigModal
        isOpen={beliefConfigOpen}
        onClose={() => setBeliefConfigOpen(false)}
        mode={beliefSystem.mode}
        profileBeliefs={beliefSystem.profileBeliefs}
        onSave={(nextMode, nextBeliefs) => {
          setBeliefMode(nextMode);
          setProfileBeliefs(nextBeliefs);
        }}
      />
    </Modal>
  );
}

export default TaskReviewModal;
