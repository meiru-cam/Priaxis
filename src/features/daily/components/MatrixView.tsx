/**
 * MatrixView Component
 * Eisenhower Matrix (Four Quadrants) view for tasks
 *
 * Q1: Important & Urgent (top-right) - Do immediately
 * Q2: Important & Not Urgent (top-left) - Schedule time
 * Q3: Not Important & Urgent (bottom-right) - Delegate
 * Q4: Not Important & Not Urgent (bottom-left) - Consider deleting
 */

import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { CustomTask } from '../../../types/task';
import { TaskItem } from './TaskItem';

interface MatrixViewProps {
  tasks: CustomTask[];
  onComplete: (id: string) => void;
  onEdit: (task: CustomTask) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onPin?: (id: string) => void;
  onStart?: (id: string) => void;
  onStartPomodoro?: (task: CustomTask) => void;
  onConvertToQuest?: (id: string) => void;
  onQuickUpdate?: (id: string, updates: Partial<CustomTask>) => void;
  onDoDComplete?: (task: CustomTask) => void;
}

type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface QuadrantConfig {
  id: Quadrant;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
}

// quadrantConfigs moved inside component to use translations

// Calculate urgency based on deadline
function isUrgent(deadline?: string): boolean {
  if (!deadline) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 0; // Today or overdue
}

// Determine task quadrant
// Only 'high' importance is considered "important" for the matrix
function getTaskQuadrant(task: CustomTask): Quadrant {
  const important = task.importance === 'high';
  const urgent = isUrgent(task.deadline);

  if (important && urgent) return 'Q1';
  if (important && !urgent) return 'Q2';
  if (!important && urgent) return 'Q3';
  return 'Q4';
}

const MatrixContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 600px;
`;

const QuadrantBox = styled.div<{ $color: string; $bgColor: string }>`
  background: ${({ $bgColor }) => $bgColor};
  border: 2px solid ${({ $color }) => $color};
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const QuadrantHeader = styled.div<{ $color: string }>`
  font-weight: 600;
  color: ${({ $color }) => $color};
  margin-bottom: 15px;
  font-size: 1.1rem;
`;

const QuadrantSubtitle = styled.span`
  font-size: 0.85rem;
  opacity: 0.8;
  font-weight: normal;
  display: block;
  margin-top: 4px;
`;

const TaskCount = styled.span`
  font-size: 0.8rem;
  font-weight: normal;
  opacity: 0.7;
  margin-left: 8px;
`;

const QuadrantContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
  max-height: 400px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
`;

const EmptyQuadrant = styled.div`
  text-align: center;
  padding: 30px 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
  font-size: 0.9rem;
`;

const MatrixHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const MatrixTitle = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.accent.purple};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TooltipIcon = styled.span`
  font-size: 0.9rem;
  cursor: help;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

export function MatrixView({
  tasks,
  onComplete,
  onEdit,
  onDelete,
  onArchive,
  onPin,
  onStart,
  onStartPomodoro,
  onConvertToQuest,
  onQuickUpdate,
  onDoDComplete,
}: MatrixViewProps) {
  const { t } = useTranslation();

  const quadrantConfigs: QuadrantConfig[] = [
    {
      id: 'Q2',
      title: t('daily.matrix_q2_title'),
      subtitle: t('daily.matrix_q2_subtitle'),
      icon: '📅',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      id: 'Q1',
      title: t('daily.matrix_q1_title'),
      subtitle: t('daily.matrix_q1_subtitle'),
      icon: '⚠️',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
    },
    {
      id: 'Q4',
      title: t('daily.matrix_q4_title'),
      subtitle: t('daily.matrix_q4_subtitle'),
      icon: '💤',
      color: '#9ca3af',
      bgColor: 'rgba(156, 163, 175, 0.1)',
    },
    {
      id: 'Q3',
      title: t('daily.matrix_q3_title'),
      subtitle: t('daily.matrix_q3_subtitle'),
      icon: '⏰',
      color: '#f59e0b',
      bgColor: 'rgba(251, 191, 36, 0.1)',
    },
  ];

  // Filter out completed tasks and categorize by quadrant
  const pendingTasks = tasks.filter((t) => !t.completed);

  const tasksByQuadrant: Record<Quadrant, CustomTask[]> = {
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: [],
  };

  pendingTasks.forEach((task) => {
    const quadrant = getTaskQuadrant(task);
    tasksByQuadrant[quadrant].push(task);
  });

  // Sort tasks within each quadrant: pinned first, then by deadline
  Object.keys(tasksByQuadrant).forEach((q) => {
    tasksByQuadrant[q as Quadrant].sort((a, b) => {
      // Pinned tasks first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  });

  return (
    <div>
      <MatrixHeader>
        <MatrixTitle>
          📊 {t('daily.matrix_title')}
          <TooltipIcon title={t('daily.matrix_tooltip')}>
            ❓
          </TooltipIcon>
        </MatrixTitle>
      </MatrixHeader>

      <MatrixContainer>
        {quadrantConfigs.map((config) => (
          <QuadrantBox key={config.id} $color={config.color} $bgColor={config.bgColor}>
            <QuadrantHeader $color={config.color}>
              {config.icon} {config.title}
              <TaskCount>({tasksByQuadrant[config.id].length})</TaskCount>
              <QuadrantSubtitle>{config.subtitle}</QuadrantSubtitle>
            </QuadrantHeader>

            <QuadrantContent>
              {tasksByQuadrant[config.id].length === 0 ? (
                <EmptyQuadrant>{t('daily.matrix_empty')}</EmptyQuadrant>
              ) : (
                tasksByQuadrant[config.id].map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={onComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onArchive={onArchive}
                    onPin={onPin}
                    onStart={onStart}
                    onStartPomodoro={onStartPomodoro}
                    onConvertToQuest={onConvertToQuest}
                    onQuickUpdate={onQuickUpdate}
                    onDoDComplete={onDoDComplete}
                    compact
                  />
                ))
              )}
            </QuadrantContent>
          </QuadrantBox>
        ))}
      </MatrixContainer>
    </div>
  );
}

export default MatrixView;
