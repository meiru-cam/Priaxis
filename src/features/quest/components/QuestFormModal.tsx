/**
 * QuestFormModal Component
 * Modal for creating and editing quests
 */

import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ImeSafeInputBase, ImeSafeTextareaBase, ModalFormSection, ModalFormSectionTitle, ModalFormDividerSection } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { MainQuest, Importance, ProgressType, Chapter, Season } from '../../../types/task';
import { getEffectiveSeasonStatus, isDateInFuture } from '../../../lib/hierarchy-status';
import { MODAL_FORM_TOKENS } from '../../../styles/modalFormTokens';

interface QuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (questData: Partial<MainQuest>) => void;
  quest?: MainQuest | null;
  seasons?: Season[];
  initialChapterId?: string;
  initialSeasonId?: string;
}

const questFormSchema = z.object({
  title: z.string().trim().min(1),
  context: z.string(),
  definitionOfDone: z.string(),
  progressType: z.enum(['percentage', 'custom']),
  progressCurrent: z.string(),
  progressTotal: z.string(),
  progressUnit: z.string(),
  attainable: z.string(),
  importance: z.enum(['low', 'medium', 'high']),
  linkedChapterId: z.string(),
  linkedSeasonId: z.string(),
  deadline: z.string(),
  unlockTime: z.string(),
  motivation: z.string(),
  consequence: z.string(),
  rewardTitle: z.string(),
  rewardXP: z.string(),
});

type QuestFormValues = z.infer<typeof questFormSchema>;

type ChapterEntry = { chapter: Chapter; season: Season };

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
  min-height: 100px;
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
  gap: ${MODAL_FORM_TOKENS.formRowGap};

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

const ProgressTypeSelector = styled.div`
  display: flex;
  gap: 8px;
`;

const ProgressTypeButton = styled.button<{ $active: boolean }>`
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

const CustomProgressRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

function sanitizeNonNegativeInt(input: string, fallback: number): number {
  const n = Number.parseInt(input, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

function buildDefaultValues(params: {
  quest?: MainQuest | null;
  initialChapterId?: string;
  initialSeasonId?: string;
  allChapters: ChapterEntry[];
}): QuestFormValues {
  const { quest, initialChapterId, initialSeasonId, allChapters } = params;

  if (quest) {
    return {
      title: quest.title,
      context: quest.context || '',
      definitionOfDone: quest.definitionOfDone || '',
      progressType: quest.progressType,
      progressCurrent: String(quest.progressCurrent ?? 0),
      progressTotal: String(quest.progressTotal ?? 100),
      progressUnit: quest.progressUnit || '',
      attainable: quest.attainable || '',
      importance: quest.importance,
      linkedChapterId: quest.linkedChapterId || '',
      linkedSeasonId: quest.seasonId || '',
      deadline: quest.deadline || '',
      unlockTime: quest.unlockTime || '',
      motivation: quest.motivation || '',
      consequence: quest.consequence || '',
      rewardTitle: quest.rewardTitle || '',
      rewardXP: String(quest.rewardXP ?? 0),
    };
  }

  let resolvedSeasonId = initialSeasonId || '';
  if (initialChapterId) {
    const found = allChapters.find((entry) => entry.chapter.id === initialChapterId);
    if (found) resolvedSeasonId = found.season.id;
  }

  return {
    title: '',
    context: '',
    definitionOfDone: '',
    progressType: 'percentage',
    progressCurrent: '0',
    progressTotal: '100',
    progressUnit: '',
    attainable: '',
    importance: 'medium',
    linkedChapterId: initialChapterId || '',
    linkedSeasonId: resolvedSeasonId,
    deadline: '',
    unlockTime: '',
    motivation: '',
    consequence: '',
    rewardTitle: '',
    rewardXP: '0',
  };
}

export function QuestFormModal({
  isOpen,
  onClose,
  onSubmit,
  quest,
  seasons = [],
  initialChapterId,
  initialSeasonId,
}: QuestFormModalProps) {
  const { t } = useTranslation();

  const allChapters = useMemo<ChapterEntry[]>(() => {
    const list: ChapterEntry[] = [];
    seasons.forEach((season) => {
      season.chapters.forEach((chapter) => {
        list.push({ chapter, season });
      });
    });
    return list;
  }, [seasons]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    control,
  } = useForm<QuestFormValues>({
    resolver: zodResolver(questFormSchema),
    defaultValues: buildDefaultValues({ quest, initialChapterId, initialSeasonId, allChapters }),
  });

  const progressType = useWatch({ control, name: 'progressType' });
  const consequence = useWatch({ control, name: 'consequence' });

  // Reset form when modal opens with different quest
  useEffect(() => {
    if (!isOpen) return;
    reset(buildDefaultValues({ quest, initialChapterId, initialSeasonId, allChapters }));
    setTimeout(() => setFocus('title'), 0);
  }, [isOpen, quest?.id, initialChapterId, initialSeasonId, allChapters, reset, setFocus]);

  const submitForm = (values: QuestFormValues) => {
    const progressCurrent = sanitizeNonNegativeInt(values.progressCurrent, 0);
    const progressTotal = Math.max(1, sanitizeNonNegativeInt(values.progressTotal, 1));
    const rewardXP = sanitizeNonNegativeInt(values.rewardXP, 0);

    const questData: Partial<MainQuest> = {
      title: values.title.trim(),
      context: values.context.trim(),
      definitionOfDone: values.definitionOfDone.trim(),

      progressType: values.progressType as ProgressType,
      progress: values.progressType === 'percentage'
        ? 0
        : Math.round((progressCurrent / progressTotal) * 100),
      progressCurrent: values.progressType === 'custom' ? progressCurrent : undefined,
      progressTotal: values.progressType === 'custom' ? progressTotal : undefined,
      progressUnit: values.progressType === 'custom' ? values.progressUnit : undefined,

      attainable: values.attainable.trim(),
      importance: values.importance as Importance,
      linkedChapterId: values.linkedChapterId || undefined,
      seasonId: values.linkedSeasonId || undefined,

      deadline: values.deadline || undefined,
      unlockTime: values.unlockTime || undefined,
      status: (() => {
        if (quest?.status === 'completed' || quest?.status === 'archived') return quest.status;
        const linkedSeason = values.linkedSeasonId
          ? seasons.find((s) => s.id === values.linkedSeasonId)
          : undefined;
        if (linkedSeason && getEffectiveSeasonStatus(linkedSeason) === 'locked') return 'locked';
        if (isDateInFuture(values.unlockTime || undefined)) return 'locked';
        if (quest?.status === 'paused') return 'paused';
        return 'active';
      })(),

      motivation: values.motivation.trim() || undefined,
      consequence: values.consequence.trim() || undefined,
      rewardTitle: values.rewardTitle.trim() || undefined,
      rewardXP: rewardXP > 0 ? rewardXP : undefined,
    };

    onSubmit(questData);
    onClose();
  };

  const submitWithValidation = () => {
    void handleSubmit(submitForm)();
  };

  useEffect(() => {
    if (!isOpen || !quest) return;

    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        submitWithValidation();
      }
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [isOpen, quest, submitWithValidation]);

  const chapterRegister = register('linkedChapterId');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quest ? t('quest.modal_edit_title') : t('quest.modal_create_title')}
      size="lg"
      closeOnOverlayClick={false}
    >
      <Form
        onSubmit={handleSubmit(submitForm)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            submitWithValidation();
          }
        }}
      >
        {/* 1. Specific */}
        <ModalFormSection>
          <ModalFormSectionTitle>
            {t('quest.section_specific')}
          </ModalFormSectionTitle>
          <FormGroup style={{ marginBottom: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="quest-title">{t('quest.label_title')}</Label>
            <Input
              type="text"
              id="quest-title"
              placeholder={t('quest.placeholder_title')}
              required
              {...register('title')}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="quest-context">{t('quest.label_context')}</Label>
            <Textarea
              id="quest-context"
              placeholder={t('quest.placeholder_context')}
              style={{ minHeight: '60px' }}
              {...register('context')}
            />
          </FormGroup>
        </ModalFormSection>

        {/* 2. Measurable */}
        <ModalFormSection>
          <ModalFormSectionTitle>
            {t('quest.section_measurable')}
          </ModalFormSectionTitle>

          <FormGroup style={{ marginBottom: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="quest-dod">{t('quest.label_dod')}</Label>
            <Textarea
              id="quest-dod"
              placeholder={t('quest.placeholder_dod')}
              style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '0.9rem' }}
              {...register('definitionOfDone')}
            />
          </FormGroup>

          <FormGroup>
            <GroupLabel>{t('quest.label_progress_type')}</GroupLabel>
            <ProgressTypeSelector>
              <ProgressTypeButton
                type="button"
                $active={progressType === 'percentage'}
                onClick={() => setValue('progressType', 'percentage', { shouldDirty: true })}
              >
                {t('quest.type_percentage')}
              </ProgressTypeButton>
              <ProgressTypeButton
                type="button"
                $active={progressType === 'custom'}
                onClick={() => setValue('progressType', 'custom', { shouldDirty: true })}
              >
                {t('quest.type_custom')}
              </ProgressTypeButton>
            </ProgressTypeSelector>
          </FormGroup>

          {progressType === 'custom' && (
            <CustomProgressRow style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
              <FormGroup>
                <Label htmlFor="quest-progress-current">{t('quest.label_current')}</Label>
                <Input
                  type="number"
                  id="quest-progress-current"
                  min={0}
                  {...register('progressCurrent')}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="quest-progress-total">{t('quest.label_target')}</Label>
                <Input
                  type="number"
                  id="quest-progress-total"
                  min={1}
                  {...register('progressTotal')}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="quest-progress-unit">{t('quest.label_unit')}</Label>
                <Input
                  type="text"
                  id="quest-progress-unit"
                  placeholder={t('quest.placeholder_unit')}
                  {...register('progressUnit')}
                />
              </FormGroup>
            </CustomProgressRow>
          )}
        </ModalFormSection>

        {/* 3. Attainable */}
        <ModalFormSection>
          <ModalFormSectionTitle>
            {t('quest.section_attainable')}
          </ModalFormSectionTitle>
          <FormGroup>
            <Label htmlFor="quest-attainable">{t('quest.label_resources')}</Label>
            <Textarea
              id="quest-attainable"
              placeholder={t('quest.placeholder_resources')}
              style={{ minHeight: '60px' }}
              {...register('attainable')}
            />
          </FormGroup>
        </ModalFormSection>

        {/* 4. Relevant */}
        <ModalFormSection>
          <ModalFormSectionTitle>
            {t('quest.section_relevant')}
          </ModalFormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label htmlFor="quest-importance">{t('quest.label_importance')}</Label>
              <Select id="quest-importance" {...register('importance')}>
                <option value="high">{t('quest.filter_high')}</option>
                <option value="medium">{t('quest.filter_medium')}</option>
                <option value="low">{t('quest.filter_low')}</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="quest-linked-chapter">{t('quest.label_linked_chapter')}</Label>
              <Select
                id="quest-linked-chapter"
                {...chapterRegister}
                onChange={(e) => {
                  chapterRegister.onChange(e);
                  const found = allChapters.find((c) => c.chapter.id === e.target.value);
                  if (found) {
                    setValue('linkedSeasonId', found.season.id, { shouldDirty: true });
                  }
                }}
              >
                <option value="">{t('quest.option_no_link')}</option>
                {allChapters.map(({ chapter, season }) => (
                  <option key={chapter.id} value={chapter.id}>
                    [{season.name}] {chapter.title}
                  </option>
                ))}
              </Select>
            </FormGroup>
          </FormRow>
        </ModalFormSection>

        {/* 5. Time-bound */}
        <ModalFormSection>
          <ModalFormSectionTitle>
            {t('quest.section_time_bound')}
          </ModalFormSectionTitle>

          <FormRow>
            <FormGroup>
              <Label htmlFor="quest-deadline">{t('quest.label_deadline')}</Label>
              <Input
                type="date"
                id="quest-deadline"
                {...register('deadline')}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="quest-unlock-time">{t('quest.label_unlock_time')}</Label>
              <Input
                type="date"
                id="quest-unlock-time"
                {...register('unlockTime')}
              />
            </FormGroup>
          </FormRow>
        </ModalFormSection>

        {/* Incentives */}
        <ModalFormDividerSection>
          <div style={{ display: 'block', marginBottom: MODAL_FORM_TOKENS.sectionTitleMarginBottom, fontSize: '1rem', fontWeight: 600, color: '#4b5563' }}>
            {t('quest.section_incentives')}
          </div>

          <FormRow>
            <FormGroup>
              <Label htmlFor="quest-reward-xp">{t('quest.label_reward_xp')}</Label>
              <Input
                type="number"
                id="quest-reward-xp"
                min={0}
                placeholder="0"
                {...register('rewardXP')}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="quest-reward-title">{t('quest.label_reward_real')}</Label>
              <Input
                type="text"
                id="quest-reward-title"
                placeholder={t('quest.placeholder_reward_real')}
                {...register('rewardTitle')}
              />
            </FormGroup>
          </FormRow>

          <FormGroup style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="quest-motivation">{t('quest.label_motivation')}</Label>
            <Input
              type="text"
              id="quest-motivation"
              placeholder={t('quest.placeholder_motivation')}
              {...register('motivation')}
            />
          </FormGroup>

          <FormGroup style={{ marginTop: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="quest-consequence">{t('quest.label_consequence')}</Label>
            <Input
              id="quest-consequence"
              placeholder={t('quest.placeholder_consequence')}
              style={{ borderColor: consequence ? '#fca5a5' : undefined }}
              {...register('consequence')}
            />
          </FormGroup>
        </ModalFormDividerSection>

        <ButtonRow>
          <Button type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" $variant="primary">
            {quest ? t('quest.btn_save') : t('quest.btn_create')}
          </Button>
        </ButtonRow>
      </Form>
    </Modal>
  );
}

export default QuestFormModal;
