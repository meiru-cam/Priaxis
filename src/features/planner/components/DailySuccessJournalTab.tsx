/**
 * DailySuccessJournalTab Component
 * 每日成功日记页面 - 记录每天的成功、感恩和心情
 */

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Button, ImeSafeTextareaBase } from '../../../components/ui';
import { useJournalStore } from '../../../stores/journal-store';
import type { DailySuccessEntry } from '../../../types/journal';
import { useTranslation } from '../../../lib/i18n/useTranslation';

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

const TodayCard = styled.div`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.accent.purple}15, 
    ${({ theme }) => theme.colors.accent.gold}15);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const TodayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const DateLabel = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
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

const SuccessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SuccessCard = styled.div<{ $hasContent: boolean }>`
  background: ${({ theme, $hasContent }) =>
        $hasContent ? theme.colors.bg.card : theme.colors.bg.secondary};
  border: 2px dashed ${({ theme, $hasContent }) =>
        $hasContent ? theme.colors.accent.primary : theme.colors.border.secondary};
  border-radius: 12px;
  padding: 16px;
  min-height: 120px;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SuccessNumber = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: 8px;
`;

const SuccessInput = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  resize: none;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const CategorySelect = styled.select`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8rem;
  margin-top: 8px;
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

const MoodRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const MoodButton = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border: 2px solid ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: 12px;
  background: ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.primary + '20' : theme.colors.bg.secondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: scale(1.05);
  }
`;

const MoodEmoji = styled.span`
  font-size: 1.5rem;
`;

const MoodLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const HistorySection = styled.div`
  margin-top: 32px;
`;

const HistoryTitle = styled.h3`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 16px 0;
`;

const HistoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const HistoryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const HistoryDate = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HistoryMood = styled.span`
  font-size: 1.2rem;
`;

const HistorySuccesses = styled.ul`
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const HistoryGratitude = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SavedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.status.success.text};
  font-size: 0.9rem;
`;

// ==================== Component ====================

export function DailySuccessJournalTab() {
    const { t, language } = useTranslation();
    const dailySuccessJournal = useJournalStore((s) => s.dailySuccessJournal);
    const addDailyEntry = useJournalStore((s) => s.addDailyEntry);
    const updateDailyEntry = useJournalStore((s) => s.updateDailyEntry);
    const getTodayEntry = useJournalStore((s) => s.getTodayEntry);

    const todayEntry = getTodayEntry();
    const today = new Date().toISOString().split('T')[0];

    type SuccessItem = { content: string; category?: DailySuccessEntry['successes'][0]['category']; };
    const [successes, setSuccesses] = useState<SuccessItem[]>(
        todayEntry?.successes || [{ content: '' }, { content: '' }, { content: '' }]
    );
    const [gratitude, setGratitude] = useState(todayEntry?.gratitude?.join('\n') || '');
    const [affirmation, setAffirmation] = useState(todayEntry?.affirmation || '');
    const [mood, setMood] = useState<DailySuccessEntry['mood']>(todayEntry?.mood || 'good');
    const [moodNote, setMoodNote] = useState(todayEntry?.moodNote || '');

    const MOODS = [
        { value: 'great' as const, emoji: '😄', label: t('planner.daily_success.mood_great') },
        { value: 'good' as const, emoji: '🙂', label: t('planner.daily_success.mood_good') },
        { value: 'okay' as const, emoji: '😐', label: t('planner.daily_success.mood_okay') },
        { value: 'low' as const, emoji: '😔', label: t('planner.daily_success.mood_low') },
        { value: 'bad' as const, emoji: '😢', label: t('planner.daily_success.mood_bad') },
    ];

    const CATEGORIES = [
        { value: 'work', label: t('planner.daily_success.category_work') },
        { value: 'health', label: t('planner.daily_success.category_health') },
        { value: 'relationships', label: t('planner.daily_success.category_relationships') },
        { value: 'personal', label: t('planner.daily_success.category_personal') },
        { value: 'learning', label: t('planner.daily_success.category_learning') },
        { value: 'other', label: t('planner.daily_success.category_other') },
    ];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    };

    const handleUpdateSuccess = (index: number, field: keyof SuccessItem, value: string) => {
        const newSuccesses = [...successes];
        if (field === 'content') {
            newSuccesses[index] = { ...newSuccesses[index], content: value };
        } else if (field === 'category') {
            newSuccesses[index] = { ...newSuccesses[index], category: value as SuccessItem['category'] };
        }
        setSuccesses(newSuccesses);
    };

    const handleSave = () => {
        const entry: DailySuccessEntry = {
            id: todayEntry?.id || `ds_${Date.now()}`,
            date: today,
            createdAt: todayEntry?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            successes: successes.filter(s => s.content.trim()),
            gratitude: gratitude.split('\n').filter(Boolean),
            affirmation,
            mood,
            moodNote,
            energyLevel: 'medium',
        };

        if (todayEntry) {
            updateDailyEntry(todayEntry.id, entry);
        } else {
            addDailyEntry(entry);
        }
    };

    const hasContent = successes.some(s => s.content.trim()) || gratitude.trim() || affirmation.trim();

    // 历史记录（排除今天）
    const historyEntries = useMemo(() =>
        dailySuccessJournal.filter(e => e.date.split('T')[0] !== today).slice(0, 14),
        [dailySuccessJournal, today]
    );

    return (
        <Container>
            <Header>
                <Title>{t('planner.daily_success.title')}</Title>
                {todayEntry && (
                    <SavedBadge>
                        {t('planner.daily_success.saved_badge')}
                    </SavedBadge>
                )}
            </Header>

            <TodayCard>
                <TodayHeader>
                    <DateLabel>📅 {formatDate(today)}</DateLabel>
                    <Button size="sm" onClick={handleSave} disabled={!hasContent}>
                        {todayEntry ? t('planner.daily_success.update') : t('planner.daily_success.save')}
                    </Button>
                </TodayHeader>

                <FormSection>
                    <SectionTitle>{t('planner.daily_success.successes_title')}</SectionTitle>
                    <SuccessGrid>
                        {successes.map((success, index) => (
                            <SuccessCard key={index} $hasContent={!!success.content.trim()}>
                                <SuccessNumber>{t('planner.daily_success.success_item', { index: index + 1 })}</SuccessNumber>
                                <SuccessInput
                                    value={success.content}
                                    onChange={(e) => handleUpdateSuccess(index, 'content', e.target.value)}
                                    placeholder={
                                        index === 0
                                            ? t('planner.daily_success.success_placeholder_1')
                                            : index === 1
                                                ? t('planner.daily_success.success_placeholder_2')
                                                : t('planner.daily_success.success_placeholder_3')
                                    }
                                />
                                <CategorySelect
                                    value={success.category || ''}
                                    onChange={(e) => handleUpdateSuccess(index, 'category', e.target.value)}
                                >
                                    <option value="">{t('planner.daily_success.select_category')}</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </CategorySelect>
                            </SuccessCard>
                        ))}
                    </SuccessGrid>
                </FormSection>

                <FormSection>
                    <SectionTitle>{t('planner.daily_success.gratitude_title')}</SectionTitle>
                    <TextArea
                        value={gratitude}
                        onChange={(e) => setGratitude(e.target.value)}
                        placeholder={t('planner.daily_success.gratitude_placeholder')}
                    />
                </FormSection>

                <FormSection>
                    <SectionTitle>{t('planner.daily_success.affirmation_title')}</SectionTitle>
                    <TextArea
                        value={affirmation}
                        onChange={(e) => setAffirmation(e.target.value)}
                        placeholder={t('planner.daily_success.affirmation_placeholder')}
                        style={{ minHeight: '60px' }}
                    />
                </FormSection>

                <FormSection>
                    <SectionTitle>{t('planner.daily_success.mood_title')}</SectionTitle>
                    <MoodRow>
                        {MOODS.map((m) => (
                            <MoodButton key={m.value} $selected={mood === m.value} onClick={() => setMood(m.value)}>
                                <MoodEmoji>{m.emoji}</MoodEmoji>
                                <MoodLabel>{m.label}</MoodLabel>
                            </MoodButton>
                        ))}
                    </MoodRow>
                    {mood && (
                        <TextArea
                            value={moodNote}
                            onChange={(e) => setMoodNote(e.target.value)}
                            placeholder={t('planner.daily_success.mood_note_placeholder')}
                            style={{ marginTop: '12px', minHeight: '50px' }}
                        />
                    )}
                </FormSection>
            </TodayCard>

            <HistorySection>
                <HistoryTitle>{t('planner.daily_success.history_title')}</HistoryTitle>
                {historyEntries.length === 0 ? (
                    <EmptyState>
                        {t('planner.daily_success.history_empty')}
                    </EmptyState>
                ) : (
                    <HistoryGrid>
                        {historyEntries.map((entry) => (
                            <HistoryCard key={entry.id}>
                                <HistoryDate>
                                    <span>{formatDate(entry.date)}</span>
                                    <HistoryMood>
                                        {MOODS.find(m => m.value === entry.mood)?.emoji || '😊'}
                                    </HistoryMood>
                                </HistoryDate>
                                <HistorySuccesses>
                                    {entry.successes.slice(0, 3).map((s, i) => (
                                        <li key={i}>{s.content}</li>
                                    ))}
                                </HistorySuccesses>
                                {entry.gratitude.length > 0 && (
                                    <HistoryGratitude>
                                        🙏 {entry.gratitude[0]}
                                        {entry.gratitude.length > 1 && t('planner.daily_success.history_more', { count: entry.gratitude.length - 1 })}
                                    </HistoryGratitude>
                                )}
                            </HistoryCard>
                        ))}
                    </HistoryGrid>
                )}
            </HistorySection>
        </Container>
    );
}

export default DailySuccessJournalTab;
