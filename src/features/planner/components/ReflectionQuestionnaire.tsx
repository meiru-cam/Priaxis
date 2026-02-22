/**
 * ReflectionQuestionnaire Component
 * 结构化的复盘问卷组件
 */

import { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import type { TaskReflection } from '../../../types/planner';
import type { CustomTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { ImeSafeTextareaBase } from '../../../components/ui';

// ==================== Types ====================

interface ReflectionQuestionnaireProps {
  task: CustomTask;
  onComplete: (reflection: Omit<TaskReflection, 'aiAnalysis'>) => void;
  onSkip?: () => void;
}

type Step = 'satisfaction' | 'energy' | 'goodPoints' | 'improvements' | 'delay' | 'blocker' | 'complete';

// ==================== Animations ====================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`;

// ==================== Styled Components ====================

const Container = styled.div`
  animation: ${fadeIn} 0.3s ease;
`;

const StepIndicator = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

const StepDot = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
  
  background: ${({ theme, $active, $completed }) =>
    $active ? theme.colors.accent.primary :
      $completed ? theme.colors.accent.green :
        theme.colors.border.primary};
`;

const QuestionCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 16px;
  padding: 24px;
  animation: ${slideIn} 0.3s ease;
`;

const Question = styled.h3`
  margin: 0 0 20px;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Emoji = styled.span`
  margin-right: 8px;
`;

// Satisfaction
const SatisfactionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
`;

const SatisfactionButton = styled.button<{ $selected: boolean; $score: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  border: 2px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.accent.primary + '20' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-2px);
  }
`;

const ScoreEmoji = styled.span`
  font-size: 2rem;
`;

const ScoreLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// Energy
const EnergyOptions = styled.div`
  display: flex;
  gap: 12px;
`;

const EnergyButton = styled.button<{ $selected: boolean; $level: string }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border-radius: 12px;
  border: 2px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  background: ${({ theme, $selected, $level }) => {
    if (!$selected) return 'transparent';
    if ($level === 'high') return theme.colors.badge.success.bg;
    if ($level === 'medium') return theme.colors.badge.warning.bg;
    return theme.colors.badge.danger.bg;
  }};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const EnergyIcon = styled.span`
  font-size: 2rem;
`;

const EnergyLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

// Text Input
const TextArea = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border: 2px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const QuickOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const QuickOption = styled.button<{ $selected: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  border: 1px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.accent.primary + '20' : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

// Navigation
const NavButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
`;

const NavButton = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ theme, $primary }) => $primary ? `
    background: ${theme.colors.button.primary.bg};
    color: ${theme.colors.button.primary.text};
    border: none;
    
    &:hover {
      filter: brightness(1.1);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  ` : `
    background: transparent;
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border.primary};
    
    &:hover {
      background: ${theme.colors.bg.tertiary};
    }
  `}
`;

const SkipLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

// ==================== Component ====================

export function ReflectionQuestionnaire({ task, onComplete, onSkip }: ReflectionQuestionnaireProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('satisfaction');
  const [satisfaction, setSatisfaction] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low' | null>(null);
  const [goodPoints, setGoodPoints] = useState('');
  const [improvements, setImprovements] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [blockerAction, setBlockerAction] = useState('');

  const steps: Step[] = ['satisfaction', 'energy', 'goodPoints', 'improvements', 'delay', 'blocker', 'complete'];
  const currentStepIndex = steps.indexOf(step);

  const SATISFACTION_OPTIONS = useMemo(() => [
    { score: 1 as const, emoji: '😫', label: t('review.satisfaction.tired') },
    { score: 2 as const, emoji: '😔', label: t('review.satisfaction.ok') }, // Reusing ok for now, or check correct key
    { score: 3 as const, emoji: '😐', label: t('review.satisfaction.ok') },
    { score: 4 as const, emoji: '😊', label: t('review.satisfaction.good') },
    { score: 5 as const, emoji: '🤩', label: t('review.satisfaction.great') },
  ], [t]);

  const ENERGY_OPTIONS = useMemo(() => [
    { level: 'high' as const, icon: '⚡', label: t('reflection.energy_high') },
    { level: 'medium' as const, icon: '🔋', label: t('reflection.energy_medium') },
    { level: 'low' as const, icon: '🪫', label: t('reflection.energy_low') },
  ], [t]);

  const GOOD_POINTS_SUGGESTIONS = useMemo(() => [
    t('reflection.sug_focus'),
    t('reflection.sug_fast'),
    t('reflection.sug_quality'),
    t('reflection.sug_overcome'),
    t('reflection.sug_learn'),
    t('reflection.sug_collab'),
  ], [t]);

  const IMPROVEMENT_SUGGESTIONS = useMemo(() => [
    t('reflection.imp_focus'),
    t('reflection.imp_estimate'),
    t('reflection.imp_prep'),
    t('reflection.imp_comm'),
    t('reflection.imp_process'),
    t('reflection.imp_tools'),
  ], [t]);

  const DELAY_REASONS = useMemo(() => [
    t('reflection.del_complex'),
    t('reflection.del_interrupt'),
    t('reflection.del_wait'),
    t('reflection.del_energy'),
    t('reflection.del_start'),
    t('reflection.del_perfect'),
    t('reflection.del_other'),
  ], [t]);

  const BLOCKER_ACTIONS = useMemo(() => [
    t('reflection.blk_split'),
    t('reflection.blk_help'),
    t('reflection.blk_priority'),
    t('reflection.blk_reschedule'),
    t('reflection.blk_simplify'),
    t('reflection.blk_start'),
  ], [t]);

  const canProceed = () => {
    switch (step) {
      case 'satisfaction': return satisfaction !== null;
      case 'energy': return energy !== null;
      case 'goodPoints': return true; // optional
      case 'improvements': return true; // optional
      case 'delay': return true; // optional
      case 'blocker': return true; // optional
      default: return true;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      // Skip irrelevant steps
      if (steps[nextIndex] === 'delay' && satisfaction && satisfaction >= 4) {
        // High satisfaction, skip delay reason
        if (nextIndex + 1 < steps.length) {
          setStep(steps[nextIndex + 1]);
        } else {
          handleComplete();
        }
        return;
      }
      setStep(steps[nextIndex]);
    }

    if (steps[nextIndex] === 'complete') {
      handleComplete();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = () => {
    if (!satisfaction || !energy) return;

    const reflection: Omit<TaskReflection, 'aiAnalysis'> = {
      taskId: task.id,
      taskName: task.name,
      completedAt: task.completedAt || new Date().toISOString(),
      satisfactionScore: satisfaction,
      goodPoints: goodPoints || 'None',
      improvements: improvements || 'None',
      delayReason: delayReason || undefined,
      energyState: energy,
      blockerAction: blockerAction || undefined,
    };

    onComplete(reflection);
  };

  const toggleQuickOption = (current: string, option: string, setter: (v: string) => void) => {
    if (current.includes(option)) {
      setter(current.replace(option, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, ''));
    } else {
      setter(current ? `${current}, ${option}` : option);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'satisfaction':
        return (
          <QuestionCard key="satisfaction">
            <Question>
              <Emoji>📊</Emoji>
              {t('reflection.q_satisfaction', { name: task.name })}
            </Question>
            <SatisfactionGrid>
              {SATISFACTION_OPTIONS.map(({ score, emoji, label }) => (
                <SatisfactionButton
                  key={score}
                  $selected={satisfaction === score}
                  $score={score}
                  onClick={() => setSatisfaction(score)}
                >
                  <ScoreEmoji>{emoji}</ScoreEmoji>
                  <ScoreLabel>{label}</ScoreLabel>
                </SatisfactionButton>
              ))}
            </SatisfactionGrid>
          </QuestionCard>
        );

      case 'energy':
        return (
          <QuestionCard key="energy">
            <Question>
              <Emoji>🔋</Emoji>
              {t('reflection.q_energy')}
            </Question>
            <EnergyOptions>
              {ENERGY_OPTIONS.map(({ level, icon, label }) => (
                <EnergyButton
                  key={level}
                  $selected={energy === level}
                  $level={level}
                  onClick={() => setEnergy(level)}
                >
                  <EnergyIcon>{icon}</EnergyIcon>
                  <EnergyLabel>{label}</EnergyLabel>
                </EnergyButton>
              ))}
            </EnergyOptions>
          </QuestionCard>
        );

      case 'goodPoints':
        return (
          <QuestionCard key="goodPoints">
            <Question>
              <Emoji>✨</Emoji>
              {t('reflection.q_good_points')}
            </Question>
            <TextArea
              value={goodPoints}
              onChange={(e) => setGoodPoints(e.target.value)}
              placeholder={t('reflection.p_good_points')}
            />
            <QuickOptions>
              {GOOD_POINTS_SUGGESTIONS.map((suggestion) => (
                <QuickOption
                  key={suggestion}
                  $selected={goodPoints.includes(suggestion)}
                  onClick={() => toggleQuickOption(goodPoints, suggestion, setGoodPoints)}
                >
                  {suggestion}
                </QuickOption>
              ))}
            </QuickOptions>
          </QuestionCard>
        );

      case 'improvements':
        return (
          <QuestionCard key="improvements">
            <Question>
              <Emoji>📝</Emoji>
              {t('reflection.q_improvements')}
            </Question>
            <TextArea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder={t('reflection.p_improvements')}
            />
            <QuickOptions>
              {IMPROVEMENT_SUGGESTIONS.map((suggestion) => (
                <QuickOption
                  key={suggestion}
                  $selected={improvements.includes(suggestion)}
                  onClick={() => toggleQuickOption(improvements, suggestion, setImprovements)}
                >
                  {suggestion}
                </QuickOption>
              ))}
            </QuickOptions>
          </QuestionCard>
        );

      case 'delay':
        return (
          <QuestionCard key="delay">
            <Question>
              <Emoji>⏰</Emoji>
              {t('reflection.q_delay')}
            </Question>
            <TextArea
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder={t('reflection.p_delay')}
            />
            <QuickOptions>
              {DELAY_REASONS.map((reason) => (
                <QuickOption
                  key={reason}
                  $selected={delayReason.includes(reason)}
                  onClick={() => toggleQuickOption(delayReason, reason, setDelayReason)}
                >
                  {reason}
                </QuickOption>
              ))}
            </QuickOptions>
          </QuestionCard>
        );

      case 'blocker':
        return (
          <QuestionCard key="blocker">
            <Question>
              <Emoji>🚀</Emoji>
              {t('reflection.q_blocker')}
            </Question>
            <TextArea
              value={blockerAction}
              onChange={(e) => setBlockerAction(e.target.value)}
              placeholder={t('reflection.p_blocker')}
            />
            <QuickOptions>
              {BLOCKER_ACTIONS.map((action) => (
                <QuickOption
                  key={action}
                  $selected={blockerAction.includes(action)}
                  onClick={() => toggleQuickOption(blockerAction, action, setBlockerAction)}
                >
                  {action}
                </QuickOption>
              ))}
            </QuickOptions>
          </QuestionCard>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <StepIndicator>
        {steps.slice(0, -1).map((s, i) => (
          <StepDot
            key={s}
            $active={step === s}
            $completed={i < currentStepIndex}
          />
        ))}
      </StepIndicator>

      {renderStep()}

      <NavButtons>
        {currentStepIndex > 0 ? (
          <NavButton onClick={handleBack}>{t('reflection.btn_prev')}</NavButton>
        ) : onSkip ? (
          <SkipLink onClick={onSkip}>{t('reflection.btn_skip')}</SkipLink>
        ) : (
          <div />
        )}

        <NavButton
          $primary
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {currentStepIndex < steps.length - 2 ? t('reflection.btn_next') : t('reflection.btn_complete')}
        </NavButton>
      </NavButtons>
    </Container>
  );
}

export default ReflectionQuestionnaire;
