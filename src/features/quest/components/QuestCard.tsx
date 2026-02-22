/**
 * QuestCard Component
 * Individual quest card with progress, status, and actions
 */

import { useState, useRef, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { PixelProgressBar } from '../../../components/PixelProgressBar';
import { ImeSafeInputBase } from '../../../components/ui';
import type { MainQuest, Status, CustomTask, Importance, Chapter, Season } from '../../../types/task';

interface QuestCardProps {
  quest: MainQuest;
  linkedTasks?: CustomTask[];
  seasons?: Season[];
  onEdit: (quest: MainQuest) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onStatusChange: (id: string, status: Status) => void;
  onAddTask?: (questId: string) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onUpdateDates?: (id: string, updates: { unlockTime?: string; deadline?: string }) => void;
  onUpdateImportance?: (id: string, importance: Importance) => void;
  onUpdateLinkedChapter?: (id: string, chapterId: string | undefined, seasonId: string | undefined) => void;
  isArchived?: boolean;
}



const CardWrapper = styled.div<{ $status: Status; $importance: string }>`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  position: relative;

  ${({ $status }) =>
    $status === 'locked' &&
    css`
      opacity: 0.6;
      filter: grayscale(30%);
    `}

  ${({ $status }) =>
    $status === 'completed' &&
    css`
      background: ${({ theme }) => theme.colors.bg.tertiary};
    `}

  ${({ $importance }) =>
    $importance === 'high' &&
    css`
      border-left: 3px solid #ef4444;
    `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const QuestHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const QuestTitle = styled.h4`
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const StatusBadge = styled.span<{ $color: string }>`
  padding: 4px 10px;
  background: ${({ $color }) => `${$color}20`};
  border: 1px solid ${({ $color }) => $color};
  border-radius: 12px;
  font-size: 0.75rem;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 16px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const CollapsibleDescription = styled.p<{ $expanded: boolean }>`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

const ExpandToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.accent.purple};
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ProgressSection = styled.div`
  margin-bottom: 16px;
`;

const ProgressControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const ProgressButton = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressInput = styled(ImeSafeInputBase)`
  width: 60px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  text-align: center;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const SmallBadge = styled.span<{ $bg?: string; $border?: string; $clickable?: boolean }>`
  padding: 2px 8px;
  background: ${({ $bg, theme }) => $bg || theme.colors.bg.tertiary};
  border: 1px solid ${({ $border, theme }) => $border || theme.colors.border.primary};
  border-radius: 10px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.primary};
  ${({ $clickable }) => $clickable && css`
    cursor: pointer;
    transition: all 0.2s ease;
    &:hover {
      opacity: 0.8;
      transform: scale(1.02);
    }
  `}
`;

const BadgeDropdownWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const BadgeDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: 100;
  min-width: 120px;
  overflow: hidden;
`;

const BadgeDropdownItem = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  
  &:hover {
    background: rgba(139, 92, 246, 0.15);
  }
`;

// DeadlineText was replaced by inline styles with traffic light colors

const DateRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const DateEditGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
`;

const DateLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const DateInput = styled(ImeSafeInputBase)<{ $status?: 'red' | 'yellow' | 'green' | null }>`
  padding: 4px 8px;
  border: 1px solid ${({ theme, $status }) => {
    switch ($status) {
      case 'red': return '#ef4444';
      case 'yellow': return '#f59e0b';
      case 'green': return '#10b981';
      default: return theme.colors.border.primary;
    }
  }};
  border-radius: 6px;
  background: ${({ theme, $status }) => {
    switch ($status) {
      case 'red': return 'rgba(239, 68, 68, 0.1)';
      case 'yellow': return 'rgba(245, 158, 11, 0.1)';
      case 'green': return 'rgba(16, 185, 129, 0.1)';
      default: return theme.colors.input.bg;
    }
  }};
  color: ${({ theme, $status }) => {
    switch ($status) {
      case 'red': return '#ef4444';
      case 'yellow': return '#b45309';
      case 'green': return '#059669';
      default: return theme.colors.input.text;
    }
  }};
  font-size: 0.8rem;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const LinkedTasksSection = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const TaskListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`;

const TaskListItem = styled.div<{ $completed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};

  &:last-child {
    border-bottom: none;
  }

  ${({ $completed }) =>
    $completed &&
    css`
      opacity: 0.6;
    `}
`;

const TaskCheckbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.accent.purple};
`;

const TaskName = styled.span<{ $completed?: boolean }>`
  flex: 1;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.primary};
  ${({ $completed }) =>
    $completed &&
    css`
      text-decoration: line-through;
      color: ${({ theme }) => theme.colors.text.tertiary};
    `}
`;

const AddTaskButton = styled.button`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    color: ${({ theme }) => theme.colors.accent.purple};
    background: rgba(139, 92, 246, 0.05);
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'warning' | 'success' | 'info' }>`
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
      case 'success':
        return 'rgba(16, 185, 129, 0.1)';
      case 'info':
        return 'rgba(59, 130, 246, 0.1)';
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
      case 'success':
        return theme.colors.status.success.text;
      case 'info':
        return theme.colors.status.info.text;
      default:
        return theme.colors.text.secondary;
    }
  }};

  &:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }
`;

// Local helpers moved to src/lib/date-utils.ts
import { validateAndClampDate, getDeadlineStatus } from '../../../lib/date-utils';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { getEffectiveQuestStatus } from '../../../lib/hierarchy-status';


export function QuestCard({
  quest,
  linkedTasks,
  seasons = [],
  onEdit,
  onDelete,
  onArchive,
  onUpdateProgress,
  onStatusChange,
  onAddTask,
  onToggleTaskComplete,
  onUpdateDates,
  onUpdateImportance,
  onUpdateLinkedChapter,
  isArchived = false,
}: QuestCardProps) {
  const { t } = useTranslation();
  const [localProgress, setLocalProgress] = useState(quest.progress);
  const [localDeadline, setLocalDeadline] = useState(quest.deadline || '');
  const [localUnlockTime, setLocalUnlockTime] = useState(quest.unlockTime || '');
  const [showImportanceDropdown, setShowImportanceDropdown] = useState(false);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const importanceRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLParagraphElement>(null);
  const [showExpandButton, setShowExpandButton] = useState(false);


  // Status style mapping
  const statusConfig: Record<Status, { icon: string; label: string; color: string }> = {
    active: { icon: '🟢', label: t('quest.status.active'), color: '#10b981' },
    paused: { icon: '⏸️', label: t('quest.status.paused'), color: '#f59e0b' },
    completed: { icon: '✅', label: t('quest.status.completed'), color: '#3b82f6' },
    archived: { icon: '📦', label: t('quest.status.archived'), color: '#6b7280' },
    locked: { icon: '🔒', label: t('quest.status.locked'), color: '#9ca3af' },
  };

  // Importance style mapping
  const importanceConfig = {
    high: { icon: '🔴', label: t('quest.importance.high'), color: '#ef4444' },
    medium: { icon: '🟡', label: t('quest.importance.medium'), color: '#f59e0b' },
    low: { icon: '🟢', label: t('quest.importance.low'), color: '#10b981' },
  };

  // Check if context text needs expand button (more than 5 lines)
  useEffect(() => {
    if (contextRef.current && quest.context) {
      const lineHeight = parseFloat(getComputedStyle(contextRef.current).lineHeight);
      const maxHeight = lineHeight * 5;
      setShowExpandButton(contextRef.current.scrollHeight > maxHeight + 2);
    }
  }, [quest.context]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importanceRef.current && !importanceRef.current.contains(e.target as Node)) {
        setShowImportanceDropdown(false);
      }
      if (chapterRef.current && !chapterRef.current.contains(e.target as Node)) {
        setShowChapterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all chapters from seasons
  const allChapters: { chapter: Chapter; season: Season }[] = [];
  seasons.forEach((season) => {
    season.chapters.forEach((chapter) => {
      allChapters.push({ chapter, season });
    });
  });

  // Find linked chapter info
  const linkedChapterInfo = allChapters.find(c => c.chapter.id === quest.linkedChapterId);

  const effectiveStatus = getEffectiveQuestStatus(quest, seasons);
  const status = statusConfig[effectiveStatus];
  const importance = importanceConfig[quest.importance];
  // Use localDeadline for dynamic status calculation
  const deadlineStatus = getDeadlineStatus(localDeadline || quest.deadline, effectiveStatus);

  // Format progress display
  const progressDisplay =
    quest.progressType === 'custom' && quest.progressCurrent !== undefined
      ? `${quest.progressCurrent}/${quest.progressTotal || 100} ${quest.progressUnit || ''}`
      : `${quest.progress}%`;

  const handleProgressChange = (delta: number) => {
    const newProgress = Math.max(0, Math.min(100, localProgress + delta));
    setLocalProgress(newProgress);
    onUpdateProgress(quest.id, newProgress);
  };

  const handleProgressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      const newProgress = Math.max(0, Math.min(100, value));
      setLocalProgress(newProgress);
      onUpdateProgress(quest.id, newProgress);
    }
  };

  return (
    <CardWrapper $status={effectiveStatus} $importance={quest.importance}>
      <QuestHeader>
        <QuestTitle onClick={() => onEdit(quest)}>
          {quest.title}
        </QuestTitle>
        <StatusBadge $color={status.color}>
          {status.icon} {status.label}
        </StatusBadge>
      </QuestHeader>

      {/* SMART Fields Display */}
      {quest.context && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}> {t('quest.label.start_state')}:</div>
          <CollapsibleDescription ref={contextRef} $expanded={isContextExpanded}>
            {quest.context}
          </CollapsibleDescription>
          {showExpandButton && (
            <ExpandToggleButton onClick={() => setIsContextExpanded(!isContextExpanded)}>
              {isContextExpanded ? `${t('quest.action.collapse')} ▲` : `${t('quest.action.expand')} ▼`}
            </ExpandToggleButton>
          )}
        </div>
      )}

      {quest.description && !quest.context && <Description>{quest.description}</Description>}

      {quest.motivation && (
        <div style={{ marginBottom: '16px', background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}> {t('quest.section_incentives')}:</div>
          <div style={{ fontSize: '0.9rem', color: '#7f1d1d', lineHeight: '1.5' }}>{quest.motivation}</div>
        </div>
      )}

      <ProgressSection>
        <PixelProgressBar
          value={linkedTasks?.filter(t => t.completed).length || Math.round(quest.progress / 10)}
          max={linkedTasks?.length || 10}
          size="small"
          showLabel={true}
          label={linkedTasks?.length
            ? `${t('quest.label.progress')} ${linkedTasks.filter(t => t.completed).length}/${linkedTasks.length}`
            : `${t('quest.label.progress')} ${progressDisplay}`}
        />
        {effectiveStatus === 'active' && (
          <ProgressControls>
            <ProgressButton
              onClick={() => handleProgressChange(-5)}
              disabled={localProgress <= 0}
            >
              -
            </ProgressButton>
            <ProgressInput
              type="number"
              id={`progress-${quest.id}`}
              name={`progress-${quest.id}`}
              aria-label={t('quest.label.progress')}
              value={localProgress}
              onChange={handleProgressInput}
              min={0}
              max={100}
            />
            <ProgressButton
              onClick={() => handleProgressChange(5)}
              disabled={localProgress >= 100}
            >
              +
            </ProgressButton>
          </ProgressControls>
        )}
      </ProgressSection>

      <BadgeRow>
        {/* Importance Badge - Clickable */}
        <BadgeDropdownWrapper ref={importanceRef}>
          <SmallBadge
            $bg={`${importance.color}20`}
            $border={importance.color}
            $clickable={!!onUpdateImportance}
            onClick={() => onUpdateImportance && setShowImportanceDropdown(!showImportanceDropdown)}
          >
            {importance.icon} {importance.label}
          </SmallBadge>
          {showImportanceDropdown && (
            <BadgeDropdown>
              {(['high', 'medium', 'low'] as Importance[]).map((imp) => (
                <BadgeDropdownItem
                  key={imp}
                  $active={quest.importance === imp}
                  onClick={() => {
                    onUpdateImportance?.(quest.id, imp);
                    setShowImportanceDropdown(false);
                  }}
                >
                  {importanceConfig[imp].icon} {importanceConfig[imp].label}
                </BadgeDropdownItem>
              ))}
            </BadgeDropdown>
          )}
        </BadgeDropdownWrapper>

        {/* Linked Chapter Badge - Clickable */}
        <BadgeDropdownWrapper ref={chapterRef}>
          <SmallBadge
            $bg="rgba(139, 92, 246, 0.15)"
            $border="#8b5cf6"
            $clickable={!!onUpdateLinkedChapter && allChapters.length > 0}
            onClick={() => onUpdateLinkedChapter && allChapters.length > 0 && setShowChapterDropdown(!showChapterDropdown)}
          >
            {linkedChapterInfo
              ? `📖 ${linkedChapterInfo.chapter.title.slice(0, 10)}${linkedChapterInfo.chapter.title.length > 10 ? '...' : ''}`
              : `📖 ${t('quest.label.no_chapter')}`
            }
          </SmallBadge>
          {showChapterDropdown && (
            <BadgeDropdown style={{ minWidth: '180px' }}>
              <BadgeDropdownItem
                $active={!quest.linkedChapterId}
                onClick={() => {
                  onUpdateLinkedChapter?.(quest.id, undefined, undefined);
                  setShowChapterDropdown(false);
                }}
              >
                {t('quest.option_no_link')}
              </BadgeDropdownItem>
              {allChapters.map(({ chapter, season }) => (
                <BadgeDropdownItem
                  key={chapter.id}
                  $active={quest.linkedChapterId === chapter.id}
                  onClick={() => {
                    onUpdateLinkedChapter?.(quest.id, chapter.id, season.id);
                    setShowChapterDropdown(false);
                  }}
                >
                  [{season.name}] {chapter.title.slice(0, 15)}{chapter.title.length > 15 ? '...' : ''}
                </BadgeDropdownItem>
              ))}
            </BadgeDropdown>
          )}
        </BadgeDropdownWrapper>
      </BadgeRow>

      {/* Date quick edit section */}
      <DateRow>
        <DateEditGroup>
          <DateLabel>🔓 {t('quest.card.unlock_label')}</DateLabel>
          <DateInput
            type="date"
            id={`unlock-${quest.id}`}
            name={`unlock-${quest.id}`}
            value={localUnlockTime}
            onChange={(e) => {
              const validatedDate = validateAndClampDate(e.target.value);
              setLocalUnlockTime(validatedDate);
            }}
            onBlur={() => {
              if (localUnlockTime !== quest.unlockTime) {
                onUpdateDates?.(quest.id, { unlockTime: localUnlockTime });
              }
            }}
            title={t('quest.label.unlock_time')}
          />
        </DateEditGroup>
        <DateEditGroup>
          <DateLabel>📅 {t('quest.label.time_bound')}:</DateLabel>
          <DateInput
            type="date"
            id={`deadline-${quest.id}`}
            name={`deadline-${quest.id}`}
            $status={deadlineStatus}
            value={localDeadline}
            onChange={(e) => {
              const validatedDate = validateAndClampDate(e.target.value);
              setLocalDeadline(validatedDate);
            }}
            onBlur={() => {
              if (localDeadline !== quest.deadline) {
                onUpdateDates?.(quest.id, { deadline: localDeadline });
              }
            }}
            title={
              deadlineStatus === 'red' ? t('quest.card.deadline.red') :
                deadlineStatus === 'yellow' ? t('quest.card.deadline.yellow') :
                  deadlineStatus === 'green' ? t('quest.card.deadline.green') : t('quest.label.time_bound')
            }
          />
        </DateEditGroup>
      </DateRow>

      {linkedTasks && linkedTasks.length > 0 && (() => {
        // Filter to uncompleted tasks, sort by deadline, limit to 3
        const uncompletedTasks = linkedTasks
          .filter(t => !t.completed)
          .sort((a, b) => {
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          });
        const displayTasks = uncompletedTasks.slice(0, 3);
        const remainingCount = uncompletedTasks.length - 3;
        const completedCount = linkedTasks.filter(t => t.completed).length;

        if (displayTasks.length === 0 && completedCount === 0) return null;

        return (
          <LinkedTasksSection>
            <TaskListHeader>
              <span>📋 {t('quest.label.linked_tasks')} ({uncompletedTasks.length} {t('weekly.count_suffix')}{completedCount > 0 ? ` / ${completedCount} ${t('quest.status.completed')}` : ''})</span>
            </TaskListHeader>
            {displayTasks.map((task) => (
              <TaskListItem key={task.id} $completed={task.completed}>
                <TaskCheckbox
                  type="checkbox"
                  id={`task-check-${task.id}`}
                  name={`task-check-${task.id}`}
                  checked={task.completed}
                  onChange={() => onToggleTaskComplete?.(task.id)}
                />
                <TaskName as="label" htmlFor={`task-check-${task.id}`} $completed={task.completed}>{task.name}</TaskName>
              </TaskListItem>
            ))}
            {remainingCount > 0 && (
              <TaskListItem $completed={false} style={{ opacity: 0.6, fontStyle: 'italic' }}>
                <span>{t('quest.card.remaining_tasks').replace('{count}', remainingCount.toString())}</span>
              </TaskListItem>
            )}
          </LinkedTasksSection>
        );
      })()}

      {onAddTask && effectiveStatus === 'active' && (
        <AddTaskButton onClick={() => onAddTask(quest.id)}>
          ➕ {t('quest.action.add_task')}
        </AddTaskButton>
      )}

      <ActionRow>
        {!isArchived && effectiveStatus === 'active' && (
          <ActionButton
            $variant="warning"
            onClick={() => onStatusChange(quest.id, 'paused')}
          >
            {t('quest.action.pause')}
          </ActionButton>
        )}
        {!isArchived && effectiveStatus === 'paused' && (
          <ActionButton
            $variant="success"
            onClick={() => onStatusChange(quest.id, 'active')}
          >
            ▶️ {t('quest.action.resume')}
          </ActionButton>
        )}
        {!isArchived && effectiveStatus === 'active' && quest.progress >= 100 && (
          <ActionButton
            $variant="success"
            onClick={() => onStatusChange(quest.id, 'completed')}
          >
            ✅ {t('quest.action.complete')}
          </ActionButton>
        )}
        {isArchived && effectiveStatus !== 'completed' && (
          <ActionButton
            $variant="success"
            onClick={() => onStatusChange(quest.id, 'completed')}
          >
            ✅ {t('quest.action.mark_complete')}
          </ActionButton>
        )}
        <ActionButton onClick={() => onArchive(quest.id)} $variant="info">
          {isArchived ? t('quest.card.unarchive') : t('quest.card.archive')}
        </ActionButton>
        <ActionButton onClick={() => onDelete(quest.id)} $variant="danger">
          {t('quest.delete_btn')}
        </ActionButton>
      </ActionRow>
    </CardWrapper>
  );
}

export default QuestCard;
