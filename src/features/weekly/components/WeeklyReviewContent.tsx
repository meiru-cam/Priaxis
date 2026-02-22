/**
 * WeeklyReviewContent Component
 * 周回顾列表 - 显示历史周回顾卡片
 */

import { useMemo } from 'react';
import styled from 'styled-components';
import { useJournalStore } from '../../../stores/journal-store';
import { useGameStore } from '../../../stores/game-store';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { sumTaskFocusMinutes } from '../../../lib/focus-time';

// ==================== Styled Components ====================

const Container = styled.div`
  padding: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ReviewList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ReviewCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ReviewDate = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ReviewStats = styled.div`
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ReviewContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ReviewSection = styled.div``;

const ReviewSectionTitle = styled.h5`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 0 0 6px 0;
`;

const ReviewItemList = styled.ul`
  margin: 0;
  padding-left: 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.85rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 12px;
`;

const HintText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// ==================== Helper Functions ====================

function getWeekRange(date: Date = new Date()): { start: Date; end: Date; label: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const label = `${formatDate(start)} - ${formatDate(end)}`;

  return { start, end, label };
}

// ==================== Component ====================

export function WeeklyReviewContent() {
  const { t, language } = useTranslation();
  const weeklyReviews = useJournalStore((s) => s.weeklyReviews);
  const tasks = useGameStore((s) => s.customTasks);
  const archivedTasks = useGameStore((s) => s.archivedTasks);

  const weekRange = useMemo(() => getWeekRange(), []);

  // 计算本周统计
  const weekStats = useMemo(() => {
    const weekStart = weekRange.start.toISOString();
    const weekEnd = weekRange.end.toISOString();

    const completedTasks = archivedTasks.filter((t) => {
      const completed = t.completedAt;
      return completed && completed >= weekStart && completed <= weekEnd;
    });

    const allTasks = [...tasks, ...archivedTasks];
    const createdTasks = allTasks.filter((t) => {
      const created = t.createdAt || '';
      return created >= weekStart && created <= weekEnd;
    });

    return {
      completed: completedTasks.length,
      created: createdTasks.length,
      focusTime: sumTaskFocusMinutes(completedTasks),
    };
  }, [tasks, archivedTasks, weekRange]);

  return (
    <Container>
      <StatsGrid>
        <StatCard>
          <StatValue>{weekStats.completed}</StatValue>
          <StatLabel>{t('planner.weekly_review.stat_completed')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{weekStats.created}</StatValue>
          <StatLabel>{t('planner.weekly_review.stat_created')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{Math.round(weekStats.focusTime / 60)}h</StatValue>
          <StatLabel>{t('planner.weekly_review.stat_focus')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{weeklyReviews.length}</StatValue>
          <StatLabel>{t('planner.weekly_review.stat_history')}</StatLabel>
        </StatCard>
      </StatsGrid>

      {weeklyReviews.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📝</EmptyIcon>
          <p>{t('planner.weekly_review.empty')}</p>
          <HintText>{t('weekly.review_content.empty_hint')}</HintText>
        </EmptyState>
      ) : (
        <ReviewList>
          {weeklyReviews.map((review) => (
            <ReviewCard key={review.id}>
              <ReviewHeader>
                <ReviewDate>
                  {new Date(review.weekStartDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })} - {new Date(review.weekEndDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                </ReviewDate>
                <ReviewStats>
                  <span>{t('planner.weekly_review.completed_tasks', { count: review.stats.tasksCompleted })}</span>
                  <span>{'⭐'.repeat(review.overallSatisfaction)}</span>
                </ReviewStats>
              </ReviewHeader>
              <ReviewContent>
                {review.highlights.length > 0 && (
                  <ReviewSection>
                    <ReviewSectionTitle>{t('planner.weekly_review.review_highlights')}</ReviewSectionTitle>
                    <ReviewItemList>
                      {review.highlights.slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}
                    </ReviewItemList>
                  </ReviewSection>
                )}
                {review.challenges.length > 0 && (
                  <ReviewSection>
                    <ReviewSectionTitle>{t('planner.weekly_review.review_challenges')}</ReviewSectionTitle>
                    <ReviewItemList>
                      {review.challenges.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}
                    </ReviewItemList>
                  </ReviewSection>
                )}
              </ReviewContent>
            </ReviewCard>
          ))}
        </ReviewList>
      )}
    </Container>
  );
}

export default WeeklyReviewContent;
