/**
 * ChatInterface Component
 * 智能助手对话界面 - Friend / Coach 双层对话
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { usePlannerStore } from '../../../stores/planner-store';
import { useGameStore } from '../../../stores/game-store';
import { friendAI } from '../../../services/friend-ai';
import { coachAI } from '../../../services/coach-ai';
import type { AIAction } from '../../../types/planner';
import { ImeSafeInputBase } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Animations ====================

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const typing = keyframes`
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
`;

// ==================== Styled Components ====================

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: ${({ theme }) => theme.zIndex.modal};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
`;

const Container = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 400px;
  max-width: calc(100vw - 48px);
  max-height: 600px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: ${({ theme }) => theme.zIndex.modal + 1};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)')};
  transition: all 0.3s ease;
`;

const Header = styled.div<{ $mode: 'friend' | 'coach' }>`
  padding: 16px 20px;
  background: ${({ $mode }) =>
    $mode === 'coach'
      ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
  };
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div<{ $mode: 'friend' | 'coach' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`;

const HeaderText = styled.div``;

const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 2px 0 0;
  font-size: 0.75rem;
  opacity: 0.8;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 3px;
  }
`;

const MessageBubble = styled.div<{ $role: 'user' | 'friend' | 'coach' | 'system' }>`
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px;
  animation: ${slideUp} 0.3s ease;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 0.9rem;
  
  ${({ $role, theme }) => {
    switch ($role) {
      case 'user':
        return css`
          align-self: flex-end;
          background: ${theme.colors.accent.purple};
          color: white;
          border-bottom-right-radius: 4px;
        `;
      case 'friend':
        return css`
          align-self: flex-start;
          background: rgba(34, 197, 94, 0.15);
          color: ${theme.colors.text.primary};
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-bottom-left-radius: 4px;
        `;
      case 'coach':
        return css`
          align-self: flex-start;
          background: rgba(139, 92, 246, 0.15);
          color: ${theme.colors.text.primary};
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-bottom-left-radius: 4px;
        `;
      case 'system':
        return css`
          align-self: center;
          background: ${theme.colors.bg.tertiary};
          color: ${theme.colors.text.secondary};
          font-size: 0.8rem;
          padding: 8px 12px;
        `;
    }
  }}
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 16px;
  align-self: flex-start;
  animation: ${fadeIn} 0.2s ease;
  
  span {
    width: 8px;
    height: 8px;
    background: ${({ theme }) => theme.colors.text.tertiary};
    border-radius: 50%;
    animation: ${typing} 1.4s ease-in-out infinite;
    
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  animation: ${fadeIn} 0.3s ease 0.2s both;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ $variant, theme }) => $variant === 'primary' ? css`
    background: ${theme.colors.accent.purple};
    border: none;
    color: white;
    
    &:hover {
      background: ${theme.colors.accent.secondary};
      transform: translateY(-1px);
    }
  ` : css`
    background: transparent;
    border: 1px solid ${theme.colors.border.primary};
    color: ${theme.colors.text.secondary};
    
    &:hover {
      background: ${theme.colors.bg.tertiary};
      border-color: ${theme.colors.accent.purple};
      color: ${theme.colors.accent.purple};
    }
  `}
`;

const InputContainer = styled.div`
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
  display: flex;
  gap: 12px;
`;

const Input = styled(ImeSafeInputBase)`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent.purple};
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accent.secondary};
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EscalateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.accent.purple};
  font-size: 0.8rem;
  cursor: pointer;
  margin: 8px 16px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(139, 92, 246, 0.2);
  }
`;

// ==================== Component ====================

export function ChatInterface() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store state
  const conversation = usePlannerStore((s) => s.conversation);
  const currentIntervention = usePlannerStore((s) => s.currentIntervention);
  const healthMetrics = usePlannerStore((s) => s.healthMetrics);
  const addMessage = usePlannerStore((s) => s.addMessage);
  const closeConversation = usePlannerStore((s) => s.closeConversation);
  const escalateIntervention = usePlannerStore((s) => s.escalateIntervention);
  const resolveIntervention = usePlannerStore((s) => s.resolveIntervention);
  const dismissIntervention = usePlannerStore((s) => s.dismissIntervention);

  // Game state for context
  const customTasks = useGameStore((s) => s.customTasks);
  const mainQuests = useGameStore((s) => s.mainQuests);

  const { isOpen, mode, messages, context } = conversation;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = useCallback(async () => {
    setIsTyping(true);

    try {
      if (currentIntervention) {
        // 有干预触发时的对话初始化
        if (mode === 'friend') {
          const response = await friendAI.getInitialResponse(
            currentIntervention.triggerType,
            healthMetrics
          );

          addMessage({
            role: 'friend',
            content: response.message,
            suggestedActions: response.suggestedActions,
          });

          if (response.suggestedActions) {
            setPendingActions(response.suggestedActions);
          }
        } else {
          // Coach mode
          const response = await coachAI.getInitialResponse(
            currentIntervention.triggerType,
            healthMetrics,
            {
              tasks: customTasks || [],
              quests: mainQuests || [],
              atRiskQuests: healthMetrics.atRiskQuests,
            }
          );

          addMessage({
            role: 'coach',
            content: response.message,
            suggestedActions: response.suggestedActions,
          });

          if (response.suggestedActions) {
            setPendingActions(response.suggestedActions);
          }
        }
      } else {
        // 手动打开的欢迎消息
        const welcomeActions = [
          { id: 'help_task', type: 'task_breakdown' as const, label: t('planner.chat.action_help_task'), description: t('planner.chat.action_help_task_desc'), requiresConfirmation: false },
          { id: 'help_priority', type: 'priority_change' as const, label: t('planner.chat.action_help_priority'), description: t('planner.chat.action_help_priority_desc'), requiresConfirmation: false },
          { id: 'just_chat', type: 'reflect' as const, label: t('planner.chat.action_just_chat'), description: t('planner.chat.action_just_chat_desc'), requiresConfirmation: false },
        ];

        addMessage({
          role: 'friend',
          content: `${t('planner.chat.welcome_intro')}\n\n${t('planner.chat.welcome_bullets')}\n\n${coachAI.checkAvailability() ? t('planner.chat.coach_available', { provider: coachAI.getProvider(), model: coachAI.getModel() }) : t('planner.chat.coach_offline')}`,
          suggestedActions: welcomeActions,
        });

        setPendingActions(welcomeActions);
      }
    } catch (error) {
      console.error('[ChatInterface] Init failed:', error);
      addMessage({
        role: mode,
        content: t('planner.chat.error_init'),
      });
    } finally {
      setIsTyping(false);
    }
  }, [
    addMessage,
    currentIntervention,
    customTasks,
    healthMetrics,
    mainQuests,
    mode,
    t,
  ]);

  // Initialize conversation with AI response
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      void initializeConversation();
    }
  }, [initializeConversation, isOpen, messages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setPendingActions([]);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    setIsTyping(true);

    try {
      if (mode === 'friend') {
        const response = await friendAI.respondToUser(
          userMessage,
          currentIntervention?.triggerType || 'idle_too_long'
        );

        addMessage({
          role: 'friend',
          content: response.message,
          suggestedActions: response.suggestedActions,
        });

        if (response.suggestedActions) {
          setPendingActions(response.suggestedActions);
        }

        // Check if should escalate to Coach
        if (response.shouldEscalate) {
          // Don't auto-escalate, show button instead
        }
      } else {
        // Coach mode
        const response = await coachAI.respondToUser(
          userMessage,
          messages,
          context || {
            relatedTaskIds: [],
            relatedQuestIds: [],
            userProfile: { recentPatterns: [], preferredStyle: 'gentle', knownBlockers: [] },
          },
          {
            tasks: customTasks || [],
            quests: mainQuests || [],
            atRiskQuests: healthMetrics.atRiskQuests,
          }
        );

        addMessage({
          role: 'coach',
          content: response.message,
          suggestedActions: response.suggestedActions,
        });

        if (response.suggestedActions) {
          setPendingActions(response.suggestedActions);
        }

        if (response.shouldClose) {
          // Conversation naturally ended
          setTimeout(() => {
            resolveIntervention({
              action: 'conversation_completed',
              outcome: 'success',
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('[ChatInterface] Send failed:', error);
      addMessage({
        role: mode,
        content: t('planner.chat.error_send'),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = async (action: AIAction) => {
    setPendingActions([]);

    // Add user's selection as a message
    addMessage({
      role: 'user',
      content: action.label,
    });

    setIsTyping(true);

    try {
      if (mode === 'friend') {
        const response = await friendAI.respondToUser(
          action.label,
          currentIntervention?.triggerType || 'idle_too_long',
          action.id
        );

        addMessage({
          role: 'friend',
          content: response.message,
          suggestedActions: response.suggestedActions,
        });

        if (response.suggestedActions) {
          setPendingActions(response.suggestedActions);
        }

        // Handle escalation
        const escalationActions = ['escalate', 'coach_help', 'more_help', 'help_task', 'help_priority', 'confused', 'prioritize'];
        if (response.shouldEscalate && escalationActions.includes(action.id)) {
          escalateIntervention();
          // Switch to Coach mode and get Coach response
          addMessage({
            role: 'system',
            content: t('planner.chat.connecting_coach'),
          });
          setTimeout(async () => {
            setIsTyping(true);
            try {
              const coachResponse = await coachAI.respondToUser(
                t('planner.chat.user_needs_help').replace('{action}', action.label),
                [],
                {
                  relatedTaskIds: [],
                  relatedQuestIds: [],
                  userProfile: { recentPatterns: [], preferredStyle: 'gentle', knownBlockers: [] },
                },
                {
                  tasks: customTasks || [],
                  quests: mainQuests || [],
                  atRiskQuests: healthMetrics.atRiskQuests,
                }
              );
              addMessage({
                role: 'coach',
                content: coachResponse.message,
                suggestedActions: coachResponse.suggestedActions,
              });
              if (coachResponse.suggestedActions) {
                setPendingActions(coachResponse.suggestedActions);
              }
            } catch (error) {
              console.error('[ChatInterface] Coach escalation failed:', error);
              addMessage({
                role: 'coach',
                content: t('planner.chat.error_coach_connect') + '\n\n' +
                  (action.id === 'help_task'
                    ? t('planner.chat.local_help_task')
                    : t('planner.chat.local_help_priority')),
              });
            } finally {
              setIsTyping(false);
            }
          }, 500);
        }
      } else {
        // Coach handles action
        const response = await coachAI.respondToUser(
          t('planner.chat.selected_action', { action: action.label }),
          messages,
          context || {
            relatedTaskIds: [],
            relatedQuestIds: [],
            userProfile: { recentPatterns: [], preferredStyle: 'gentle', knownBlockers: [] },
          }
        );

        addMessage({
          role: 'coach',
          content: response.message,
          suggestedActions: response.suggestedActions,
        });

        if (response.suggestedActions) {
          setPendingActions(response.suggestedActions);
        }
      }

      // Handle special action types
      if (action.type === 'encourage' && ['done', 'ok', 'fine', 'good'].includes(action.id)) {
        setTimeout(() => {
          resolveIntervention({
            action: action.id,
            outcome: 'success',
          });
        }, 1500);
      }
    } catch (error) {
      console.error('[ChatInterface] Action failed:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEscalate = () => {
    escalateIntervention();
    addMessage({
      role: 'system',
      content: t('planner.chat.connecting_coach'),
    });
    setTimeout(initializeConversation, 500);
  };

  const handleClose = () => {
    if (currentIntervention) {
      dismissIntervention();
    } else {
      closeConversation();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const nativeEvent = e.nativeEvent as KeyboardEvent;
    const isComposing = nativeEvent.isComposing || nativeEvent.keyCode === 229;
    if (isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <Overlay $isOpen={isOpen} onClick={handleClose} />
      <Container $isOpen={isOpen}>
        <Header $mode={mode}>
          <HeaderInfo>
            <Avatar $mode={mode}>
              {mode === 'coach' ? '🧑‍🏫' : '🐱'}
            </Avatar>
            <HeaderText>
              <Title>{mode === 'coach' ? t('ai.program.coach') : t('ai.program.friend')}</Title>
              <Subtitle>
                {mode === 'coach' ? t('planner.chat.subtitle_coach') : t('planner.chat.subtitle_friend')}
              </Subtitle>
            </HeaderText>
          </HeaderInfo>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </Header>

        <MessagesContainer>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} $role={msg.role}>
              {msg.content}
            </MessageBubble>
          ))}

          {isTyping && (
            <TypingIndicator>
              <span />
              <span />
              <span />
            </TypingIndicator>
          )}

          <div ref={messagesEndRef} />
        </MessagesContainer>

        {pendingActions.length > 0 && (
          <ActionsContainer>
            {pendingActions.map((action) => (
              <ActionButton
                key={action.id}
                $variant={action.requiresConfirmation ? 'secondary' : 'primary'}
                onClick={() => handleActionClick(action)}
              >
                {action.label}
              </ActionButton>
            ))}
          </ActionsContainer>
        )}

        {mode === 'friend' && messages.length > 2 && (
          <EscalateButton onClick={handleEscalate}>
            {t('planner.chat.escalate_button')}
          </EscalateButton>
        )}

        <InputContainer>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('planner.chat.input_placeholder')}
            disabled={isTyping}
          />
          <SendButton onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
            ➤
          </SendButton>
        </InputContainer>
      </Container>
    </>
  );
}

export default ChatInterface;
