/**
 * HabitFormModal Component
 * Modal for creating and editing habits
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { Modal, ImeSafeInputBase, ImeSafeTextareaBase } from '../../../components/ui';
import { useEffectiveTheme } from '../../../stores/ui-store';
import type { Habit } from '../../../types/task';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (habitData: Partial<Habit>) => void;
  habit?: Habit | null;
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const GroupLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Input = styled(ImeSafeInputBase)`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.input.placeholder};
  }
`;

const Textarea = styled(ImeSafeTextareaBase)`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 1rem;
  resize: vertical;
  min-height: 60px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.input.placeholder};
  }
`;

const Select = styled.select`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant, theme }) =>
    $variant === 'primary'
      ? `
          background: ${theme.colors.accent.purple};
          color: white;

          &:hover {
            background: ${theme.colors.accent.purple}e6;
          }
        `
      : `
          background: ${theme.colors.bg.tertiary};
          color: ${theme.colors.text.secondary};

          &:hover {
            background: ${theme.colors.bg.secondary};
          }
        `}
`;

const EmojiContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SelectedEmojiPreview = styled.button`
  width: 60px;
  height: 60px;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    background: ${({ theme }) => theme.colors.bg.secondary};
  }
`;

const FrequencySelector = styled.div`
  display: flex;
  gap: 8px;
`;

const FrequencyButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px;
  border: 1px solid ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 8px;
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;



// Move CATEGORIES inside component to use translation hook


export function HabitFormModal({
  isOpen,
  onClose,
  onSubmit,
  habit,
}: HabitFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('💪');
  const [category, setCategory] = useState('');
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly'>('daily');
  const [targetPerDay, setTargetPerDay] = useState<number | string>(1);
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState<number | string>(7);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { t } = useTranslation();
  const theme = useEffectiveTheme();

  const categories: { value: string; label: string }[] = [
    { value: 'health', label: t('recurring.cat_health') },
    { value: 'productivity', label: t('recurring.cat_productivity') },
    { value: 'mindfulness', label: t('recurring.cat_mindfulness') },
    { value: 'learning', label: t('recurring.cat_learning') },
    { value: 'fitness', label: t('recurring.cat_fitness') },
    { value: 'social', label: t('recurring.cat_social') },
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description || '');
      setEmoji(habit.emoji || '💪');
      setCategory(habit.category || '');
      setFrequencyType(habit.frequencyType);
      setTargetPerDay(habit.targetPerDay || 1);
      setTargetDaysPerWeek(habit.targetDaysPerWeek || 7);
    } else {
      setName('');
      setDescription('');
      setEmoji('💪');
      setCategory('');
      setFrequencyType('daily');
      setTargetPerDay(1);
      setTargetDaysPerWeek(7);
    }
  }, [isOpen, habit?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const habitData: Partial<Habit> = {
      name: name.trim(),
      description: description.trim() || undefined,
      emoji,
      category: category || undefined,
      frequencyType,
      targetPerDay: frequencyType === 'daily' ? (Number(targetPerDay) || 1) : undefined,
      targetDaysPerWeek: frequencyType === 'weekly' ? (Number(targetDaysPerWeek) || 1) : undefined,
      active: true,
    };

    onSubmit(habitData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={habit ? t('recurring.habit_edit') : t('recurring.habit_create')}
      size="md"
    >
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="habit-name">{t('recurring.habit_name')}</Label>
          <Input
            id="habit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('recurring.habit_name_placeholder')}
            required
          />
        </FormGroup>

        <FormGroup>
          <GroupLabel>{t('recurring.icon_select')}</GroupLabel>
          <EmojiContainer
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SelectedEmojiPreview type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                {emoji}
              </SelectedEmojiPreview>
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                {showEmojiPicker ? t('recurring.icon_collapse') : t('recurring.icon_expand')}
              </span>
            </div>

            {showEmojiPicker && (
              <EmojiPicker
                onEmojiClick={(emojiData: EmojiClickData) => {
                  setEmoji(emojiData.emoji);
                  setShowEmojiPicker(false);
                }}
                autoFocusSearch={false}
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                width="100%"
                height={350}
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={false}
              />
            )}
          </EmojiContainer>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="habit-description">{t('recurring.desc_optional')}</Label>
          <Textarea
            id="habit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('recurring.desc_placeholder')}
          />
        </FormGroup>

        <FormGroup>
          <GroupLabel>{t('recurring.freq_type')}</GroupLabel>
          <FrequencySelector role="radiogroup" aria-label={t('recurring.freq_type')}>
            <FrequencyButton
              id="freq-daily"
              type="button"
              $active={frequencyType === 'daily'}
              onClick={() => setFrequencyType('daily')}
              aria-pressed={frequencyType === 'daily'}
            >
              {t('recurring.freq_daily_label')}
            </FrequencyButton>
            <FrequencyButton
              id="freq-weekly"
              type="button"
              $active={frequencyType === 'weekly'}
              onClick={() => setFrequencyType('weekly')}
              aria-pressed={frequencyType === 'weekly'}
            >
              {t('recurring.freq_weekly_label')}
            </FrequencyButton>
          </FrequencySelector>
        </FormGroup>

        <FormRow>
          {frequencyType === 'daily' ? (
            <FormGroup>
              <Label htmlFor="habit-target-per-day">{t('recurring.target_daily')}</Label>
              <Input
                id="habit-target-per-day"
                type="number"
                min="1"
                max="50"
                value={targetPerDay}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setTargetPerDay('');
                  else {
                    const num = parseInt(val);
                    if (!isNaN(num)) setTargetPerDay(num);
                  }
                }}
                onBlur={() => {
                  let val = Number(targetPerDay);
                  if (isNaN(val) || val < 1) val = 1;
                  if (val > 50) val = 50;
                  setTargetPerDay(val);
                }}
              />
            </FormGroup>
          ) : (
            <FormGroup>
              <Label htmlFor="habit-target-days-per-week">{t('recurring.target_weekly')}</Label>
              <Input
                id="habit-target-days-per-week"
                type="number"
                min="1"
                max="7"
                value={targetDaysPerWeek}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setTargetDaysPerWeek('');
                  else {
                    const num = parseInt(val);
                    if (!isNaN(num)) setTargetDaysPerWeek(num);
                  }
                }}
                onBlur={() => {
                  let val = Number(targetDaysPerWeek);
                  if (isNaN(val) || val < 1) val = 1;
                  if (val > 7) val = 7;
                  setTargetDaysPerWeek(val);
                }}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="habit-category">{t('recurring.category')}</Label>
            <Select id="habit-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t('recurring.category_select')}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>

        <ButtonRow>
          <Button type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" $variant="primary">
            {habit ? t('common.save') : t('common.create')}
          </Button>
        </ButtonRow>
      </Form>
    </Modal>
  );
}

export default HabitFormModal;
