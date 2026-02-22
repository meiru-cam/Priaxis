/**
 * WeeklyGoalList Component
 * List of weekly goals grouped by status
 */

import styled from 'styled-components';
import { WeeklyGoalCard } from './WeeklyGoalCard';
import type { WeeklyGoal } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface WeeklyGoalListProps {
  goals: WeeklyGoal[];
  onEdit: (goal: WeeklyGoal) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GoalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
`;

export function WeeklyGoalList({
  goals,
  onEdit,
  onDelete,
  onComplete,
  onUpdateProgress,
}: WeeklyGoalListProps) {
  const { t } = useTranslation();
  // Group goals by status
  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  if (goals.length === 0) {
    return (
      <EmptyState>
        <p>{t('weekly.goal_list.empty_title')}</p>
        <p>{t('weekly.goal_list.empty_desc')}</p>
      </EmptyState>
    );
  }

  return (
    <Container>
      {activeGoals.length > 0 && (
        <Section>
          <SectionTitle>
            {t('weekly.goal_list.active_with_count', { count: activeGoals.length })}
          </SectionTitle>
          <GoalGrid>
            {activeGoals.map((goal) => (
              <WeeklyGoalCard
                key={goal.id}
                goal={goal}
                onEdit={onEdit}
                onDelete={onDelete}
                onComplete={onComplete}
                onUpdateProgress={onUpdateProgress}
              />
            ))}
          </GoalGrid>
        </Section>
      )}

      {completedGoals.length > 0 && (
        <Section>
          <SectionTitle>
            {t('weekly.goal_list.completed_with_count', { count: completedGoals.length })}
          </SectionTitle>
          <GoalGrid>
            {completedGoals.map((goal) => (
              <WeeklyGoalCard
                key={goal.id}
                goal={goal}
                onEdit={onEdit}
                onDelete={onDelete}
                onComplete={onComplete}
                onUpdateProgress={onUpdateProgress}
              />
            ))}
          </GoalGrid>
        </Section>
      )}
    </Container>
  );
}

export default WeeklyGoalList;
