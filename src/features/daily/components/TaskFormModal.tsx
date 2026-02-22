/**
 * TaskFormModal Component
 * Modal for creating and editing tasks
 */

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { Modal, Button, Input, TextareaField, Select, ConfirmModal, ModalFormSection, ModalFormSectionTitle, ModalFormDividerSection } from '../../../components/ui';
import type { CustomTask, MainQuest, Season, LinkType, Effort, Importance } from '../../../types/task';
import { EFFORT_CONFIG } from '../../../constants/task';
import { getChapterEffectiveDisplayStatus, getEffectiveSeasonStatus } from '../../../lib/hierarchy-status';
import { MODAL_FORM_TOKENS } from '../../../styles/modalFormTokens';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<CustomTask>) => void;
  task?: CustomTask | null;
  mainQuests?: MainQuest[];
  seasons?: Season[];
  // Support preset link values
  defaultLinkType?: LinkType;
  defaultLinkedMainQuestId?: string | null;
}

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});

const taskFormSchema = z.object({
  name: z.string().trim().min(1),
  context: z.string(),
  motivation: z.string(),
  consequence: z.string(),
  taskType: z.enum(['creative', 'tax', 'maintenance']),
  effort: z.enum(['light', 'medium', 'heavy']),
  linkType: z.enum(['none', 'season', 'chapter', 'mainQuest']),
  linkedMainQuestId: z.string(),
  linkedSeasonId: z.string(),
  linkedChapterId: z.string(),
  deadline: z.string(),
  estimatedEnergy: z.number().min(0),
  checklist: z.array(checklistItemSchema),
  importance: z.enum(['low', 'medium', 'high']),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type TaskFormDraft = TaskFormValues;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${MODAL_FORM_TOKENS.formGap};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${MODAL_FORM_TOKENS.formRowGap};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${MODAL_FORM_TOKENS.formGroupGap};
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const GroupLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const RadioGroup = styled.div`
  display: flex;
  gap: ${MODAL_FORM_TOKENS.radioGroupGap};
  flex-wrap: wrap;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  input {
    cursor: pointer;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

const QuickDateRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
`;

const QuickDateButton = styled.button`
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const buildDefaultValues = (params: {
  task?: CustomTask | null;
  defaultLinkType?: LinkType;
  defaultLinkedMainQuestId?: string | null;
}): TaskFormValues => {
  const { task, defaultLinkType, defaultLinkedMainQuestId } = params;

  if (task) {
    return {
      name: task.name || '',
      context: task.context || '',
      motivation: task.motivation || '',
      consequence: task.consequence || '',
      taskType: task.taskType || 'creative',
      effort: task.effort || 'medium',
      linkType: task.linkType || 'none',
      linkedMainQuestId: task.linkedMainQuestId || '',
      linkedSeasonId: task.linkedSeasonId || '',
      linkedChapterId: task.linkedChapterId || '',
      deadline: task.deadline || '',
      estimatedEnergy: task.estimatedCosts?.energy ? Math.abs(task.estimatedCosts.energy) : 0,
      checklist: task.checklist || [],
      importance: task.importance || 'medium',
    };
  }

  return {
    name: '',
    context: '',
    motivation: '',
    consequence: '',
    taskType: 'creative',
    effort: 'medium',
    linkType: defaultLinkType || 'none',
    linkedMainQuestId: defaultLinkedMainQuestId || '',
    linkedSeasonId: '',
    linkedChapterId: '',
    deadline: '',
    estimatedEnergy: 0,
    checklist: [],
    importance: 'medium',
  };
};

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  mainQuests = [],
  seasons = [],
  defaultLinkType,
  defaultLinkedMainQuestId,
}: TaskFormModalProps) {
  const isEditing = !!task;
  const { t } = useTranslation();
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const draftKey = `task-form-draft:${task?.id || 'new'}`;

  const serializeDraft = (payload: TaskFormDraft) => JSON.stringify(payload);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: buildDefaultValues({ task, defaultLinkType, defaultLinkedMainQuestId }),
  });

  const { fields: checklistFields, append, remove } = useFieldArray({
    control,
    name: 'checklist',
    keyName: 'fieldKey',
  });
  const watchedValues = useWatch({ control });
  const watchedName = useWatch({ control, name: 'name' });
  const watchedLinkType = useWatch({ control, name: 'linkType' });
  const watchedLinkedMainQuestId = useWatch({ control, name: 'linkedMainQuestId' });
  const watchedLinkedSeasonId = useWatch({ control, name: 'linkedSeasonId' });
  const watchedLinkedChapterId = useWatch({ control, name: 'linkedChapterId' });
  const watchedImportance = useWatch({ control, name: 'importance' });

  // Reset form when modal opens/closes or task changes, then restore draft if exists
  useEffect(() => {
    if (!isOpen) return;

    const base = buildDefaultValues({ task, defaultLinkType, defaultLinkedMainQuestId });
    let finalDraft = base;

    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TaskFormDraft>;
        const merged = {
          ...base,
          ...parsed,
          checklist: Array.isArray(parsed.checklist) ? parsed.checklist : base.checklist,
        };
        const validated = taskFormSchema.safeParse(merged);
        if (validated.success) {
          finalDraft = validated.data;
        }
      }
    } catch {
      // Ignore malformed draft silently
    }

    reset(finalDraft);
    setInitialSnapshot(serializeDraft(finalDraft));
    setNewChecklistItem('');
    setShowCloseConfirm(false);
    setTimeout(() => setFocus('name'), 0);
  }, [isOpen, task?.id, defaultLinkType, defaultLinkedMainQuestId, draftKey, reset, setFocus]);

  // Auto-save draft while editing
  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(getValues()));
    } catch {
      // Ignore storage quota issues silently
    }
  }, [isOpen, draftKey, watchedValues, getValues]);

  const handleAddChecklistItem = () => {
    const text = newChecklistItem.trim();
    if (!text) return;
    append({
      id: Date.now().toString(),
      text,
      completed: false,
    });
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    const index = checklistFields.findIndex((item) => item.id === id);
    if (index >= 0) remove(index);
  };

  // Get chapters from selected season
  const getChapters = () => {
    if (watchedLinkType === 'chapter' && watchedLinkedSeasonId) {
      const season = seasons.find((s) => s.id === watchedLinkedSeasonId);
      return season?.chapters || [];
    }
    return [];
  };

  // Inheritance Logic
  useEffect(() => {
    let nextImportance: Importance | null = null;

    if (watchedLinkType === 'mainQuest' && watchedLinkedMainQuestId) {
      const q = mainQuests.find((item) => item.id === watchedLinkedMainQuestId);
      if (q) nextImportance = q.importance;
    } else if (watchedLinkType === 'season' && watchedLinkedSeasonId) {
      const s = seasons.find((item) => item.id === watchedLinkedSeasonId);
      nextImportance = s?.importance || 'high';
    } else if (watchedLinkType === 'chapter' && watchedLinkedChapterId && watchedLinkedSeasonId) {
      const s = seasons.find((item) => item.id === watchedLinkedSeasonId);
      const c = s?.chapters.find((ch) => ch.id === watchedLinkedChapterId);
      nextImportance = c?.importance || s?.importance || 'high';
    }

    if (nextImportance && nextImportance !== getValues('importance')) {
      setValue('importance', nextImportance, { shouldDirty: true, shouldValidate: false });
    }
  }, [
    watchedLinkType,
    watchedLinkedMainQuestId,
    watchedLinkedSeasonId,
    watchedLinkedChapterId,
    mainQuests,
    seasons,
    setValue,
    getValues,
  ]);

  const submitForm = useCallback(
    (values: TaskFormValues) => {
      const taskData: Partial<CustomTask> = {
        name: values.name.trim(),
        context: values.context.trim(),
        motivation: values.motivation.trim(),
        consequence: values.consequence.trim(),
        taskType: values.taskType,
        effort: values.effort,
        importance: values.importance,
        linkType: values.linkType,
        deadline: values.deadline || undefined,
        estimatedCosts: values.estimatedEnergy > 0 ? { energy: -values.estimatedEnergy } : undefined,
        checklist: values.checklist,
      };

      // Always reset link fields first, then set based on selected link type.
      taskData.linkedMainQuestId = undefined;
      taskData.linkedQuestId = undefined;
      taskData.linkedSeasonId = undefined;
      taskData.linkedChapterId = undefined;
      taskData.seasonId = undefined;

      if (values.linkType === 'mainQuest' && values.linkedMainQuestId) {
        taskData.linkedMainQuestId = values.linkedMainQuestId;
      } else if (values.linkType === 'season' && values.linkedSeasonId) {
        taskData.linkedSeasonId = values.linkedSeasonId;
        taskData.seasonId = values.linkedSeasonId;
      } else if (values.linkType === 'chapter' && values.linkedChapterId) {
        taskData.linkedChapterId = values.linkedChapterId;
        taskData.linkedSeasonId = values.linkedSeasonId;
        taskData.seasonId = values.linkedSeasonId;
      }

      if (task) {
        taskData.id = task.id;
      }

      onSubmit(taskData);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      onClose();
    },
    [task, onSubmit, onClose, draftKey]
  );

  const submitWithValidation = useCallback(() => {
    void handleSubmit(submitForm)();
  }, [handleSubmit, submitForm]);

  const handleRequestClose = () => {
    const hasUnsavedChanges =
      !!initialSnapshot && serializeDraft(getValues() as TaskFormDraft) !== initialSnapshot;

    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
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
  }, [isOpen, submitWithValidation]);

  const linkedSeasonRegister = register('linkedSeasonId');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={isEditing ? t('task.modal_edit_title') : t('task.modal_create_title')}
      subtitle={isEditing ? t('task.modal_edit_subtitle') : t('task.modal_create_subtitle')}
      size="lg"
    >
      <Form
        onSubmit={handleSubmit(submitForm)}
        onKeyDown={(e) => {
          // Cmd+Enter or Ctrl+Enter to submit
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submitWithValidation();
          }
        }}
      >
        {/* 1. Specific: Goal & Context */}
        <ModalFormSection>
          <ModalFormSectionTitle style={{ fontWeight: 500 }}>
            {t('task.section_specific')}
          </ModalFormSectionTitle>

          <FormGroup style={{ marginBottom: MODAL_FORM_TOKENS.inlineFieldSpacing }}>
            <Label htmlFor="task-name">{t('task.label_goal')}</Label>
            <Input
              id="task-name"
              placeholder={t('task.placeholder_goal')}
              error={!!errors.name}
              autoFocus
              {...register('name')}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="task-context">{t('task.label_context')}</Label>
            <TextareaField
              id="task-context"
              placeholder={t('task.placeholder_context')}
              minRows={2}
              {...register('context')}
            />
          </FormGroup>
        </ModalFormSection>

        {/* 2. Measurable (DoD) */}
        <FormGroup>
          <Label htmlFor="new-checklist-item" id="measurable-label">{t('task.label_measurable')}</Label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <Input
              id="new-checklist-item"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder={t('task.placeholder_measurable_item')}
              aria-labelledby="measurable-label"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
            />
            <Button type="button" onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}>
              {t('task.btn_add_item')}
            </Button>
          </div>
          {checklistFields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {checklistFields.map((item) => (
                <div key={item.fieldKey} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>• {item.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.1rem' }}
                    title={t('task.remove_item_title')}
                    aria-label={t('task.remove_item_aria')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormGroup>

        {/* 3. Attainable */}
        <FormRow>
          <FormGroup>
            <Label htmlFor="task-effort">{t('task.label_effort')}</Label>
            <Select id="task-effort" {...register('effort')}>
              {(['light', 'medium', 'heavy'] as Effort[]).map((key) => (
                <option key={key} value={key}>
                  {EFFORT_CONFIG[key].icon} {t(EFFORT_CONFIG[key].labelKey)} ({t(EFFORT_CONFIG[key].timeKey)})
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>

        {/* 4. Relevant */}
        <FormRow>
          <FormGroup role="group" aria-labelledby="importance-label">
            <GroupLabel id="importance-label">{t('task.label_importance')}</GroupLabel>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['low', 'medium', 'high'] as Importance[]).map((level) => (
                <label key={level} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  cursor: 'pointer', fontSize: '0.9rem',
                  padding: '6px 10px', borderRadius: '6px',
                  background: watchedImportance === level ? 'rgba(0,0,0,0.05)' : 'transparent',
                  border: watchedImportance === level ? '1px solid currentColor' : '1px solid transparent',
                  color: level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#10b981'
                }}>
                  <input
                    type="radio"
                    value={level}
                    autoComplete="off"
                    {...register('importance')}
                    style={{ accentColor: 'currentColor' }}
                  />
                  {level === 'high' ? t('quest.filter_high') : level === 'medium' ? t('quest.filter_medium') : t('quest.filter_low')}
                </label>
              ))}
            </div>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="task-type">{t('task.label_type')}</Label>
            <Select id="task-type" {...register('taskType')}>
              <option value="creative">{t('task.type_creative')}</option>
              <option value="tax">{t('task.type_tax')}</option>
              <option value="maintenance">{t('task.type_maintenance')}</option>
            </Select>
          </FormGroup>
        </FormRow>

        <FormGroup>
          <GroupLabel id="link-type-label">{t('task.label_link_type')}</GroupLabel>
          <RadioGroup role="radiogroup" aria-labelledby="link-type-label">
            <RadioLabel htmlFor="link-type-none">
              <input
                type="radio"
                id="link-type-none"
                value="none"
                autoComplete="off"
                {...register('linkType')}
              />
              {t('task.link_none')}
            </RadioLabel>
            <RadioLabel htmlFor="link-type-season">
              <input
                type="radio"
                id="link-type-season"
                value="season"
                autoComplete="off"
                {...register('linkType')}
              />
              {t('task.link_season')}
            </RadioLabel>
            <RadioLabel htmlFor="link-type-chapter">
              <input
                type="radio"
                id="link-type-chapter"
                value="chapter"
                autoComplete="off"
                {...register('linkType')}
              />
              {t('task.link_chapter')}
            </RadioLabel>
            <RadioLabel htmlFor="link-type-mainquest">
              <input
                type="radio"
                id="link-type-mainquest"
                value="mainQuest"
                autoComplete="off"
                {...register('linkType')}
              />
              {t('task.link_quest')}
            </RadioLabel>
          </RadioGroup>
        </FormGroup>

        {watchedLinkType === 'mainQuest' && (
          <FormGroup>
            <Label htmlFor="task-linked-quest">{t('task.label_select_quest')}</Label>
            <Select id="task-linked-quest" {...register('linkedMainQuestId')}>
              <option value="">{t('task.placeholder_select_quest')}</option>
              {mainQuests
                .filter((q) => q.status === 'active' || q.status === 'paused')
                .map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.linkedChapterId ? '📖' : quest.seasonId ? '📜' : '📋'} {quest.title}
                  </option>
                ))}
            </Select>
          </FormGroup>
        )}

        {(watchedLinkType === 'season' || watchedLinkType === 'chapter') && (
          <FormGroup>
            <Label htmlFor="task-linked-season">{t('task.label_select_season')}</Label>
            <Select
              id="task-linked-season"
              {...linkedSeasonRegister}
              onChange={(e) => {
                linkedSeasonRegister.onChange(e);
                setValue('linkedChapterId', '', { shouldDirty: true });
              }}
            >
              <option value="">{t('task.placeholder_select_season')}</option>
              {seasons
                .filter((s) => getEffectiveSeasonStatus(s) === 'active')
                .map((season) => (
                  <option key={season.id} value={season.id}>
                    📜 {season.name}
                  </option>
                ))}
            </Select>
          </FormGroup>
        )}

        {watchedLinkType === 'chapter' && watchedLinkedSeasonId && (
          <FormGroup>
            <Label htmlFor="task-linked-chapter">{t('task.label_select_chapter')}</Label>
            <Select id="task-linked-chapter" {...register('linkedChapterId')}>
              <option value="">{t('task.placeholder_select_chapter')}</option>
              {getChapters()
                .filter((ch) => {
                  const season = seasons.find((s) => s.id === watchedLinkedSeasonId);
                  if (!season) return true;
                  const parentSeasonLocked = getEffectiveSeasonStatus(season) === 'locked';
                  return getChapterEffectiveDisplayStatus(ch, { parentSeasonLocked }) !== 'locked';
                })
                .map((chapter, index) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.status === 'completed' ? '✅' : '📖'} {t('season.placeholder_chapter_title').replace('{index}', (index + 1).toString())}: {chapter.title}
                  </option>
                ))}
            </Select>
          </FormGroup>
        )}

        {/* 5. Time-bound */}
        <ModalFormDividerSection>
          <div style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>
            {t('task.section_time_bound')}
          </div>
          <FormGroup>
            <Label htmlFor="task-deadline">{t('task.label_deadline')}</Label>
            <QuickDateRow>
              <QuickDateButton type="button" onClick={() => setValue('deadline', new Date().toISOString().split('T')[0], { shouldDirty: true })}>{t('task.quick_date_today')}</QuickDateButton>
              <QuickDateButton type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setValue('deadline', d.toISOString().split('T')[0], { shouldDirty: true }); }}>{t('task.quick_date_tomorrow')}</QuickDateButton>
              <QuickDateButton type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 3); setValue('deadline', d.toISOString().split('T')[0], { shouldDirty: true }); }}>{t('task.quick_date_3days')}</QuickDateButton>
              <QuickDateButton type="button" onClick={() => setValue('deadline', '', { shouldDirty: true })}>{t('task.quick_date_clear')}</QuickDateButton>
            </QuickDateRow>
            <Input
              id="task-deadline"
              type="date"
              {...register('deadline')}
            />
          </FormGroup>

          <FormGroup style={{ marginTop: '10px' }}>
            <Label htmlFor="task-motivation">{t('task.label_reward')}</Label>
            <Input
              id="task-motivation"
              placeholder={t('task.placeholder_reward')}
              {...register('motivation')}
            />
          </FormGroup>

          <FormGroup style={{ marginTop: '10px' }}>
            <Label htmlFor="task-consequence">{t('task.label_consequence')}</Label>
            <Input
              id="task-consequence"
              placeholder={t('task.placeholder_consequence')}
              {...register('consequence')}
            />
          </FormGroup>
        </ModalFormDividerSection>

        <ButtonRow>
          <Button type="button" variant="secondary" onClick={handleRequestClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!watchedName?.trim()}>
            {isEditing ? t('task.btn_save') : t('task.btn_create')}
          </Button>
        </ButtonRow>
      </Form>
      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        onConfirm={() => {
          setShowCloseConfirm(false);
          submitWithValidation();
        }}
        title={t('task.leave_confirm_title')}
        message={t('task.leave_confirm_message')}
        cancelText={t('task.leave_confirm_close')}
        confirmText={t('common.save')}
      />
    </Modal>
  );
}

export default TaskFormModal;
