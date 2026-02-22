/**
 * StatusIndicator Component
 * 红绿灯状态指示器 - 显示系统健康状态
 */

import { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { usePlannerStore } from '../../../stores/planner-store';
import { monitorEngine } from '../../../services/monitor-engine';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Animations ====================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
`;

// ==================== Styled Components ====================

const Container = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const StatusLight = styled.button<{ $status: 'green' | 'yellow' | 'red'; $isActive: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background: ${({ $status }) => {
    switch ($status) {
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      case 'red': return '#ef4444';
    }
  }};
  
  color: ${({ $status }) => {
    switch ($status) {
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      case 'red': return '#ef4444';
    }
  }};
  
  ${({ $status, $isActive }) => $isActive && $status !== 'green' && css`
    animation: ${pulse} 2s ease-in-out infinite, ${glow} 2s ease-in-out infinite;
  `}
  
  &:hover {
    transform: scale(1.2);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }
`;

const StatusText = styled.span<{ $status: 'green' | 'yellow' | 'red' }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $status }) => {
    switch ($status) {
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      case 'red': return '#ef4444';
    }
  }};
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 280px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-10px)')};
  transition: all 0.2s ease;
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const DropdownTitle = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MonitorToggle = styled.button<{ $isActive: boolean }>`
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  background: ${({ $isActive }) => $isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)'};
  color: ${({ $isActive }) => $isActive ? '#22c55e' : '#6b7280'};
  
  &:hover {
    background: ${({ $isActive }) => $isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'};
  }
`;

const MetricsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MetricItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
`;

const MetricLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MetricValue = styled.span<{ $highlight?: boolean }>`
  color: ${({ theme, $highlight }) => $highlight ? theme.colors.accent.primary : theme.colors.text.primary};
  font-weight: ${({ $highlight }) => $highlight ? 600 : 400};
`;

const ReasonsList = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
`;

const ReasonItem = styled.li`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 4px 0;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  
  &::before {
    content: '•';
    color: ${({ theme }) => theme.colors.accent.red};
  }
`;

const ActionButton = styled.button`
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// ==================== Component ====================

interface StatusIndicatorProps {
  showText?: boolean;
  compact?: boolean;
}

export function StatusIndicator({ showText = false, compact = false }: StatusIndicatorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const healthMetrics = usePlannerStore((s) => s.healthMetrics);
  const monitoring = usePlannerStore((s) => s.monitoring);
  const currentIntervention = usePlannerStore((s) => s.currentIntervention);
  
  const status = healthMetrics.overallStatus;
  const isActive = monitoring.isActive;

  const getStatusLabel = () => {
    switch (status) {
      case 'green': return t('planner.status.green');
      case 'yellow': return t('planner.status.yellow');
      case 'red': return t('planner.status.red');
    }
  };

  const getStatusEmoji = () => {
    switch (status) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
    }
  };

  const handleToggleMonitor = () => {
    if (isActive) {
      monitorEngine.stop();
    } else {
      monitorEngine.start();
    }
  };

  const handleManualCheck = () => {
    monitorEngine.manualCheck();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return t('planner.status.minutes', { minutes });
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? t('planner.status.hours_minutes', { hours, minutes: mins }) : t('planner.status.hours', { hours });
  };

  if (compact) {
    return (
      <Container>
        <StatusLight 
          $status={status} 
          $isActive={isActive}
          onClick={() => setIsOpen(!isOpen)}
          title={t('planner.status.click_details', { status: getStatusLabel() })}
        />
        
        <Dropdown $isOpen={isOpen}>
          <DropdownHeader>
            <DropdownTitle>
              {getStatusEmoji()} {getStatusLabel()}
            </DropdownTitle>
            <MonitorToggle $isActive={isActive} onClick={handleToggleMonitor}>
              {isActive ? t('planner.status.monitoring') : t('planner.status.paused')}
            </MonitorToggle>
          </DropdownHeader>
          
          <MetricsList>
            <MetricItem>
              <MetricLabel>{t('planner.status.metric_since_last')}</MetricLabel>
              <MetricValue $highlight={healthMetrics.timeSinceLastCompletion > 120}>
                {formatTime(healthMetrics.timeSinceLastCompletion)}
              </MetricValue>
            </MetricItem>
            <MetricItem>
              <MetricLabel>{t('planner.status.metric_today_rate')}</MetricLabel>
              <MetricValue $highlight={healthMetrics.todayCompletionRate < 60}>
                {healthMetrics.todayCompletionRate.toFixed(0)}%
              </MetricValue>
            </MetricItem>
            <MetricItem>
              <MetricLabel>{t('planner.status.metric_overdue_tasks')}</MetricLabel>
              <MetricValue $highlight={healthMetrics.overdueTasksCount > 0}>
                {healthMetrics.overdueTasksCount}
              </MetricValue>
            </MetricItem>
            <MetricItem>
              <MetricLabel>{t('planner.status.metric_risk_quests')}</MetricLabel>
              <MetricValue $highlight={healthMetrics.atRiskQuests.length > 0}>
                {healthMetrics.atRiskQuests.length}
              </MetricValue>
            </MetricItem>
          </MetricsList>
          
          {healthMetrics.statusReasons.length > 0 && (
            <ReasonsList>
              {healthMetrics.statusReasons.map((reason, i) => (
                <ReasonItem key={i}>{reason}</ReasonItem>
              ))}
            </ReasonsList>
          )}
          
          {currentIntervention && (
            <MetricItem style={{ marginTop: 12, padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
              <MetricLabel>{t('planner.status.current_intervention')}</MetricLabel>
              <MetricValue $highlight>{currentIntervention.triggerType}</MetricValue>
            </MetricItem>
          )}
          
          <ActionButton onClick={handleManualCheck}>
            {t('planner.status.manual_check')}
          </ActionButton>
        </Dropdown>
      </Container>
    );
  }

  return (
    <Container>
      <StatusLight 
        $status={status} 
        $isActive={isActive}
        onClick={() => setIsOpen(!isOpen)}
        title={getStatusLabel()}
      />
      {showText && <StatusText $status={status}>{getStatusLabel()}</StatusText>}
      
      <Dropdown $isOpen={isOpen}>
        {/* 同上内容 */}
        <DropdownHeader>
          <DropdownTitle>
            {getStatusEmoji()} {t('planner.status.system_status')}
          </DropdownTitle>
          <MonitorToggle $isActive={isActive} onClick={handleToggleMonitor}>
            {isActive ? t('planner.status.monitoring_with_icon') : t('planner.status.paused_with_icon')}
          </MonitorToggle>
        </DropdownHeader>
        
        <MetricsList>
          <MetricItem>
            <MetricLabel>{t('planner.status.metric_since_last')}</MetricLabel>
            <MetricValue $highlight={healthMetrics.timeSinceLastCompletion > 120}>
              {formatTime(healthMetrics.timeSinceLastCompletion)}
            </MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>{t('planner.status.metric_today_completed')}</MetricLabel>
            <MetricValue>
              {healthMetrics.todayCompletedCount} / {healthMetrics.todayTotalCount}
            </MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>{t('planner.status.metric_completion_rate')}</MetricLabel>
            <MetricValue $highlight={healthMetrics.todayCompletionRate < 60}>
              {healthMetrics.todayCompletionRate.toFixed(0)}%
            </MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>{t('planner.status.metric_overdue_tasks')}</MetricLabel>
            <MetricValue $highlight={healthMetrics.overdueTasksCount > 0}>
              {healthMetrics.overdueTasksCount}
            </MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>{t('planner.status.metric_risk_quests')}</MetricLabel>
            <MetricValue $highlight={healthMetrics.atRiskQuests.length > 0}>
              {healthMetrics.atRiskQuests.length}
            </MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>{t('planner.status.metric_weekly_trend')}</MetricLabel>
            <MetricValue>
              {healthMetrics.weeklyTrend === 'improving' ? t('planner.status.trend_up') :
               healthMetrics.weeklyTrend === 'declining' ? t('planner.status.trend_down') : t('planner.status.trend_stable')}
            </MetricValue>
          </MetricItem>
        </MetricsList>
        
        {healthMetrics.statusReasons.length > 0 && (
          <ReasonsList>
            {healthMetrics.statusReasons.map((reason, i) => (
              <ReasonItem key={i}>{reason}</ReasonItem>
            ))}
          </ReasonsList>
        )}
        
        <ActionButton onClick={handleManualCheck}>
          {t('planner.status.manual_check')}
        </ActionButton>
      </Dropdown>
    </Container>
  );
}

export default StatusIndicator;
