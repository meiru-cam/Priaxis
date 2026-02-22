/**
 * WeeklyReviewTab Component
 * 周回顾页面 - 记录每周的成就、挑战和下周计划
 */

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Button, ImeSafeInputBase, ImeSafeTextareaBase } from '../../../components/ui';
import { useJournalStore } from '../../../stores/journal-store';
import { useGameStore } from '../../../stores/game-store';
import type { WeeklyReview } from '../../../types/journal';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { sumTaskFocusMinutes } from '../../../lib/focus-time';

// ==================== Styled Components ====================

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const FormContainer = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TextArea = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ListInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ListItem = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Input = styled(ImeSafeInputBase)`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const IconButton = styled.button`
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const RatingRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const RatingOption = styled.button<{ $selected: boolean }>`
  padding: 10px 16px;
  border: 1px solid ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: 8px;
  background: ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.primary : theme.colors.bg.secondary};
  color: ${({ theme, $selected }) =>
        $selected ? 'white' : theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ReviewList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ReviewCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ReviewDate = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ReviewStats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ReviewContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ReviewSection = styled.div``;

const ReviewSectionTitle = styled.h4`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: 0 0 8px 0;
`;

const ReviewItemList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
`;

// ==================== Helper Functions ====================

function getWeekRange(date: Date = new Date()): { start: Date; end: Date; label: string } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一开始
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

export function WeeklyReviewTab() {
    const { t, language } = useTranslation();
    const weeklyReviews = useJournalStore((s) => s.weeklyReviews);
    const addWeeklyReview = useJournalStore((s) => s.addWeeklyReview);
    const tasks = useGameStore((s) => s.customTasks);

    const [isEditing, setIsEditing] = useState(false);
    const [highlights, setHighlights] = useState<string[]>(['']);
    const [challenges, setChallenges] = useState<string[]>(['']);
    const [learnings, setLearnings] = useState<string[]>(['']);
    const [gratitude, setGratitude] = useState<string[]>(['']);
    const [nextWeekGoals, setNextWeekGoals] = useState<string[]>(['']);
    const [nextWeekFocus, setNextWeekFocus] = useState('');
    const [satisfaction, setSatisfaction] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [mood, setMood] = useState<WeeklyReview['mood']>('good');
    const [energyLevel, setEnergyLevel] = useState<WeeklyReview['energyLevel']>('medium');

    const weekRange = useMemo(() => getWeekRange(), []);

    // 计算本周统计
    const weekStats = useMemo(() => {
        const weekStart = weekRange.start.toISOString();
        const weekEnd = weekRange.end.toISOString();

        const weekTasks = tasks.filter((t) => {
            const completed = t.completedAt;
            return completed && completed >= weekStart && completed <= weekEnd;
        });

        return {
            completed: weekTasks.length,
            created: tasks.filter((t) => {
                const created = t.createdAt || '';
                return created >= weekStart && created <= weekEnd;
            }).length,
            focusTime: sumTaskFocusMinutes(weekTasks),
            completionRate: tasks.length > 0
                ? Math.round((weekTasks.length / tasks.filter(t => !t.completed).length) * 100) || 0
                : 0,
        };
    }, [tasks, weekRange]);

    const handleAddItem = (list: string[], setList: (v: string[]) => void) => {
        setList([...list, '']);
    };

    const handleUpdateItem = (list: string[], setList: (v: string[]) => void, index: number, value: string) => {
        const newList = [...list];
        newList[index] = value;
        setList(newList);
    };

    const handleRemoveItem = (list: string[], setList: (v: string[]) => void, index: number) => {
        setList(list.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        const review: WeeklyReview = {
            id: `wr_${Date.now()}`,
            weekStartDate: weekRange.start.toISOString(),
            weekEndDate: weekRange.end.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                tasksCompleted: weekStats.completed,
                tasksCreated: weekStats.created,
                completionRate: weekStats.completionRate,
                focusTimeMinutes: weekStats.focusTime,
                pomodoroSessions: 0,
            },
            highlights: highlights.filter(Boolean),
            challenges: challenges.filter(Boolean),
            learnings: learnings.filter(Boolean),
            gratitude: gratitude.filter(Boolean),
            nextWeekGoals: nextWeekGoals.filter(Boolean),
            nextWeekFocus,
            overallSatisfaction: satisfaction,
            mood,
            energyLevel,
        };

        addWeeklyReview(review);
        setIsEditing(false);

        // Reset form
        setHighlights(['']);
        setChallenges(['']);
        setLearnings(['']);
        setGratitude(['']);
        setNextWeekGoals(['']);
        setNextWeekFocus('');
        setSatisfaction(3);
        setMood('good');
        setEnergyLevel('medium');
    };

    const renderListInput = (
        label: string,
        icon: string,
        list: string[],
        setList: (v: string[]) => void,
        placeholder: string
    ) => (
        <FormSection>
            <SectionTitle>{icon} {label}</SectionTitle>
            <ListInput>
                {list.map((item, index) => (
                    <ListItem key={index}>
                        <Input
                            value={item}
                            onChange={(e) => handleUpdateItem(list, setList, index, e.target.value)}
                            placeholder={placeholder}
                        />
                        {list.length > 1 && (
                            <IconButton onClick={() => handleRemoveItem(list, setList, index)}>✕</IconButton>
                        )}
                    </ListItem>
                ))}
                <Button variant="ghost" size="sm" onClick={() => handleAddItem(list, setList)}>
                    {t('planner.weekly_review.add_more')}
                </Button>
            </ListInput>
        </FormSection>
    );

    return (
        <Container>
            <Header>
                <Title>{t('planner.weekly_review.title')}</Title>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{weekRange.label}</span>
                    {!isEditing && (
                        <Button onClick={() => setIsEditing(true)}>{t('planner.weekly_review.write_this_week')}</Button>
                    )}
                </div>
            </Header>

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

            {isEditing && (
                <FormContainer>
                    {renderListInput(t('planner.weekly_review.highlights_title'), '🌟', highlights, setHighlights, t('planner.weekly_review.highlights_placeholder'))}
                    {renderListInput(t('planner.weekly_review.challenges_title'), '💪', challenges, setChallenges, t('planner.weekly_review.challenges_placeholder'))}
                    {renderListInput(t('planner.weekly_review.learnings_title'), '📚', learnings, setLearnings, t('planner.weekly_review.learnings_placeholder'))}
                    {renderListInput(t('planner.weekly_review.gratitude_title'), '🙏', gratitude, setGratitude, t('planner.weekly_review.gratitude_placeholder'))}

                    <FormSection>
                        <SectionTitle>{t('planner.weekly_review.next_focus_title')}</SectionTitle>
                        <TextArea
                            value={nextWeekFocus}
                            onChange={(e) => setNextWeekFocus(e.target.value)}
                            placeholder={t('planner.weekly_review.next_focus_placeholder')}
                        />
                    </FormSection>

                    {renderListInput(t('planner.weekly_review.next_goals_title'), '📋', nextWeekGoals, setNextWeekGoals, t('planner.weekly_review.next_goals_placeholder'))}

                    <FormSection>
                        <SectionTitle>{t('planner.weekly_review.satisfaction_title')}</SectionTitle>
                        <RatingRow>
                            {([1, 2, 3, 4, 5] as const).map((n) => (
                                <RatingOption key={n} $selected={satisfaction === n} onClick={() => setSatisfaction(n)}>
                                    {'⭐'.repeat(n)}
                                </RatingOption>
                            ))}
                        </RatingRow>
                    </FormSection>

                    <FormSection>
                        <SectionTitle>{t('planner.weekly_review.mood_title')}</SectionTitle>
                        <RatingRow>
                            {(['great', 'good', 'okay', 'low', 'bad'] as const).map((m) => (
                                <RatingOption key={m} $selected={mood === m} onClick={() => setMood(m)}>
                                    {m === 'great' ? t('planner.weekly_review.mood_great') : m === 'good' ? t('planner.weekly_review.mood_good') : m === 'okay' ? t('planner.weekly_review.mood_okay') : m === 'low' ? t('planner.weekly_review.mood_low') : t('planner.weekly_review.mood_bad')}
                                </RatingOption>
                            ))}
                        </RatingRow>
                    </FormSection>

                    <FormSection>
                        <SectionTitle>{t('planner.weekly_review.energy_title')}</SectionTitle>
                        <RatingRow>
                            {(['high', 'medium', 'low'] as const).map((e) => (
                                <RatingOption key={e} $selected={energyLevel === e} onClick={() => setEnergyLevel(e)}>
                                    {e === 'high' ? t('planner.weekly_review.energy_high') : e === 'medium' ? t('planner.weekly_review.energy_medium') : t('planner.weekly_review.energy_low')}
                                </RatingOption>
                            ))}
                        </RatingRow>
                    </FormSection>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSubmit}>{t('planner.weekly_review.save')}</Button>
                    </div>
                </FormContainer>
            )}

            {weeklyReviews.length === 0 ? (
                <EmptyState>
                    <EmptyIcon>📅</EmptyIcon>
                    <p>{t('planner.weekly_review.empty')}</p>
                    <Button onClick={() => setIsEditing(true)}>{t('planner.weekly_review.start')}</Button>
                </EmptyState>
            ) : (
                <ReviewList>
                    {weeklyReviews.map((review) => (
                        <ReviewCard key={review.id}>
                            <ReviewHeader>
                                <ReviewDate>
                                    📅 {new Date(review.weekStartDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')} - {new Date(review.weekEndDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
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
                                            {review.highlights.map((h, i) => <li key={i}>{h}</li>)}
                                        </ReviewItemList>
                                    </ReviewSection>
                                )}
                                {review.challenges.length > 0 && (
                                    <ReviewSection>
                                        <ReviewSectionTitle>{t('planner.weekly_review.review_challenges')}</ReviewSectionTitle>
                                        <ReviewItemList>
                                            {review.challenges.map((c, i) => <li key={i}>{c}</li>)}
                                        </ReviewItemList>
                                    </ReviewSection>
                                )}
                                {review.learnings.length > 0 && (
                                    <ReviewSection>
                                        <ReviewSectionTitle>{t('planner.weekly_review.review_learnings')}</ReviewSectionTitle>
                                        <ReviewItemList>
                                            {review.learnings.map((l, i) => <li key={i}>{l}</li>)}
                                        </ReviewItemList>
                                    </ReviewSection>
                                )}
                                {review.nextWeekGoals.length > 0 && (
                                    <ReviewSection>
                                        <ReviewSectionTitle>{t('planner.weekly_review.review_next_goals')}</ReviewSectionTitle>
                                        <ReviewItemList>
                                            {review.nextWeekGoals.map((g, i) => <li key={i}>{g}</li>)}
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

export default WeeklyReviewTab;
