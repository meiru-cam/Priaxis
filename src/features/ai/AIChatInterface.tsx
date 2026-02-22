/**
 * AI Chat Interface
 * Main component for AI interaction (Friend & Coach modes)
 */

import { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useGameStore } from '../../stores/game-store';
import { useChatStore } from '../../stores/chat-store';
import type { ChatSession, Persona } from '../../stores/chat-store';
import type { ChatMessage, Role } from '../../types/ai';
import type { TranslationKey } from '../../lib/i18n/types';
import { friendAI } from '../../services/friend-ai';
import { coachAI } from '../../services/coach-ai';
import { Button, Input } from '../../components/ui';
import { useTranslation } from '../../lib/i18n/useTranslation';

// ==================== Styled Components ====================

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 400px;
  max-width: calc(100vw - 48px);
  height: 600px;
  max-height: calc(100vh - 100px);
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  z-index: 1000;
  overflow: hidden;
  animation: ${css`${keyframes`from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`}`} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  z-index: 10;
`;

const PersonaSelector = styled.div`
  display: flex;
  gap: 8px;
  padding: 4px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
`;

const PersonaButton = styled.button<{ $active: boolean; $persona: Persona }>`
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ $active, $persona, theme }) => {
    if ($active) {
      return css`
        background: ${$persona === 'friend' ? theme.colors.accent.primary : theme.colors.accent.purple};
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
    }
    return css`
      background: transparent;
      color: ${theme.colors.text.secondary};
      &:hover {
        background: ${theme.colors.bg.primary};
        color: ${theme.colors.text.primary};
      }
    `;
  }}
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const MessageBubble = styled.div<{ $role: Role }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  border-bottom-${({ $role }) => $role === 'user' ? 'right' : 'left'}-radius: 4px;
  align-self: ${({ $role }) => $role === 'user' ? 'flex-end' : 'flex-start'};
  
  background: ${({ theme, $role }) =>
    $role === 'user' ? theme.colors.button.primary.bg : theme.colors.bg.tertiary};
  
  color: ${({ theme, $role }) =>
    $role === 'user' ? theme.colors.button.primary.text : theme.colors.text.primary};
    
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  line-height: 1.5;
  font-size: 0.95rem;
  white-space: pre-wrap;
  word-break: break-word;
  ${({ $role, theme }) => $role === 'model' && `border: 1px solid ${theme.colors.border.primary};`}

  p { margin: 0; }
  
  pre {
    background: ${({ theme }) => theme.colors.bg.primary};
    padding: 8px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    background: ${({ theme, $role }) =>
    $role === 'user' ? 'rgba(255,255,255,0.2)' : theme.colors.bg.primary}; 
    padding: 2px 4px; 
    border-radius: 4px;
  }
`;

const InputArea = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
  display: flex;
  gap: 8px;
`;

const SendButton = styled(Button)`
  padding: 0 20px;
`;

const typingKeyframes = keyframes`
  0% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(-4px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.6; }
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  align-self: flex-start;
  width: fit-content;

  span {
    width: 6px;
    height: 6px;
    background: ${({ theme }) => theme.colors.text.tertiary};
    border-radius: 50%;
    animation: ${typingKeyframes} 1s infinite;
    
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

// Sidebar for history
const HistorySidebar = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 250px;
  background: ${({ theme }) => theme.colors.bg.primary};
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  transition: transform 0.3s ease;
  z-index: 20;
  display: flex;
  flex-direction: column;
`;

const HistoryHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
`;

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HistoryItem = styled.div<{ $active: boolean }>`
  padding: 12px;
  text-align: left;
  background: ${({ $active, theme }) => $active ? theme.colors.bg.tertiary : 'transparent'};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.border.secondary : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const HistoryDate = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 4px;
`;

const HistoryPreview = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EmptyHistory = styled.div`
  padding: 32px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.9rem;
`;

// ==================== Component ====================

interface AIChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_MESSAGES: ChatMessage[] = [];

export function AIChatInterface({ isOpen, onClose }: AIChatInterfaceProps) {
  const { t, language } = useTranslation();
  const tRef = useRef(t);

  // Store state
  const {
    activePersona,
    sessions,
    activeSessionId,
    isLoading: loading,
    showHistory,
    setShowHistory,
    setActivePersona,
    addMessage: addStoreMessage,
    getActiveSession,
    switchSession,
    archiveAndCreateNew,
    deleteSession,
    setLoading
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Get current messages from active session
  const activeSession = getActiveSession();
  const messages = activeSession?.messages ?? EMPTY_MESSAGES;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Update AI service language
  useEffect(() => {
    friendAI.setLanguage(language as 'zh' | 'en');
    coachAI.setLanguage(language as 'zh' | 'en');
  }, [language]);

  // Initial greeting logic (handled by store/component)
  useEffect(() => {
    if (!isOpen) return;

    // Check if we need to greet
    const currentState = useChatStore.getState();
    if (currentState.shouldShowGreeting()) {
      const generateGreeting = async () => {
        currentState.markGreetingShown();
        currentState.setLoading(true);

        try {
          // Build world state context
          const gameStoreState = useGameStore.getState();
          const hour = new Date().getHours();
          const realContext = {
            energy: gameStoreState.resources.energy.current,
            tasksToday: gameStoreState.customTasks.filter(t => !t.completed).length,
            hour,
          };

          const prompt = friendAI.generateContextualGreeting(realContext);
          const result = await friendAI.chat(prompt, []);
          currentState.addMessage({ role: 'model', content: result.message });
        } catch (error: unknown) {
          console.error('[Greeting] Failed:', error);
          currentState.addMessage({ role: 'model', content: tRef.current('ai.greeting.fallback') });
        } finally {
          currentState.setLoading(false);
        }
      };
      void generateGreeting();
    }
  }, [isOpen]);

  const handlePersonaChange = (newPersona: Persona) => {
    setActivePersona(newPersona);
    setShowHistory(false);
  };

  const handleClearCurrent = () => {
    if (confirm(t('ai.history.clear_confirm' as TranslationKey) || 'Are you sure you want to clear this chat?')) {
      archiveAndCreateNew(activePersona);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm(t('ai.history.delete_single_confirm' as TranslationKey) || 'Delete this chat history?')) {
      deleteSession(sessionId);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userContent = input;
    setInput('');
    setLoading(true);

    // Add user message to store
    addStoreMessage({ role: 'user', content: userContent });

    try {
      // Get history for context
      const currentMessages = useChatStore.getState().getActiveSession()?.messages || [];
      const history = currentMessages
        .filter(m => m.role === 'user' || m.role === 'model')
        .map((m: ChatMessage) => ({
          role: m.role as 'user' | 'model',
          content: m.content
        }));

      // Call appropriate AI service
      let response;
      if (activePersona === 'friend') {
        response = await friendAI.chat(userContent, history);
      } else {
        response = await coachAI.chat(userContent, history);
      }

      // Add AI response to store
      addStoreMessage({ role: 'model', content: response.message });

    } catch (error) {
      console.error('Chat error:', error);
      addStoreMessage({ role: 'model', content: t('ai.error.generic') });
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <ChatContainer onClick={e => e.stopPropagation()}>
      <Header>
        <PersonaSelector>
          <PersonaButton
            $active={activePersona === 'friend'}
            $persona="friend"
            onClick={() => handlePersonaChange('friend')}
          >
            🐱 {t('ai.program.friend')}
          </PersonaButton>
          <PersonaButton
            $active={activePersona === 'coach'}
            $persona="coach"
            onClick={() => handlePersonaChange('coach')}
          >
            🧠 {t('ai.program.coach')}
          </PersonaButton>
        </PersonaSelector>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={handleClearCurrent} title="Clear Chat">
            🗑️
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? '✕' : '📜'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </Header>

      <MessagesArea>
        {messages.map((msg, index) => (
          <MessageBubble key={msg.id || index} $role={msg.role}>
            {typeof msg.content === 'string' ? msg.content : ''}
          </MessageBubble>
        ))}
        {loading && (
          <TypingIndicator>
            <span />
            <span />
            <span />
          </TypingIndicator>
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      <InputArea>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={activePersona === 'friend' ? t('ai.input.placeholder.friend') : t('ai.input.placeholder.coach')}
        />
        <SendButton onClick={handleSendMessage} disabled={!input.trim() || loading}>
          {t('ai.action.send')}
        </SendButton>
      </InputArea>

      {/* History Sidebar */}
      <HistorySidebar $isOpen={showHistory}>
        <HistoryHeader>
          <span>{t('ai.history.title')}</span>
        </HistoryHeader>
        <HistoryList>
          {sessions.filter((s: ChatSession) => s.persona === activePersona).length === 0 ? (
            <EmptyHistory>{t('ai.history.empty')}</EmptyHistory>
          ) : (
            sessions
              .filter((s: ChatSession) => s.persona === activePersona)
              .sort((a: ChatSession, b: ChatSession) => b.lastUpdatedAt - a.lastUpdatedAt)
              .map((session: ChatSession) => (
                <HistoryItem
                  key={session.id}
                  $active={session.id === activeSessionId[activePersona]}
                  onClick={() => switchSession(session.id)}
                >
                  <div>
                    <HistoryDate>{new Date(session.lastUpdatedAt).toLocaleDateString()}</HistoryDate>
                    <HistoryPreview>{session.preview || t('ai.history.empty_preview')}</HistoryPreview>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{ padding: '4px', height: 'auto', color: '#ff4d4f' }}
                    onClick={(e) => handleDeleteSession(e, session.id)}
                  >
                    ✕
                  </Button>
                </HistoryItem>
              ))
          )}
        </HistoryList>
      </HistorySidebar>
    </ChatContainer>
  );
}
