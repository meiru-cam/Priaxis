/**
 * WeeklyGoalFormModal Component
 * Modal for creating and editing weekly goals
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal, ImeSafeInputBase, ImeSafeTextareaBase } from '../../../components/ui';
import type { WeeklyGoal, Importance, MainQuest } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface WeeklyGoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: Partial<WeeklyGoal>) => void;
  goal?: WeeklyGoal | null;
  mainQuests?: MainQuest[];
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
  min-height: 80px;
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

const DateInfo = styled.div`
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const QuestSelector = styled.div`
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  padding: 8px;
`;

const QuestOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  input {
    cursor: pointer;
  }
`;

const NoQuestsMessage = styled.div`
  padding: 12px;
  text-align: center;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`;

// Helper to get current week's Monday
function getWeekMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get current week's Sunday
function getWeekSunday(date: Date = new Date()): Date {
  const monday = getWeekMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

export function WeeklyGoalFormModal({
  isOpen,
  onClose,
  onSubmit,
  goal,
  mainQuests = [],
}: WeeklyGoalFormModalProps) {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<Importance>('medium');
  const [progress, setProgress] = useState(0);
  const [linkedQuestIds, setLinkedQuestIds] = useState<string[]>([]);

  // Calculate week dates
  const weekMonday = getWeekMonday();
  const weekSunday = getWeekSunday();

  // Filter active quests
  const activeQuests = mainQuests.filter((q) => q.status === 'active' || q.status === 'paused');

  // Reset form when modal opens
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setDescription(goal.description || '');
      setImportance(goal.importance);
      setProgress(goal.progress);
      setLinkedQuestIds(goal.linkedQuestIds || []);
    } else {
      setName('');
      setDescription('');
      setImportance('medium');
      setProgress(0);
      setLinkedQuestIds([]);
    }
  }, [isOpen, goal?.id]);

  const toggleQuestLink = (questId: string) => {
    setLinkedQuestIds((prev) =>
      prev.includes(questId)
        ? prev.filter((id) => id !== questId)
        : [...prev, questId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    // If quests are linked, inherit the highest importance
    let finalImportance = importance;
    if (linkedQuestIds.length > 0) {
      const linkedQuests = mainQuests.filter((q) => linkedQuestIds.includes(q.id));
      const hasHighImportance = linkedQuests.some((q) => q.importance === 'high');
      const hasMediumImportance = linkedQuests.some((q) => q.importance === 'medium');
      if (hasHighImportance) finalImportance = 'high';
      else if (hasMediumImportance) finalImportance = 'medium';
    }

    const goalData: Partial<WeeklyGoal> = {
      name: name.trim(),
      description: description.trim() || undefined,
      importance: finalImportance,
      progress: goal ? progress : 0,
      status: goal?.status || 'active',
      weekStartDate: goal?.weekStartDate || weekMonday.toISOString(),
      deadline: goal?.deadline || weekSunday.toISOString(),
      linkedQuestIds: linkedQuestIds.length > 0 ? linkedQuestIds : undefined,
    };

    onSubmit(goalData);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={goal ? t('weekly.goal_form.edit_title') : t('weekly.goal_form.create_title')}
      size="md"
    >
      <Form onSubmit={handleSubmit}>
        <DateInfo>
          {t('weekly.goal_form.this_week', {
            start: formatDate(weekMonday),
            end: formatDate(weekSunday),
          })}
        </DateInfo>

        <FormGroup>
          <Label htmlFor="weekly-goal-name">{t('weekly.goal_form.name_label')}</Label>
          <Input
            id="weekly-goal-name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('weekly.goal_form.name_placeholder')}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="weekly-goal-description">{t('weekly.goal_form.description_label')}</Label>
          <Textarea
            id="weekly-goal-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('weekly.goal_form.description_placeholder')}
          />
        </FormGroup>

        <FormGroup>
          <GroupLabel id="weekly-goal-linked-quests-label">
            {linkedQuestIds.length > 0
              ? t('weekly.goal_form.linked_quests_with_count', { count: linkedQuestIds.length })
              : t('weekly.goal_form.linked_quests')}
          </GroupLabel>
          {activeQuests.length === 0 ? (
            <NoQuestsMessage>{t('weekly.goal_form.no_active_quests')}</NoQuestsMessage>
          ) : (
            <QuestSelector aria-labelledby="weekly-goal-linked-quests-label">
              {activeQuests.map((quest) => (
                <QuestOption key={quest.id}>
                  <input
                    type="checkbox"
                    id={`quest-${quest.id}`}
                    name={`quest-${quest.id}`}
                    autoComplete="off"
                    checked={linkedQuestIds.includes(quest.id)}
                    onChange={() => toggleQuestLink(quest.id)}
                  />
                  <span>
                    {quest.importance === 'high' ? '🔴' : quest.importance === 'medium' ? '🟡' : '🟢'}
                    {' '}{quest.title}
                  </span>
                </QuestOption>
              ))}
            </QuestSelector>
          )}
        </FormGroup>

        <FormRow>
          <FormGroup>
            <Label htmlFor="weekly-goal-importance">
              {linkedQuestIds.length > 0
                ? t('weekly.goal_form.importance_inherited')
                : t('weekly.goal_form.importance')}
            </Label>
            <Select
              id="weekly-goal-importance"
              name="importance"
              value={importance}
              onChange={(e) => setImportance(e.target.value as Importance)}
              disabled={linkedQuestIds.length > 0}
            >
              <option value="high">{t('quest.filter_high')}</option>
              <option value="medium">{t('quest.filter_medium')}</option>
              <option value="low">{t('quest.filter_low')}</option>
            </Select>
          </FormGroup>
          {goal && (
            <FormGroup>
              <Label htmlFor="weekly-goal-progress">{t('weekly.goal_form.current_progress', { progress })}</Label>
              <Input
                id="weekly-goal-progress"
                name="progress"
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
              />
            </FormGroup>
          )}
        </FormRow>

        <ButtonRow>
          <Button type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" $variant="primary">
            {goal ? t('common.save') : t('common.create')}
          </Button>
        </ButtonRow>
      </Form>
    </Modal>
  );
}

export default WeeklyGoalFormModal;
