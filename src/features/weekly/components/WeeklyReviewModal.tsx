/**
 * WeeklyReviewModal Component
 * 周回顾 Modal - 用于快速填写周回顾
 */

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Button, Modal, ImeSafeInputBase, ImeSafeTextareaBase } from '../../../components/ui';
import { useJournalStore } from '../../../stores/journal-store';
import { useGameStore } from '../../../stores/game-store';
import type { WeeklyReview } from '../../../types/journal';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { sumTaskFocusMinutes } from '../../../lib/focus-time';

// ==================== Styled Components ====================

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h4`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TextArea = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 60px;
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
  font-size: 1rem;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const RatingRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const RatingOption = styled.button<{ $selected: boolean }>`
  padding: 8px 12px;
  border: 1px solid ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: 8px;
  background: ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.primary : theme.colors.bg.secondary};
  color: ${({ theme, $selected }) =>
        $selected ? 'white' : theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 8px;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

// ==================== Helper Functions ====================

function getWeekRange(): { start: Date; end: Date; label: string } {
    const d = new Date();
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

interface WeeklyReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WeeklyReviewModal({ isOpen, onClose }: WeeklyReviewModalProps) {
    const { t } = useTranslation();
    const addWeeklyReview = useJournalStore((s) => s.addWeeklyReview);
    const tasks = useGameStore((s) => s.customTasks);
    const archivedTasks = useGameStore((s) => s.archivedTasks);

    const [highlights, setHighlights] = useState<string[]>(['']);
    const [challenges, setChallenges] = useState<string[]>(['']);
    const [learnings, setLearnings] = useState<string[]>(['']);
    const [nextWeekGoals, setNextWeekGoals] = useState<string[]>(['']);
    const [nextWeekFocus, setNextWeekFocus] = useState('');
    const [satisfaction, setSatisfaction] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [mood, setMood] = useState<WeeklyReview['mood']>('good');

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
                completionRate: weekStats.created > 0 ? (weekStats.completed / weekStats.created) * 100 : 0,
                focusTimeMinutes: weekStats.focusTime,
                pomodoroSessions: 0,
            },
            highlights: highlights.filter(Boolean),
            challenges: challenges.filter(Boolean),
            learnings: learnings.filter(Boolean),
            gratitude: [],
            nextWeekGoals: nextWeekGoals.filter(Boolean),
            nextWeekFocus,
            overallSatisfaction: satisfaction,
            mood,
            energyLevel: 'medium',
        };

        addWeeklyReview(review);

        // Reset form
        setHighlights(['']);
        setChallenges(['']);
        setLearnings(['']);
        setNextWeekGoals(['']);
        setNextWeekFocus('');
        setSatisfaction(3);
        setMood('good');

        onClose();
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

    const hasContent = highlights.some(Boolean) || challenges.some(Boolean) || learnings.some(Boolean);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('planner.weekly_review.title')} (${weekRange.label})`} size="lg">
            <StatsRow>
                <StatItem>
                    <StatValue>{weekStats.completed}</StatValue>
                    <StatLabel>{t('planner.weekly_review.stat_completed')}</StatLabel>
                </StatItem>
                <StatItem>
                    <StatValue>{weekStats.created}</StatValue>
                    <StatLabel>{t('planner.weekly_review.stat_created')}</StatLabel>
                </StatItem>
                <StatItem>
                    <StatValue>{Math.round(weekStats.focusTime / 60)}h</StatValue>
                    <StatLabel>{t('planner.weekly_review.stat_focus')}</StatLabel>
                </StatItem>
            </StatsRow>

            {renderListInput(t('planner.weekly_review.highlights_title'), '🌟', highlights, setHighlights, t('planner.weekly_review.highlights_placeholder'))}
            {renderListInput(t('planner.weekly_review.challenges_title'), '💪', challenges, setChallenges, t('planner.weekly_review.challenges_placeholder'))}
            {renderListInput(t('planner.weekly_review.learnings_title'), '📚', learnings, setLearnings, t('planner.weekly_review.learnings_placeholder'))}

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
                            {m === 'great' ? '😄' : m === 'good' ? '🙂' : m === 'okay' ? '😐' : m === 'low' ? '😔' : '😢'}
                        </RatingOption>
                    ))}
                </RatingRow>
            </FormSection>

            <Footer>
                <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={handleSubmit} disabled={!hasContent}>{t('planner.weekly_review.save')}</Button>
            </Footer>
        </Modal>
    );
}

export default WeeklyReviewModal;
