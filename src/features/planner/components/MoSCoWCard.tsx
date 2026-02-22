/**
 * MoSCoW Suggestion Card Component
 * 显示和确认 AI 建议的 MoSCoW 优先级
 */

import { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { MoSCoWSuggestion, MoSCoWPriority } from '../../../types/planner';
import type { CustomTask, MainQuest } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Animations ====================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ==================== Types ====================

interface MoSCoWCardProps {
  task: CustomTask | MainQuest;
  suggestion: MoSCoWSuggestion;
  onConfirm: (taskId: string, priority: MoSCoWPriority) => void;
  onReject: (taskId: string) => void;
  onModify: (taskId: string, priority: MoSCoWPriority) => void;
}

// ==================== Styled Components ====================

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  animation: ${css`${fadeIn}`} 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const TaskName = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
`;

const Confidence = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ theme, $level }) =>
    $level === 'high' ? theme.colors.badge.success.bg :
      $level === 'medium' ? theme.colors.badge.warning.bg :
        theme.colors.badge.info.bg};
  color: ${({ theme, $level }) =>
    $level === 'high' ? theme.colors.badge.success.text :
      $level === 'medium' ? theme.colors.badge.warning.text :
        theme.colors.badge.info.text};
`;

const SuggestionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const PriorityBadge = styled.span<{ $priority: MoSCoWPriority; $suggested?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${({ theme, $priority, $suggested }) => {
    const colors = {
      must: { bg: theme.colors.badge.danger.bg, border: theme.colors.badge.danger.border, text: theme.colors.badge.danger.text },
      should: { bg: theme.colors.badge.warning.bg, border: theme.colors.badge.warning.border, text: theme.colors.badge.warning.text },
      could: { bg: theme.colors.badge.info.bg, border: theme.colors.badge.info.border, text: theme.colors.badge.info.text },
      wont: { bg: theme.colors.badge.paused.bg, border: theme.colors.badge.paused.border, text: theme.colors.badge.paused.text },
    };
    const c = colors[$priority];
    return `
      background: ${c.bg};
      color: ${c.text};
      border: 2px solid ${$suggested ? c.border : 'transparent'};
      ${$suggested ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);' : ''}
    `;
  }}
`;

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1.2rem;
`;

const Reason = styled.p`
  margin: 0 0 16px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ theme, $variant }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.colors.button.primary.bg};
        color: ${theme.colors.button.primary.text};
        border: none;
        &:hover { filter: brightness(1.1); }
      `;
    }
    if ($variant === 'danger') {
      return `
        background: transparent;
        color: ${theme.colors.button.danger.bg};
        border: 1px solid ${theme.colors.button.danger.bg};
        &:hover { background: ${theme.colors.button.danger.bg}; color: ${theme.colors.button.danger.text}; }
      `;
    }
    return `
      background: transparent;
      color: ${theme.colors.text.secondary};
      border: 1px solid ${theme.colors.border.primary};
      &:hover { background: ${theme.colors.bg.tertiary}; }
    `;
  }}
`;

const ModifySection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.primary};
`;

const PriorityOptions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const PriorityOption = styled.button<{ $priority: MoSCoWPriority; $selected: boolean }>`
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ theme, $priority, $selected }) => {
    const colors = {
      must: { bg: theme.colors.badge.danger.bg, border: theme.colors.badge.danger.border, text: theme.colors.badge.danger.text },
      should: { bg: theme.colors.badge.warning.bg, border: theme.colors.badge.warning.border, text: theme.colors.badge.warning.text },
      could: { bg: theme.colors.badge.info.bg, border: theme.colors.badge.info.border, text: theme.colors.badge.info.text },
      wont: { bg: theme.colors.badge.paused.bg, border: theme.colors.badge.paused.border, text: theme.colors.badge.paused.text },
    };
    const c = colors[$priority];
    return `
      background: ${$selected ? c.bg : 'transparent'};
      color: ${$selected ? c.text : theme.colors.text.secondary};
      border: 2px solid ${$selected ? c.border : theme.colors.border.primary};
      ${$selected ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.15);' : ''}
      
      &:hover {
        background: ${c.bg};
        color: ${c.text};
        border-color: ${c.border};
      }
    `;
  }}
`;

// ==================== Helper Functions ====================

// Removed static getPriorityLabel function to use hooks inside component

const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

// ==================== Component ====================

export function MoSCoWCard({ task, suggestion, onConfirm, onReject, onModify }: MoSCoWCardProps) {
  const { t } = useTranslation();
  const [showModify, setShowModify] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<MoSCoWPriority>(suggestion.suggestedPriority);

  const taskName = 'name' in task ? task.name : task.title;
  const confidenceLevel = getConfidenceLevel(suggestion.confidence);

  const getPriorityLabel = (priority: MoSCoWPriority): string => {
    const labels: Record<MoSCoWPriority, string> = {
      must: t('moscow.label_must'),
      should: t('moscow.label_should'),
      could: t('moscow.label_could'),
      wont: t('moscow.label_wont'),
    };
    return labels[priority];
  };

  const handleConfirm = () => {
    onConfirm(suggestion.taskId, suggestion.suggestedPriority);
  };

  const handleModifyConfirm = () => {
    onModify(suggestion.taskId, selectedPriority);
    setShowModify(false);
  };

  return (
    <Card>
      <Header>
        <TaskName>{taskName}</TaskName>
        <Confidence $level={confidenceLevel}>
          {confidenceLevel === 'high' ? t('moscow.confidence_high') :
            confidenceLevel === 'medium' ? t('moscow.confidence_medium') : t('moscow.confidence_low')}
          {' '}({Math.round(suggestion.confidence * 100)}%)
        </Confidence>
      </Header>

      <SuggestionRow>
        {suggestion.currentPriority && (
          <>
            <PriorityBadge $priority={suggestion.currentPriority}>
              {getPriorityLabel(suggestion.currentPriority)}
            </PriorityBadge>
            <Arrow>→</Arrow>
          </>
        )}
        <PriorityBadge $priority={suggestion.suggestedPriority} $suggested>
          {getPriorityLabel(suggestion.suggestedPriority)}
        </PriorityBadge>
      </SuggestionRow>

      <Reason>💡 {suggestion.reason}</Reason>

      {!showModify ? (
        <ActionRow>
          <Button $variant="primary" onClick={handleConfirm}>
            {t('moscow.btn_accept')}
          </Button>
          <Button onClick={() => setShowModify(true)}>
            {t('moscow.btn_modify')}
          </Button>
          <Button $variant="danger" onClick={() => onReject(suggestion.taskId)}>
            {t('moscow.btn_ignore')}
          </Button>
        </ActionRow>
      ) : (
        <ModifySection>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {t('moscow.modify_instruction')}
          </span>
          <PriorityOptions>
            {(['must', 'should', 'could', 'wont'] as MoSCoWPriority[]).map((priority) => (
              <PriorityOption
                key={priority}
                $priority={priority}
                $selected={selectedPriority === priority}
                onClick={() => setSelectedPriority(priority)}
              >
                {getPriorityLabel(priority)}
              </PriorityOption>
            ))}
          </PriorityOptions>
          <ActionRow style={{ marginTop: '12px' }}>
            <Button $variant="primary" onClick={handleModifyConfirm}>
              {t('moscow.btn_confirm_modify')}
            </Button>
            <Button onClick={() => setShowModify(false)}>
              {t('moscow.btn_cancel')}
            </Button>
          </ActionRow>
        </ModifySection>
      )}
    </Card>
  );
}

// ==================== Batch View ====================

interface MoSCoWBatchViewProps {
  suggestions: MoSCoWSuggestion[];
  tasks: (CustomTask | MainQuest)[];
  onConfirmAll: (suggestions: MoSCoWSuggestion[]) => void;
  onConfirmOne: (taskId: string, priority: MoSCoWPriority) => void;
  onReject: (taskId: string) => void;
  onModify: (taskId: string, priority: MoSCoWPriority) => void;
}

const BatchContainer = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 16px;
  padding: 20px;
`;

const BatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const BatchTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BatchActions = styled.div`
  display: flex;
  gap: 8px;
`;

const Summary = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
`;

const SummaryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
`;

const SummaryCount = styled.span<{ $priority: MoSCoWPriority }>`
  font-weight: 600;
  color: ${({ theme, $priority }) => {
    const colors = {
      must: theme.colors.badge.danger.text,
      should: theme.colors.badge.warning.text,
      could: theme.colors.badge.info.text,
      wont: theme.colors.text.muted,
    };
    return colors[$priority];
  }};
`;

export function MoSCoWBatchView({
  suggestions,
  tasks,
  onConfirmAll,
  onConfirmOne,
  onReject,
  onModify
}: MoSCoWBatchViewProps) {
  const { t } = useTranslation();
  const taskMap = new Map(tasks.map(t => ['name' in t ? t.id : t.id, t]));

  // 计算各优先级数量
  const counts = suggestions.reduce((acc, s) => {
    acc[s.suggestedPriority] = (acc[s.suggestedPriority] || 0) + 1;
    return acc;
  }, {} as Record<MoSCoWPriority, number>);

  return (
    <BatchContainer>
      <BatchHeader>
        <BatchTitle>
          {t('moscow.batch_title')}
          <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
            ({suggestions.length})
          </span>
        </BatchTitle>
        <BatchActions>
          <Button $variant="primary" onClick={() => onConfirmAll(suggestions)}>
            {t('moscow.batch_accept_all')}
          </Button>
        </BatchActions>
      </BatchHeader>

      <Summary>
        <SummaryItem>
          <SummaryCount $priority="must">{counts.must || 0}</SummaryCount>
          <span>{t('moscow.label_must')}</span>
        </SummaryItem>
        <SummaryItem>
          <SummaryCount $priority="should">{counts.should || 0}</SummaryCount>
          <span>{t('moscow.label_should')}</span>
        </SummaryItem>
        <SummaryItem>
          <SummaryCount $priority="could">{counts.could || 0}</SummaryCount>
          <span>{t('moscow.label_could')}</span>
        </SummaryItem>
        <SummaryItem>
          <SummaryCount $priority="wont">{counts.wont || 0}</SummaryCount>
          <span>{t('moscow.label_wont')}</span>
        </SummaryItem>
      </Summary>

      {suggestions.map((suggestion) => {
        const task = taskMap.get(suggestion.taskId);
        if (!task) return null;

        return (
          <MoSCoWCard
            key={suggestion.taskId}
            task={task}
            suggestion={suggestion}
            onConfirm={onConfirmOne}
            onReject={onReject}
            onModify={onModify}
          />
        );
      })}
    </BatchContainer>
  );
}
