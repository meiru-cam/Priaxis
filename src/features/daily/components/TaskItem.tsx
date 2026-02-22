/**
 * TaskItem Component
 * Individual task card with all task information and actions
 */

import { useState } from 'react';
import styled, { css } from 'styled-components';
import type { CustomTask } from '../../../types/task';
import { getChecklistStats, isChecklistComplete } from '../../../lib/progress-utils';
import { PixelProgressBar } from '../../../components/PixelProgressBar';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { ImeSafeInputBase } from '../../../components/ui';

interface TaskItemProps {
  task: CustomTask;
  onComplete: (id: string) => void;
  onEdit: (task: CustomTask) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onPin?: (id: string) => void;
  onStartPomodoro?: (task: CustomTask) => void;
  onStart?: (id: string) => void;
  onConvertToQuest?: (id: string) => void;
  onQuickUpdate?: (id: string, updates: Partial<CustomTask>) => void;
  onDoDComplete?: (task: CustomTask) => void; // Called when all DoD items are checked
  compact?: boolean;
}

// Importance style mapping


// Effort style mapping


// Task type style mapping


// Calculate urgency based on deadline
function calculateUrgency(deadline?: string): 'urgent' | 'soon' | 'normal' {
  if (!deadline) return 'normal';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'urgent';
  if (diffDays <= 2) return 'soon';
  return 'normal';
}



const CardWrapper = styled.div<{ $completed: boolean; $overdue: boolean }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  position: relative;

  ${({ $overdue }) =>
    $overdue &&
    css`
      border-left: 3px solid ${({ theme }) => theme.colors.status.danger.border};
    `}

  ${({ $completed }) =>
    $completed &&
    css`
      opacity: 0.6;
      background: ${({ theme }) => theme.colors.bg.tertiary};
    `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const TaskHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const Checkbox = styled.button<{ $checked: boolean }>`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 6px;
  border: 2px solid ${({ theme, $checked }) =>
    $checked ? theme.colors.accent.green : theme.colors.border.secondary};
  background: ${({ theme, $checked }) =>
    $checked ? theme.colors.accent.green : 'transparent'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: white;
  font-size: 14px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.green};
    background: ${({ theme, $checked }) =>
    $checked ? theme.colors.accent.green : 'rgba(16, 185, 129, 0.1)'};
  }
`;

const TaskTitle = styled.h4<{ $completed: boolean }>`
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  ${({ $completed }) =>
    $completed &&
    css`
      text-decoration: line-through;
      opacity: 0.7;
      color: ${({ theme }) => theme.colors.text.tertiary};
    `}

  &:hover {
    color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const PomodoroCount = styled.span`
  background: ${({ theme }) => theme.colors.accent.red};
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const QuickPomodoroButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }
`;

const PinButton = styled.button<{ $pinned: boolean }>`
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: ${({ $pinned }) => $pinned ? 'rgba(251, 191, 36, 0.2)' : 'transparent'};
  color: ${({ $pinned }) => $pinned ? '#f59e0b' : '#9ca3af'};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(251, 191, 36, 0.2);
    color: #f59e0b;
  }
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 12px;
  font-style: italic;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const LinkBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colors.card.purple.bg};
  border: 1px solid ${({ theme }) => theme.colors.accent.purple};
  border-radius: 6px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.purple};
    color: white;
  }
`;



const SmallBadge = styled.span<{ $bg?: string; $border?: string }>`
  padding: 2px 8px;
  background: ${({ $bg, theme }) => $bg || theme.colors.bg.tertiary};
  border: 1px solid ${({ $border, theme }) => $border || theme.colors.border.primary};
  border-radius: 10px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const DeadlineText = styled.div<{ $urgent?: boolean }>`
  font-size: 0.8rem;
  margin-top: 8px;
  color: ${({ theme, $urgent }) =>
    $urgent ? theme.colors.status.danger.text : theme.colors.text.tertiary};
  ${({ $urgent }) =>
    $urgent &&
    css`
      font-weight: 600;
    `}
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'warning' | 'info' }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.1)';
      case 'warning':
        return 'rgba(251, 191, 36, 0.1)';
      default:
        return theme.colors.bg.tertiary;
    }
  }};
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'danger':
        return theme.colors.status.danger.text;
      case 'warning':
        return theme.colors.status.warning.text;
      default:
        return theme.colors.text.secondary;
    }
  }};

  &:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }
`;

const QuickEditRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const QuickEditGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const QuickEditLabel = styled.label`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  white-space: nowrap;
`;

const QuickEditInput = styled(ImeSafeInputBase)`
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.8rem;
  width: 120px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const QuickEditSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.8rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const ChecklistContainer = styled.div`
  margin-bottom: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ChecklistTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`;

const ChecklistItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ChecklistItemLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  margin-top: 3px;
`;

const ChecklistItemText = styled.span<{ $completed: boolean }>`
  font-size: 0.9rem;
  color: ${({ theme, $completed }) =>
    $completed ? theme.colors.text.tertiary : theme.colors.text.primary};
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
  line-height: 1.4;
`;

export function TaskItem({
  task,
  onComplete,
  onEdit,
  onDelete,
  onArchive,
  onPin,

  onStartPomodoro,
  onConvertToQuest,
  onQuickUpdate,
  onDoDComplete,
  compact: _compact = false,
}: TaskItemProps) {
  const { t } = useTranslation();
  // Note: _compact is kept for API compatibility but all tasks now default to collapsed
  // Default to collapsed (false), expand only if explicitly not compact
  const [isExpanded, setIsExpanded] = useState(false);
  const [localDeadline, setLocalDeadline] = useState(task.deadline || '');

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Handle quick edit updates
  const handleQuickUpdate = (updates: Partial<CustomTask>) => {
    if (onQuickUpdate) {
      onQuickUpdate(task.id, updates);
    }
  };

  const urgency = calculateUrgency(task.deadline);
  const isOverdue = urgency === 'urgent';


  // Get link text
  let linkText = '';
  if (task.linkType === 'chapter' && task.linkedChapterId) {
    linkText = t('task.item.link_chapter');
  } else if (task.linkType === 'mainQuest' && task.linkedMainQuestId) {
    linkText = t('task.item.link_quest');
  } else if (task.linkType === 'season' && task.linkedSeasonId) {
    linkText = t('task.item.link_season');
  } else {
    linkText = t('task.item.link_none');
  }

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete(task.id);
  };

  return (
    <CardWrapper $completed={task.completed} $overdue={isOverdue && !task.completed}>
      <TaskHeader>
        <Checkbox
          $checked={task.completed}
          onClick={handleComplete}
          aria-label={task.completed ? t('task.item.mark_incomplete') : t('task.item.mark_complete')}
        >
          {task.completed && '✓'}
        </Checkbox>
        {onPin && (
          <PinButton $pinned={!!task.pinned} onClick={() => onPin(task.id)} title={task.pinned ? t('task.item.unpin') : t('task.item.pin')}>
            📌
          </PinButton>
        )}
        <TaskTitle $completed={task.completed} onClick={() => onEdit(task)}>
          {task.name}
        </TaskTitle>
        {!task.completed && onStartPomodoro && (
          <QuickPomodoroButton onClick={() => onStartPomodoro(task)}>
            🍅
          </QuickPomodoroButton>
        )}
        {task.pomodoroCount && task.pomodoroCount > 0 && (
          <PomodoroCount>🍅 x{task.pomodoroCount}</PomodoroCount>
        )}
        {task.status === 'in_progress' && !task.completed && (
          <SmallBadge $bg="rgba(59, 130, 246, 0.15)" $border="#3b82f6">{t('task.item.status_in_progress')}</SmallBadge>
        )}
        <CollapseButton onClick={toggleExpanded}>
          {isExpanded ? t('task.item.collapse') : t('task.item.expand')}
        </CollapseButton>
      </TaskHeader>

      {isExpanded && (
        <>
          {task.context && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}> {t('task.item.label_context')}</div>
              <Description>{task.context}</Description>
            </div>
          )}

          {task.description && !task.context && <Description>{task.description}</Description>}

          {task.motivation && (
            <div style={{ marginBottom: '12px', background: 'rgba(239, 68, 68, 0.05)', padding: '8px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}> {t('task.item.label_motivation')}</div>
              <div style={{ fontSize: '0.9rem', color: '#7f1d1d' }}>{task.motivation}</div>
            </div>
          )}

          {task.checklist && task.checklist.length > 0 && (
            <ChecklistContainer>
              <ChecklistTitle>
                {t('task.item.label_dod')}
              </ChecklistTitle>

              {/* Pixel Art Progress Bar */}
              {(() => {
                const stats = getChecklistStats(task.checklist);
                return (
                  <PixelProgressBar
                    value={stats.completed}
                    max={stats.total}
                    size="small"
                    showLabel={true}
                    label={`${stats.completed}/${stats.total} ${t('task.item.dod_completed')}`}
                  />
                );
              })()}

              <ChecklistItems>
                {task.checklist.map((item) => (
                  <ChecklistItemLabel key={item.id} htmlFor={`checklist-item-${task.id}-${item.id}`}>
                    <input
                      id={`checklist-item-${task.id}-${item.id}`}
                      name={`checklist-item-${task.id}-${item.id}`}
                      autoComplete="off"
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        if (onQuickUpdate) {
                          const newChecklist = task.checklist!.map(i =>
                            i.id === item.id ? { ...i, completed: e.target.checked } : i
                          );
                          onQuickUpdate(task.id, { checklist: newChecklist });

                          // Check if all items are now complete
                          if (isChecklistComplete(newChecklist) && onDoDComplete) {
                            // Delay to let state update first
                            setTimeout(() => {
                              onDoDComplete({ ...task, checklist: newChecklist });
                            }, 100);
                          }
                        }
                      }}
                      style={{ marginTop: '3px' }}
                    />
                    <ChecklistItemText $completed={item.completed}>
                      {item.text}
                    </ChecklistItemText>
                  </ChecklistItemLabel>
                ))}
              </ChecklistItems>
            </ChecklistContainer>
          )}

          <LinkBadge onClick={() => onEdit(task)}>{linkText}</LinkBadge>

          {onQuickUpdate && (
            <QuickEditRow>
              <QuickEditGroup>
                <QuickEditLabel htmlFor={`task-importance-${task.id}`}>{t('task.item.quick_importance')}</QuickEditLabel>
                <QuickEditSelect
                  id={`task-importance-${task.id}`}
                  name={`importance-${task.id}`}
                  value={task.importance || 'medium'}
                  onChange={(e) => handleQuickUpdate({ importance: e.target.value as typeof task.importance })}
                >
                  <option value="high">{t('task.item.priority_high')}</option>
                  <option value="medium">{t('task.item.priority_medium')}</option>
                  <option value="low">{t('task.item.priority_low')}</option>
                </QuickEditSelect>
              </QuickEditGroup>
              <QuickEditGroup>
                <QuickEditLabel htmlFor={`task-deadline-${task.id}`}>{t('task.item.quick_deadline')}</QuickEditLabel>
                <QuickEditInput
                  type="date"
                  id={`task-deadline-${task.id}`}
                  name={`deadline-${task.id}`}
                  value={localDeadline}
                  onChange={(e) => {
                    setLocalDeadline(e.target.value);
                    handleQuickUpdate({ deadline: e.target.value || undefined });
                  }}
                />
              </QuickEditGroup>
              <QuickEditGroup>
                <QuickEditLabel htmlFor={`task-effort-${task.id}`}>{t('task.item.quick_effort')}</QuickEditLabel>
                <QuickEditSelect
                  id={`task-effort-${task.id}`}
                  name={`effort-${task.id}`}
                  value={task.effort || 'medium'}
                  onChange={(e) => handleQuickUpdate({ effort: e.target.value as typeof task.effort })}
                >
                  <option value="light">{t('task.item.effort_light')}</option>
                  <option value="medium">{t('task.item.effort_medium')}</option>
                  <option value="heavy">{t('task.item.effort_heavy')}</option>
                </QuickEditSelect>
              </QuickEditGroup>
              <QuickEditGroup>
                <QuickEditLabel htmlFor={`task-type-${task.id}`}>{t('task.item.quick_type')}</QuickEditLabel>
                <QuickEditSelect
                  id={`task-type-${task.id}`}
                  name={`taskType-${task.id}`}
                  value={task.taskType || 'creative'}
                  onChange={(e) => handleQuickUpdate({ taskType: e.target.value as typeof task.taskType })}
                >
                  <option value="creative">{t('task.item.type_creative')}</option>
                  <option value="tax">{t('task.item.type_tax')}</option>
                  <option value="maintenance">{t('task.item.type_maintenance')}</option>
                </QuickEditSelect>
              </QuickEditGroup>
              <QuickEditGroup>
                <QuickEditLabel htmlFor={`task-energy-${task.id}`}>{t('task.item.quick_energy')}</QuickEditLabel>
                <QuickEditInput
                  type="number"
                  id={`task-energy-${task.id}`}
                  name={`energy-${task.id}`}
                  min={0}
                  max={100}
                  step={5}
                  value={task.estimatedCosts?.energy ? Math.abs(task.estimatedCosts.energy) : 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleQuickUpdate({
                      estimatedCosts: value > 0 ? { energy: -value } : undefined
                    });
                  }}
                  style={{ width: '50px' }}
                />
              </QuickEditGroup>
            </QuickEditRow>
          )}

          {!onQuickUpdate && task.deadline && (
            <DeadlineText $urgent={isOverdue}>
              📅 {task.deadline}
              {isOverdue && ` ${t('task.item.overdue')}`}
            </DeadlineText>
          )}

          <ActionRow>

            {!task.completed && onConvertToQuest && (
              <ActionButton onClick={() => onConvertToQuest(task.id)} title={t('task.item.btn_convert_quest')}>
                {t('task.item.btn_convert_quest')}
              </ActionButton>
            )}
            <ActionButton onClick={() => onArchive(task.id)} $variant="warning">
              {t('task.item.btn_archive')}
            </ActionButton>
            <ActionButton onClick={() => onDelete(task.id)} $variant="danger">
              {t('task.item.btn_delete')}
            </ActionButton>
          </ActionRow>
        </>
      )}

    </CardWrapper>
  );
}

export default TaskItem;
