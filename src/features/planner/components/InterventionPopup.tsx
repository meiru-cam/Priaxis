/**
 * InterventionPopup Component
 * 简单的干预弹窗 - 用于轻量级提醒
 */

import { useCallback, useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { usePlannerStore } from '../../../stores/planner-store';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Animations ====================

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

// ==================== Styled Components ====================

const Container = styled.div<{ $isVisible: boolean; $status: 'green' | 'yellow' | 'red' }>`
  position: fixed;
  top: 80px;
  right: 24px;
  width: 320px;
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  overflow: hidden;
  z-index: ${({ theme }) => theme.zIndex.notification};
  
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  visibility: ${({ $isVisible }) => ($isVisible ? 'visible' : 'hidden')};
  transform: ${({ $isVisible }) => ($isVisible ? 'translateX(0)' : 'translateX(100%)')};
  transition: all 0.3s ease;
  
  ${({ $isVisible }) => $isVisible && css`
    animation: ${slideIn} 0.3s ease, ${pulse} 2s ease-in-out infinite 0.3s;
  `}
  
  border-left: 4px solid ${({ $status }) => {
    switch ($status) {
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      case 'red': return '#ef4444';
    }
  }};
`;

const Header = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const Content = styled.div`
  padding: 16px;
`;

const Message = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ $primary, theme }) => $primary ? css`
    background: ${theme.colors.accent.purple};
    border: none;
    color: white;
    
    &:hover {
      background: ${theme.colors.accent.secondary};
    }
  ` : css`
    background: transparent;
    border: 1px solid ${theme.colors.border.primary};
    color: ${theme.colors.text.secondary};
    
    &:hover {
      background: ${theme.colors.bg.tertiary};
    }
  `}
`;

// ==================== Component ====================

export function InterventionPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const { t } = useTranslation();
  
  const healthMetrics = usePlannerStore((s) => s.healthMetrics);
  const currentIntervention = usePlannerStore((s) => s.currentIntervention);
  const conversation = usePlannerStore((s) => s.conversation);
  const openConversation = usePlannerStore((s) => s.openConversation);
  const acknowledgeIntervention = usePlannerStore((s) => s.acknowledgeIntervention);
  const dismissIntervention = usePlannerStore((s) => s.dismissIntervention);
  
  const { overallStatus, statusReasons } = healthMetrics;

  const sendBrowserNotification = useCallback(async () => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      new Notification(t('planner.intervention.notification_title'), {
        body: statusReasons[0] || t('planner.intervention.notification_fallback'),
        icon: '/favicon.ico',
        tag: 'intervention',
      });
    }
  }, [statusReasons, t]);
  
  // Show popup when status changes to yellow/red and conversation is not open
  useEffect(() => {
    if (
      currentIntervention && 
      currentIntervention.status === 'pending' &&
      !conversation.isOpen &&
      !hasShown
    ) {
      setIsVisible(true);
      setHasShown(true);
      
      // Send browser notification for red status
      if (overallStatus === 'red') {
        void sendBrowserNotification();
      }
    }
  }, [currentIntervention, conversation.isOpen, hasShown, overallStatus, sendBrowserNotification]);
  
  // Reset hasShown when intervention is resolved
  useEffect(() => {
    if (!currentIntervention) {
      setHasShown(false);
      setIsVisible(false);
    }
  }, [currentIntervention]);
  
  const handleTalk = () => {
    setIsVisible(false);
    acknowledgeIntervention();
    
    // Open conversation based on intervention level
    const level = currentIntervention?.currentLevel || 'friend';
    openConversation(level as 'friend' | 'coach', {
      trigger: currentIntervention ? {
        type: currentIntervention.triggerType,
        metrics: healthMetrics,
      } : undefined,
      relatedTaskIds: [],
      relatedQuestIds: [],
      userProfile: {
        recentPatterns: [],
        preferredStyle: 'gentle',
        knownBlockers: [],
      },
    });
  };
  
  const handleDismiss = () => {
    setIsVisible(false);
    dismissIntervention();
  };
  
  const getTitle = () => {
    switch (overallStatus) {
      case 'red': return t('planner.intervention.title_red');
      case 'yellow': return t('planner.intervention.title_yellow');
      default: return t('planner.intervention.title_default');
    }
  };
  
  const getMessage = () => {
    if (statusReasons.length > 0) {
      return statusReasons[0];
    }
    return t('planner.intervention.message_default');
  };
  
  if (!currentIntervention) return null;
  
  return (
    <Container $isVisible={isVisible} $status={overallStatus}>
      <Header>
        <Title>
          <span>{getTitle()}</span>
        </Title>
        <CloseButton onClick={handleDismiss}>×</CloseButton>
      </Header>
      <Content>
        <Message>{getMessage()}</Message>
        <Actions>
          <ActionButton onClick={handleDismiss}>
            {t('planner.intervention.dismiss')}
          </ActionButton>
          <ActionButton $primary onClick={handleTalk}>
            {t('planner.intervention.talk')}
          </ActionButton>
        </Actions>
      </Content>
    </Container>
  );
}

export default InterventionPopup;
