/**
 * PomodoroWidget Component
 * Floating timer widget with controls and task linking
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import styled, { css, keyframes } from 'styled-components';
import { usePomodoroStore, usePomodoroTime, usePomodoroProgress } from '../../../stores/pomodoro-store';
import { useGameStore } from '../../../stores/game-store';
import type { CustomTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { ImeSafeInputBase } from '../../../components/ui';
import { getQ1Tasks, playPomodoroNotificationSound } from './pomodoro-widget-utils';

interface PomodoroWidgetProps {
  tasks?: CustomTask[];
  onSelectTask?: (task: CustomTask) => void;
  onComplete?: (taskId: string | null) => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const WidgetContainer = styled.div<{ $minimized: boolean; $isRunning: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ $minimized }) => ($minimized ? '50%' : '16px')};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  transition: all 0.3s ease;
  z-index: 1000;
  overflow: hidden;

  ${({ $minimized }) =>
    $minimized
      ? css`
          width: 64px;
          height: 64px;
          cursor: pointer;
        `
      : css`
          width: 280px;
          padding: 16px;
        `}

  ${({ $isRunning }) =>
    $isRunning &&
    css`
      border-color: #ef4444;
      animation: ${pulse} 2s ease-in-out infinite;
    `}
`;

const MinimizedView = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  position: relative;
`;

const MinimizedTimer = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
`;

const MinimizedProgress = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const Title = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MinimizeButton = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TimerDisplay = styled.div`
  text-align: center;
  margin-bottom: 16px;
`;

const TimeText = styled.div<{ $isRunning: boolean }>`
  font-size: 3rem;
  font-weight: 700;
  font-family: 'SF Mono', 'Monaco', monospace;
  color: ${({ theme, $isRunning }) =>
    $isRunning ? '#ef4444' : theme.colors.text.primary};
  line-height: 1;
  margin-bottom: 8px;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div.attrs<{ $progress: number; $isRunning: boolean }>(
  (props) => ({
    style: {
      width: `${props.$progress}%`,
    },
  })
) <{ $progress: number; $isRunning: boolean }>`
  height: 100%;
  background: ${({ $isRunning }) => ($isRunning ? '#ef4444' : '#8b5cf6')};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const LinkedTask = styled.div`
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const TaskName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const ClearTaskButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 2px;
  font-size: 0.8rem;

  &:hover {
    color: ${({ theme }) => theme.colors.status.danger.text};
  }
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const ControlButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.accent.green};
          color: white;

          &:hover {
            background: ${theme.colors.accent.green}dd;
            transform: scale(1.05);
          }
        `;
      case 'danger':
        return css`
          background: #ef4444;
          color: white;

          &:hover {
            background: #dc2626;
            transform: scale(1.05);
          }
        `;
      default:
        return css`
          background: ${theme.colors.bg.tertiary};
          color: ${theme.colors.text.secondary};

          &:hover {
            background: ${theme.colors.bg.secondary};
            transform: scale(1.05);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const EarlyCompleteButton = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const DurationSelector = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const DurationButton = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border: 1px solid ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.text.tertiary};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CustomDurationInput = styled(ImeSafeInputBase)`
  width: 48px;
  padding: 4px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.75rem;
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Hide number input spinners */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

import greatImg from '../../../assets/great.jpeg';

// ... (existing imports)

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const CompletionCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 24px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  animation: ${pulse} 0.5s ease-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const CompletionImage = styled.img`
  width: 100%;
  max-width: 280px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  object-fit: cover;
`;

const CompletionTitle = styled.h2`
  margin: 0;
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const CompletionMessage = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1rem;
`;

const TaskPickList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaskPickButton = styled.button`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 10px;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' | 'outline' }>`
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  border: none;

  ${({ theme, $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.accent.green};
          color: white;
          &:hover { filter: brightness(1.1); }
        `;
      case 'secondary':
        return css`
          background: ${theme.colors.accent.blue};
          color: white;
          &:hover { filter: brightness(1.1); }
        `;
      default:
        return css`
          background: transparent;
          border: 2px solid ${theme.colors.border.primary};
          color: ${theme.colors.text.primary};
          &:hover { background: ${theme.colors.bg.tertiary}; }
        `;
    }
  }}
`;

export function PomodoroWidget({
  onComplete,
  onToggleMinimize,
}: PomodoroWidgetProps) {
  const { t } = useTranslation();
  const intervalRef = useRef<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [showBreakEndOverlay, setShowBreakEndOverlay] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const hasCompletedRef = useRef(false);

  // Store state
  const isRunning = usePomodoroStore((s) => s.isRunning);
  const linkedTaskId = usePomodoroStore((s) => s.linkedTaskId);
  const linkedTaskName = usePomodoroStore((s) => s.linkedTaskName);
  const completedToday = usePomodoroStore((s) => s.completedToday);
  const totalCompleted = usePomodoroStore((s) => s.totalCompleted);
  const totalTime = usePomodoroStore((s) => s.totalTime);

  // Store actions
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const reset = usePomodoroStore((s) => s.reset);
  const tick = usePomodoroStore((s) => s.tick);
  const setDuration = usePomodoroStore((s) => s.setDuration);
  const clearLinkedTask = usePomodoroStore((s) => s.clearLinkedTask);
  const setLinkedTask = usePomodoroStore((s) => s.setLinkedTask);
  const recoverState = usePomodoroStore((s) => s.recoverState);
  const complete = usePomodoroStore((s) => s.complete);

  // Game store for updating task pomodoroCount
  const customTasks = useGameStore((s) => s.customTasks);
  const updateTask = useGameStore((s) => s.updateTask);
  const startTask = useGameStore((s) => s.startTask);

  // Utility hooks
  const { formatted, timeLeft } = usePomodoroTime();
  const { progress } = usePomodoroProgress();

  // Current duration in minutes
  const currentDurationMinutes = Math.round(totalTime / 60);
  const q1Tasks = useMemo(() => getQ1Tasks(customTasks), [customTasks]);

  // Keep focus baseline duration in sync when user changes duration in focus mode.
  useEffect(() => {
    if (!isRunning && sessionType === 'focus' && currentDurationMinutes > 0) {
      setFocusDurationMinutes(currentDurationMinutes);
    }
  }, [currentDurationMinutes, isRunning, sessionType]);

  // Recover state on mount and when tab becomes visible
  useEffect(() => {
    recoverState();

    // Sync timer when tab becomes visible (handles browser throttling)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recoverState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recoverState]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, tick]);

  const handlePomodoroComplete = useCallback((taskId: string | null) => {
    const linkedTask = taskId ? customTasks.find(t => t.id === taskId) : null;

    // Track invested pomodoro sessions on task (does not auto-complete task).
    if (linkedTask) {
      updateTask(taskId!, {
        pomodoroCount: (linkedTask.pomodoroCount || 0) + 1,
      });
    }

    onComplete?.(taskId);

    playPomodoroNotificationSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(t('pomodoro.notify.title'), {
        body: linkedTask
          ? t('pomodoro.notify.body_with_task', { task: linkedTask.name })
          : t('pomodoro.notify.body_no_task'),
        icon: '/logo-192.png',
        tag: 'pomodoro-complete',
      });
      setTimeout(() => notification.close(), 8000);
    }
  }, [customTasks, onComplete, t, updateTask]);

  // Trigger completion flow exactly once when timer reaches 00:00.
  useEffect(() => {
    if (timeLeft === 0 && !isRunning && !hasCompletedRef.current) {
      hasCompletedRef.current = true;

      if (sessionType === 'break') {
        setSessionType('focus');
        setDuration(focusDurationMinutes);
        setShowBreakEndOverlay(true);
        playPomodoroNotificationSound();
      } else {
        const taskId = linkedTaskId;
        complete();
        handlePomodoroComplete(taskId);
        setShowCompletionOverlay(true);
      }
      return;
    }

    if (timeLeft > 0) {
      hasCompletedRef.current = false;
    }
  }, [complete, focusDurationMinutes, handlePomodoroComplete, isRunning, linkedTaskId, sessionType, setDuration, timeLeft]);

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
    onToggleMinimize?.();
  };

  const handleStart = () => {
    // Request notification permission on user interaction
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Auto-start the linked task if it's not already started
    if (linkedTaskId) {
      const task = customTasks.find(t => t.id === linkedTaskId);
      if (task && !task.startedAt) {
        startTask(linkedTaskId);
      }
    }
    start();
  };

  const handlePause = () => {
    pause();
  };

  const handleReset = () => {
    reset();
  };

  const handleSetDuration = (minutes: number) => {
    if (!isRunning) {
      setDuration(minutes);
    }
  };

  const handleFinishSession = (action: 'continue' | 'break' | 'done') => {
    setShowCompletionOverlay(false);

    if (action === 'continue') {
      setSessionType('focus');
      start();
    } else if (action === 'break') {
      setFocusDurationMinutes(currentDurationMinutes);
      setSessionType('break');
      setDuration(5);
      start();
    } else {
      setSessionType('focus');
    }
  };

  const handleEarlyComplete = () => {
    if (!isRunning) return;

    if (sessionType === 'break') {
      pause();
      setSessionType('focus');
      setDuration(focusDurationMinutes);
      setShowBreakEndOverlay(true);
      return;
    }

    const taskId = linkedTaskId;
    complete();
    handlePomodoroComplete(taskId);
    setShowCompletionOverlay(true);
  };

  const handleSelectQ1Task = (taskId: string, taskName: string) => {
    setLinkedTask(taskId, taskName);
    const selected = customTasks.find(t => t.id === taskId);
    if (selected && !selected.startedAt) {
      startTask(taskId);
    }
    setSessionType('focus');
    setDuration(focusDurationMinutes);
    setShowBreakEndOverlay(false);
    start(taskId, taskName);
  };

  const handleContinueAfterBreak = () => {
    setSessionType('focus');
    setDuration(focusDurationMinutes);
    setShowBreakEndOverlay(false);
    start();
  };

  return (
    <>
      {showCompletionOverlay && (
        <Overlay>
          <CompletionCard>
            <CompletionImage src={greatImg} alt={t('pomodoro.widget.great_job_alt')} />
            <CompletionTitle>{t('pomodoro.complete.title')}</CompletionTitle>
            <CompletionMessage>
              {t('pomodoro.complete.message')}
            </CompletionMessage>
            <ButtonGroup>
              <ActionBtn $variant="primary" onClick={() => handleFinishSession('continue')}>
                {t('pomodoro.complete.continue')}
              </ActionBtn>
              <ActionBtn $variant="secondary" onClick={() => handleFinishSession('break')}>
                {t('pomodoro.complete.break')}
              </ActionBtn>
              <ActionBtn $variant="outline" onClick={() => handleFinishSession('done')}>
                {t('pomodoro.complete.done')}
              </ActionBtn>
            </ButtonGroup>
          </CompletionCard>
        </Overlay>
      )}
      {showBreakEndOverlay && (
        <Overlay>
          <CompletionCard>
            <CompletionTitle>{t('pomodoro.break_end.title')}</CompletionTitle>
            <CompletionMessage>{t('pomodoro.break_end.message')}</CompletionMessage>
            <TaskPickList>
              {q1Tasks.map((task) => (
                <TaskPickButton key={task.id} onClick={() => handleSelectQ1Task(task.id, task.name)}>
                  {task.name}
                </TaskPickButton>
              ))}
            </TaskPickList>
            {q1Tasks.length === 0 && (
              <CompletionMessage>{t('pomodoro.break_end.empty')}</CompletionMessage>
            )}
            <ButtonGroup>
              <ActionBtn $variant="outline" onClick={handleContinueAfterBreak}>
                {t('pomodoro.break_end.continue')}
              </ActionBtn>
            </ButtonGroup>
          </CompletionCard>
        </Overlay>
      )}

      {isMinimized ? (
        <WidgetContainer
          $minimized={true}
          $isRunning={isRunning}
          onClick={handleToggleMinimize}
        >
          <MinimizedView>
            <MinimizedProgress viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={isRunning ? '#ef4444' : '#8b5cf6'}
                strokeWidth="4"
                strokeDasharray={`${progress * 1.76} 176`}
                opacity="0.3"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={isRunning ? '#ef4444' : '#8b5cf6'}
                strokeWidth="4"
                strokeDasharray={`${progress * 1.76} 176`}
              />
            </MinimizedProgress>
            🍅
            <MinimizedTimer>{formatted}</MinimizedTimer>
          </MinimizedView>
        </WidgetContainer>
      ) : (
        <WidgetContainer $minimized={false} $isRunning={isRunning}>
          <Header>
            <Title>
              {t('pomodoro.widget.title')}
            </Title>
            <MinimizeButton onClick={handleToggleMinimize}>
              ─
            </MinimizeButton>
          </Header>

          <TimerDisplay>
            <TimeText $isRunning={isRunning}>{formatted}</TimeText>
            <ProgressBar>
              <ProgressFill $progress={progress} $isRunning={isRunning} />
            </ProgressBar>
          </TimerDisplay>

          {linkedTaskName && (
            <LinkedTask>
              <TaskName>🎯 {linkedTaskName}</TaskName>
              <ClearTaskButton onClick={clearLinkedTask} disabled={isRunning}>
                ✕
              </ClearTaskButton>
            </LinkedTask>
          )}

          <DurationSelector>
            {[15, 20, 25, 45].map((mins) => (
              <DurationButton
                key={mins}
                $active={currentDurationMinutes === mins}
                onClick={() => handleSetDuration(mins)}
                disabled={isRunning}
              >
                {t('pomodoro.widget.minutes_short', { mins })}
              </DurationButton>
            ))}
            <CustomDurationInput
              type="number"
              id="custom-duration"
              name="customDuration"
              aria-label={t('pomodoro.widget.custom_duration_aria')}
              min={1}
              max={120}
              placeholder={t('pomodoro.widget.custom_placeholder')}
              value={![15, 20, 25, 45].includes(currentDurationMinutes) ? currentDurationMinutes : ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 120) {
                  handleSetDuration(value);
                }
              }}
              disabled={isRunning}
              title={t('pomodoro.widget.custom_title')}
            />
          </DurationSelector>

          <ControlsRow>
            <ControlButton onClick={handleReset} disabled={isRunning}>
              🔄
            </ControlButton>
            {isRunning ? (
              <ControlButton $variant="danger" onClick={handlePause}>
                ⏸️
              </ControlButton>
            ) : (
              <ControlButton $variant="primary" onClick={handleStart}>
                ▶️
              </ControlButton>
            )}
            <ControlButton
              onClick={handleEarlyComplete}
              disabled={!isRunning}
            >
              ⏭️
            </ControlButton>
          </ControlsRow>

          <EarlyCompleteButton onClick={handleEarlyComplete} disabled={!isRunning}>
            {t('pomodoro.early_complete')}
          </EarlyCompleteButton>

          <StatsRow>
            <StatItem>
              <StatValue>{completedToday}</StatValue>
              <StatLabel>{t('pomodoro.widget.stat_today')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{totalCompleted}</StatValue>
              <StatLabel>{t('pomodoro.widget.stat_total')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{Math.round(completedToday * currentDurationMinutes)}</StatValue>
              <StatLabel>{t('pomodoro.widget.stat_minutes')}</StatLabel>
            </StatItem>
          </StatsRow>
        </WidgetContainer>
      )}
    </>
  );
}

export default PomodoroWidget;
