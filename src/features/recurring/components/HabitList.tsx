/**
 * HabitList Component
 * List of habits with filtering + drag reorder
 */

import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { HabitCard } from './HabitCard';
import type { Habit } from '../../../types/task';

interface HabitListProps {
  habits: Habit[];
  onCheckIn: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  isArchived?: boolean;
  onReorder?: (dragId: string, targetId: string) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HabitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const HabitItem = styled.div<{ $dragging: boolean }>`
  opacity: ${({ $dragging }) => ($dragging ? 0.45 : 1)};
  transition: opacity 0.15s ease;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 40px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 8px 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
`;

export function HabitList({
  habits,
  onCheckIn,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  isArchived = false,
  onReorder,
}: HabitListProps) {
  const { t } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (habits.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>🌱</EmptyIcon>
        <EmptyTitle>{t('recurring.habit_empty_title')}</EmptyTitle>
        <EmptyDescription>
          {t('recurring.habit_empty_desc')}
        </EmptyDescription>
      </EmptyState>
    );
  }

  return (
    <Container>
      <HabitGrid>
        {habits.map((habit) => (
          <HabitItem
            key={habit.id}
            draggable
            $dragging={draggingId === habit.id}
            onDragStart={() => setDraggingId(habit.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!draggingId || draggingId === habit.id) return;
              onReorder?.(draggingId, habit.id);
              setDraggingId(null);
            }}
          >
            <HabitCard
              habit={habit}
              onCheckIn={onCheckIn}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onRestore={onRestore}
              isArchived={isArchived}
            />
          </HabitItem>
        ))}
      </HabitGrid>
    </Container>
  );
}

export default HabitList;
