/**
 * DailySuccessModal Component
 * 每日成功日记 Modal - 快速记录今天的成功与感恩
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Modal, ImeSafeTextareaBase } from '../../../components/ui';
import { useJournalStore } from '../../../stores/journal-store';
import type { DailySuccessEntry } from '../../../types/journal';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// ==================== Styled Components ====================

const ModalContent = styled.div`
  padding: 0;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SuccessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const SuccessCard = styled.div<{ $hasContent: boolean }>`
  background: ${({ theme, $hasContent }) =>
    $hasContent ? theme.colors.bg.card : theme.colors.bg.secondary};
  border: 2px dashed ${({ theme, $hasContent }) =>
    $hasContent ? theme.colors.accent.primary : theme.colors.border.secondary};
  border-radius: 10px;
  padding: 12px;
  min-height: 80px;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SuccessLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: 6px;
`;

const SuccessInput = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 50px;
  padding: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.85rem;
  resize: none;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const TextArea = styled(ImeSafeTextareaBase)`
  width: 100%;
  min-height: 60px;
  padding: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.85rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const MoodRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MoodButton = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 14px;
  border: 2px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: 10px;
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
  font-size: 1.3rem;
`;

const MoodLabel = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const SavedIndicator = styled.span`
  color: ${({ theme }) => theme.colors.status.success.text};
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

// ==================== Constants ====================

// ==================== Component ====================

interface DailySuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date; // Optional date, defaults to today
}

export function DailySuccessModal({ isOpen, onClose, date }: DailySuccessModalProps) {
  const { t } = useTranslation();
  const addDailyEntry = useJournalStore((s) => s.addDailyEntry);
  const updateDailyEntry = useJournalStore((s) => s.updateDailyEntry);
  const getDailyEntryByDate = useJournalStore((s) => s.getDailyEntryByDate);

  const targetDate = date || new Date();
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const isToday = targetDateStr === new Date().toISOString().split('T')[0];

  const entry = getDailyEntryByDate(targetDateStr);

  type SuccessItem = { content: string; category?: DailySuccessEntry['successes'][0]['category'] };
  const [successes, setSuccesses] = useState<SuccessItem[]>([
    { content: '' },
    { content: '' },
    { content: '' },
  ]);
  const [gratitude, setGratitude] = useState('');
  const [mood, setMood] = useState<DailySuccessEntry['mood']>('good');
  const [saved, setSaved] = useState(false);
  const MOODS = [
    { value: 'great' as const, emoji: '😄', label: t('planner.daily_success.mood_great') },
    { value: 'good' as const, emoji: '🙂', label: t('planner.daily_success.mood_good') },
    { value: 'okay' as const, emoji: '😐', label: t('planner.daily_success.mood_okay') },
    { value: 'low' as const, emoji: '😔', label: t('planner.daily_success.mood_low') },
    { value: 'bad' as const, emoji: '😢', label: t('planner.daily_success.mood_bad') },
  ];

  // Load existing entry when modal opens or date changes
  useEffect(() => {
    if (isOpen && entry) {
      setSuccesses(
        entry.successes.length >= 3
          ? entry.successes.slice(0, 3)
          : [...entry.successes, ...Array(3 - entry.successes.length).fill({ content: '' })]
      );
      setGratitude(entry.gratitude?.join('\n') || '');
      setMood(entry.mood || 'good');
      setSaved(true);
    } else if (isOpen) {
      // Reset for new entry
      setSuccesses([{ content: '' }, { content: '' }, { content: '' }]);
      setGratitude('');
      setMood('good');
      setSaved(false);
    }
  }, [isOpen, entry]); // Depend on entry (which depends on date)

  const handleUpdateSuccess = (index: number, value: string) => {
    const newSuccesses = [...successes];
    newSuccesses[index] = { ...newSuccesses[index], content: value };
    setSuccesses(newSuccesses);
    setSaved(false);
  };

  const handleSave = () => {
    const newEntry: DailySuccessEntry = {
      id: entry?.id || `ds_${targetDateStr}`,
      date: targetDateStr,
      createdAt: entry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      successes: successes.filter((s) => s.content.trim()),
      gratitude: gratitude.split('\n').filter(Boolean),
      affirmation: '',
      mood,
      energyLevel: 'medium',
    };

    if (entry) {
      updateDailyEntry(entry.id, newEntry);
    } else {
      addDailyEntry(newEntry);
    }
    setSaved(true);
  };

  const hasContent = successes.some((s) => s.content.trim()) || gratitude.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isToday ? t('daily.success_modal.today_title') : t('daily.success_modal.date_title', { date: targetDateStr })}
      size="lg"
    >
      <ModalContent>
        <Section>
          <SectionTitle>{t('planner.daily_success.successes_title')}</SectionTitle>
          <SuccessGrid>
            {successes.map((success, index) => (
              <SuccessCard key={index} $hasContent={!!success.content.trim()}>
                <SuccessLabel>{t('planner.daily_success.success_item', { index: index + 1 })}</SuccessLabel>
                <SuccessInput
                  id={`success-${index}`}
                  name={`success-${index}`}
                  value={success.content}
                  onChange={(e) => handleUpdateSuccess(index, e.target.value)}
                  placeholder={
                    index === 0
                      ? t('daily.success_modal.success_placeholder_1')
                      : index === 1
                        ? t('daily.success_modal.success_placeholder_2')
                        : t('daily.success_modal.success_placeholder_3')
                  }
                />
              </SuccessCard>
            ))}
          </SuccessGrid>
        </Section>

        <Section>
          <SectionTitle>{t('daily.success_modal.gratitude_title')}</SectionTitle>
          <TextArea
            id="gratitude"
            name="gratitude"
            value={gratitude}
            onChange={(e) => {
              setGratitude(e.target.value);
              setSaved(false);
            }}
            placeholder={t('planner.daily_success.gratitude_placeholder')}
          />
        </Section>

        <Section>
          <SectionTitle>{t('planner.daily_success.mood_title')}</SectionTitle>
          <MoodRow>
            {MOODS.map((m) => (
              <MoodButton
                key={m.value}
                $selected={mood === m.value}
                onClick={() => {
                  setMood(m.value);
                  setSaved(false);
                }}
              >
                <MoodEmoji>{m.emoji}</MoodEmoji>
                <MoodLabel>{m.label}</MoodLabel>
              </MoodButton>
            ))}
          </MoodRow>
        </Section>

        <Footer>
          {saved && <SavedIndicator>{t('daily.success_modal.saved')}</SavedIndicator>}
          <Button variant="ghost" onClick={onClose}>
            {t('daily.success_modal.close')}
          </Button>
          <Button onClick={handleSave} disabled={!hasContent}>
            {entry ? t('planner.daily_success.update') : t('planner.daily_success.save')}
          </Button>
        </Footer>
      </ModalContent>
    </Modal>
  );
}

export default DailySuccessModal;
