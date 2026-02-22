/**
 * ChapterFormModal Component
 * Modal for editing individual chapters
 */

import { useEffect } from 'react';
import styled from 'styled-components';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ImeSafeInputBase, ImeSafeTextareaBase, ModalFormSection, ModalFormSectionTitle } from '../../../components/ui';
import type { Chapter, Importance } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { getAutoChapterBaseStatus, getChapterDisplayStatus, type ChapterDisplayStatus } from '../../../lib/chapter-status';
import { MODAL_FORM_TOKENS } from '../../../styles/modalFormTokens';

interface ChapterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chapterData: Partial<Chapter>) => void;
  chapter?: Chapter | null;
}

const chapterFormSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string(),
  progress: z.string(),
  deadline: z.string(),
  unlockTime: z.string(),
  rewardTitle: z.string(),
  rewardXP: z.string(),
  importance: z.enum(['low', 'medium', 'high']),
  context: z.string(),
  motivation: z.string(),
});

type ChapterFormValues = z.infer<typeof chapterFormSchema>;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${MODAL_FORM_TOKENS.formGap};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${MODAL_FORM_TOKENS.formGroupGap};
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

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}1a`};
  color: ${({ $color }) => $color};
  font-size: 0.9rem;
  font-weight: 600;
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
  gap: ${MODAL_FORM_TOKENS.formRowGap};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ProgressSection = styled.div`
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ProgressLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ProgressValue = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ProgressBarWrapper = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: #8b5cf6;
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ProgressControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressButton = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressInput = styled(ImeSafeInputBase)`
  width: 60px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  text-align: center;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
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

function sanitizeInRange(input: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(input, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function buildDefaultValues(chapter?: Chapter | null): ChapterFormValues {
  if (!chapter) {
    return {
      title: '',
      description: '',
      progress: '0',
      deadline: '',
      unlockTime: '',
      rewardTitle: '',
      rewardXP: '0',
      importance: 'medium',
      context: '',
      motivation: '',
    };
  }

  return {
    title: chapter.title || '',
    description: chapter.description || '',
    progress: String(chapter.progress || 0),
    deadline: chapter.deadline || '',
    unlockTime: chapter.unlockTime || '',
    rewardTitle: chapter.rewardTitle || '',
    rewardXP: String(chapter.rewardXP || 0),
    importance: chapter.importance || 'medium',
    context: chapter.context || '',
    motivation: chapter.motivation || '',
  };
}

export function ChapterFormModal({
  isOpen,
  onClose,
  onSubmit,
  chapter,
}: ChapterFormModalProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    control,
  } = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterFormSchema),
    defaultValues: buildDefaultValues(chapter),
  });

  const progress = useWatch({ control, name: 'progress' });
  const deadline = useWatch({ control, name: 'deadline' });
  const unlockTime = useWatch({ control, name: 'unlockTime' });
  const consequenceLike = useWatch({ control, name: 'motivation' });

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues(chapter));
    setTimeout(() => setFocus('title'), 0);
  }, [isOpen, chapter?.id, reset, setFocus, chapter]);

  const submitForm = (values: ChapterFormValues) => {
    if (!values.title.trim()) return;

    const progressValue = sanitizeInRange(values.progress, 0, 100, 0);
    const rewardXPValue = sanitizeInRange(values.rewardXP, 0, 999999, 0);

    const chapterData: Partial<Chapter> = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      progress: progressValue,
      deadline: values.deadline || undefined,
      unlockTime: values.unlockTime || undefined,
      rewardTitle: values.rewardTitle.trim() || undefined,
      rewardXP: rewardXPValue > 0 ? rewardXPValue : undefined,
      importance: values.importance as Importance,
      context: values.context.trim() || undefined,
      motivation: values.motivation.trim() || undefined,
    };

    const fallbackStatus = chapter?.status ?? 'active';
    chapterData.status = getAutoChapterBaseStatus({
      status: fallbackStatus,
      deadline: chapterData.deadline,
      unlockTime: chapterData.unlockTime,
      completedAt: chapter?.completedAt,
      progress: progressValue,
    });

    onSubmit(chapterData);
    onClose();
  };

  const submitWithValidation = () => {
    void handleSubmit(submitForm)();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        submitWithValidation();
      }
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [isOpen]);

  const handleProgressChange = (delta: number) => {
    const current = sanitizeInRange(progress || '0', 0, 100, 0);
    const next = Math.max(0, Math.min(100, current + delta));
    setValue('progress', String(next), { shouldDirty: true });
  };

  const previewStatus: ChapterDisplayStatus = getChapterDisplayStatus({
    status: chapter?.status ?? 'active',
    unlockTime: unlockTime || undefined,
    deadline: deadline || undefined,
    completedAt: chapter?.completedAt,
    progress: sanitizeInRange(progress || '0', 0, 100, 0),
  });
  const previewStatusConfig: Record<ChapterDisplayStatus, { icon: string; color: string; label: string }> = {
    active: { icon: '🟢', color: '#10b981', label: t('quest.status.active') },
    paused: { icon: '⏸️', color: '#f59e0b', label: t('quest.status.paused') },
    completed: { icon: '✅', color: '#3b82f6', label: t('quest.status.completed') },
    locked: { icon: '🔒', color: '#9ca3af', label: t('quest.status.locked') },
    overdue_unfinished: { icon: '⚠️', color: '#ef4444', label: t('chapter.status.overdue_unfinished') },
    overdue_completed: { icon: '🕘', color: '#f97316', label: t('chapter.status.overdue_completed') },
  };
  const preview = previewStatusConfig[previewStatus];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={chapter ? t('chapter.form.edit_title') : t('chapter.form.create_title')}
      size="lg"
    >
      <Form onSubmit={handleSubmit(submitForm)}>
        <ModalFormSection>
          <ModalFormSectionTitle>{t('chapter.form.edit_title')}</ModalFormSectionTitle>
          <FormGroup>
            <Label htmlFor="chapter-title">{t('chapter.form.title_label')}</Label>
            <Input
              id="chapter-title"
              type="text"
              placeholder={t('chapter.form.title_placeholder')}
              required
              {...register('title')}
            />
          </FormGroup>

          <FormGroup style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="chapter-context">{t('chapter.form.context_label')}</Label>
            <Textarea
              id="chapter-context"
              placeholder={t('chapter.form.context_placeholder')}
              style={{ minHeight: '60px' }}
              {...register('context')}
            />
          </FormGroup>

          <FormGroup style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="chapter-description">{t('chapter.form.description_label')}</Label>
            <Textarea
              id="chapter-description"
              placeholder={t('chapter.form.description_placeholder')}
              {...register('description')}
            />
          </FormGroup>
        </ModalFormSection>

        <ModalFormSection>
          <ModalFormSectionTitle>{t('chapter.form.status_label')}</ModalFormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label htmlFor="chapter-importance">{t('chapter.form.importance_label')}</Label>
              <Select id="chapter-importance" {...register('importance')}>
                <option value="high">{t('quest.filter_high')}</option>
                <option value="medium">{t('quest.filter_medium')}</option>
                <option value="low">{t('quest.filter_low')}</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <GroupLabel>{t('chapter.form.status_label')}</GroupLabel>
              <StatusBadge $color={preview.color}>
                <span>{preview.icon}</span>
                <span>{preview.label}</span>
              </StatusBadge>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                {t('chapter.form.status_auto_help')}
              </span>
            </FormGroup>
          </FormRow>

          <FormRow style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <FormGroup>
              <Label htmlFor="chapter-deadline">{t('chapter.form.deadline_label')}</Label>
              <Input
                id="chapter-deadline"
                type="date"
                {...register('deadline')}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="chapter-unlock-time">{t('chapter.form.unlock_time_label')}</Label>
              <Input
                id="chapter-unlock-time"
                type="date"
                {...register('unlockTime')}
              />
              <span style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                {t('chapter.form.unlock_help')}
              </span>
            </FormGroup>
          </FormRow>
        </ModalFormSection>

        <ModalFormSection>
          <ModalFormSectionTitle>{t('chapter.form.motivation_label')}</ModalFormSectionTitle>
          <FormGroup>
            <Label htmlFor="chapter-motivation">{t('chapter.form.motivation_label')}</Label>
            <Input
              id="chapter-motivation"
              type="text"
              placeholder={t('chapter.form.motivation_placeholder')}
              style={{ borderColor: consequenceLike ? '#fca5a5' : undefined }}
              {...register('motivation')}
            />
          </FormGroup>

          <FormRow style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <FormGroup>
              <Label htmlFor="chapter-reward-title">{t('chapter.form.reward_title_label')}</Label>
              <Input
                id="chapter-reward-title"
                type="text"
                placeholder={t('chapter.form.reward_title_placeholder')}
                {...register('rewardTitle')}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="chapter-reward-xp">{t('chapter.form.reward_xp_label')}</Label>
              <Input
                id="chapter-reward-xp"
                type="number"
                min={0}
                placeholder="0"
                {...register('rewardXP')}
              />
            </FormGroup>
          </FormRow>
        </ModalFormSection>

        {chapter && (
          <ProgressSection>
            <ProgressHeader>
              <ProgressLabel>{t('chapter.form.progress_label')}</ProgressLabel>
              <ProgressValue>{sanitizeInRange(progress || '0', 0, 100, 0)}%</ProgressValue>
            </ProgressHeader>
            <ProgressBarWrapper>
              <ProgressBar $progress={sanitizeInRange(progress || '0', 0, 100, 0)} />
            </ProgressBarWrapper>
            <ProgressControls>
              <ProgressButton
                type="button"
                onClick={() => handleProgressChange(-5)}
                disabled={sanitizeInRange(progress || '0', 0, 100, 0) <= 0}
              >
                -
              </ProgressButton>
              <ProgressInput
                type="number"
                min={0}
                max={100}
                placeholder="0"
                {...register('progress')}
              />
              <ProgressButton
                type="button"
                onClick={() => handleProgressChange(5)}
                disabled={sanitizeInRange(progress || '0', 0, 100, 0) >= 100}
              >
                +
              </ProgressButton>
            </ProgressControls>
          </ProgressSection>
        )}

        <ButtonRow>
          <Button type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" $variant="primary">
            {chapter ? t('common.save') : t('common.create')}
          </Button>
        </ButtonRow>
      </Form>
    </Modal>
  );
}

export default ChapterFormModal;
