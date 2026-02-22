/**
 * PomodoroSettingsModal Component
 * Settings for pomodoro timer configuration
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal, ImeSafeInputBase } from '../../../components/ui';
import { usePomodoroStore } from '../../../stores/pomodoro-store';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface PomodoroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const GroupLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Description = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 0;
`;

const DurationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const DurationButton = styled.button<{ $active: boolean }>`
  padding: 12px;
  border: 2px solid ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 10px;
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 600;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    background: rgba(139, 92, 246, 0.05);
  }
`;

const DurationLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const CustomDurationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Input = styled(ImeSafeInputBase)`
  width: 80px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 1rem;
  text-align: center;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`;

const StatsCard = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
`;

const StatsTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.accent.purple};
          color: white;

          &:hover {
            background: ${theme.colors.accent.purple}e6;
          }
        `;
      case 'danger':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: ${theme.colors.status.danger.text};

          &:hover {
            background: rgba(239, 68, 68, 0.2);
          }
        `;
      default:
        return `
          background: ${theme.colors.bg.tertiary};
          color: ${theme.colors.text.secondary};

          &:hover {
            background: ${theme.colors.bg.secondary};
          }
        `;
    }
  }}
`;

const presetDurations = [15, 25, 45, 60] as const;
const presetDurationLabels = {
  15: 'pomodoro.settings.preset_15',
  25: 'pomodoro.settings.preset_25',
  45: 'pomodoro.settings.preset_45',
  60: 'pomodoro.settings.preset_60',
} as const;

export function PomodoroSettingsModal({ isOpen, onClose }: PomodoroSettingsModalProps) {
  const { t } = useTranslation();
  const totalTime = usePomodoroStore((s) => s.totalTime);
  const completedToday = usePomodoroStore((s) => s.completedToday);
  const totalCompleted = usePomodoroStore((s) => s.totalCompleted);
  const isRunning = usePomodoroStore((s) => s.isRunning);
  const setDuration = usePomodoroStore((s) => s.setDuration);
  const reset = usePomodoroStore((s) => s.reset);

  const [selectedMinutes, setSelectedMinutes] = useState(Math.round(totalTime / 60));
  const [customMinutes, setCustomMinutes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedMinutes(Math.round(totalTime / 60));
      setCustomMinutes('');
    }
  }, [isOpen, totalTime]);

  const handleSelectDuration = (minutes: number) => {
    setSelectedMinutes(minutes);
    setCustomMinutes('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomMinutes(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 120) {
      setSelectedMinutes(numValue);
    }
  };

  const handleSave = () => {
    if (!isRunning) {
      setDuration(selectedMinutes);
    }
    onClose();
  };

  const handleResetStats = () => {
    if (window.confirm(t('pomodoro.settings.reset_confirm'))) {
      reset();
    }
  };

  // Calculate total focused time
  const currentDurationMinutes = Math.round(totalTime / 60);
  const todayMinutes = completedToday * currentDurationMinutes;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('pomodoro.settings.title')} size="sm">
      <Form>
        <FormGroup>
          <GroupLabel>{t('pomodoro.settings.focus_duration_label')}</GroupLabel>
          <Description>{t('pomodoro.settings.focus_duration_desc')}</Description>
          <DurationGrid>
            {presetDurations.map((minutes) => (
              <DurationButton
                key={minutes}
                $active={selectedMinutes === minutes && !customMinutes}
                onClick={() => handleSelectDuration(minutes)}
                disabled={isRunning}
              >
                {t('pomodoro.widget.minutes_short', { mins: minutes })}
                <DurationLabel>{t(presetDurationLabels[minutes])}</DurationLabel>
              </DurationButton>
            ))}
          </DurationGrid>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="pomodoro-custom-duration">{t('pomodoro.settings.custom_duration_label')}</Label>
          <CustomDurationRow>
            <Input
              id="pomodoro-custom-duration"
              name="customDuration"
              type="number"
              value={customMinutes}
              onChange={handleCustomChange}
              placeholder={String(selectedMinutes)}
              min={1}
              max={120}
              disabled={isRunning}
            />
            <span style={{ color: '#6b7280' }}>{t('pomodoro.settings.minutes_range')}</span>
          </CustomDurationRow>
        </FormGroup>

        <StatsCard>
          <StatsTitle>{t('pomodoro.settings.stats_title')}</StatsTitle>
          <StatsGrid>
            <StatItem>
              <StatValue>{completedToday}</StatValue>
              <StatLabel>{t('pomodoro.settings.stat_today_pomodoros')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{todayMinutes}</StatValue>
              <StatLabel>{t('pomodoro.settings.stat_today_minutes')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{totalCompleted}</StatValue>
              <StatLabel>{t('pomodoro.settings.stat_total_pomodoros')}</StatLabel>
            </StatItem>
          </StatsGrid>
        </StatsCard>

        <ButtonRow>
          <Button $variant="danger" onClick={handleResetStats} disabled={isRunning}>
            {t('pomodoro.settings.reset_button')}
          </Button>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button $variant="primary" onClick={handleSave} disabled={isRunning}>
            {t('common.save')}
          </Button>
        </ButtonRow>
      </Form>
    </Modal>
  );
}

export default PomodoroSettingsModal;
