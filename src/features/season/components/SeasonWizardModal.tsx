/**
 * SeasonWizardModal Component
 * Multi-step wizard for creating and editing seasons
 */

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Modal, ImeSafeInputBase, ImeSafeTextareaBase } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { createPrefixedId } from '../../../lib/id';
import type { Season, Chapter, Category, Importance } from '../../../types/task';
import { isDateInFuture } from '../../../lib/hierarchy-status';

interface SeasonWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (seasonData: Partial<Season>) => void;
  season?: Season | null;
  categories: Category[];
}

type WizardStep = 1 | 2 | 3;

interface ChapterDraft {
  id: string;
  title: string;
  description: string;
  deadline: string;
}

const WizardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const StepDot = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${({ theme, $active, $completed }) =>
    $active
      ? theme.colors.accent.purple
      : $completed
        ? '#10b981'
        : theme.colors.border.secondary};
  background: ${({ $active, $completed }) =>
    $active
      ? 'rgba(139, 92, 246, 0.1)'
      : $completed
        ? '#10b981'
        : 'transparent'};
  color: ${({ theme, $active, $completed }) =>
    $completed
      ? 'white'
      : $active
        ? theme.colors.accent.purple
        : theme.colors.text.tertiary};
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const StepConnector = styled.div<{ $completed: boolean }>`
  width: 40px;
  height: 2px;
  background: ${({ $completed }) =>
    $completed ? '#10b981' : '#e5e7eb'};
  align-self: center;
`;

const StepTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: center;
`;

const StepDescription = styled.p`
  margin: 0 0 20px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const CategorySelector = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CategoryButton = styled.button<{ $active: boolean; $color: string }>`
  padding: 12px 8px;
  border: 2px solid ${({ $active, $color }) =>
    $active ? $color : 'transparent'};
  border-radius: 8px;
  background: ${({ $active, $color }) =>
    $active ? `${$color}20` : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  font-size: 0.8rem;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $color }) => `${$color}10`};
    border-color: ${({ $color }) => $color};
  }
`;

const CategoryIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 4px;
`;

const ChapterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChapterItem = styled.div`
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const ChapterNumber = styled.span`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.accent.purple};
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
`;

const ChapterInput = styled(Input)`
  flex: 1;
  padding: 8px 12px;
  font-size: 0.9rem;
`;

const RemoveChapterButton = styled.button`
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.status.danger.text};
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    opacity: 0.7;
  }
`;

const AddChapterButton = styled.button`
  padding: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    color: ${({ theme }) => theme.colors.accent.purple};
    background: rgba(139, 92, 246, 0.05);
  }
`;

const PreviewCard = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const PreviewTitle = styled.h4`
  margin: 0 0 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PreviewMeta = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 12px;
`;

const PreviewChapters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PreviewChapterItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const generateChapterId = () => createPrefixedId('ch_draft', 9);

export function SeasonWizardModal({
  isOpen,
  onClose,
  onSubmit,
  season,
  categories,
}: SeasonWizardModalProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const { t } = useTranslation();

  // Step 1: Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('work');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardXP, setRewardXP] = useState<number | string>(0);

  // SMART Fields & Importance
  const [importance, setImportance] = useState<Importance>('medium');
  const [context, setContext] = useState('');
  const [attainable, setAttainable] = useState('');
  const [motivation, setMotivation] = useState('');
  const [consequence, setConsequence] = useState('');

  // Step 2: Chapters
  const [chapters, setChapters] = useState<ChapterDraft[]>([
    { id: generateChapterId(), title: '', description: '', deadline: '' },
  ]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (season) {
        setName(season.name);
        setDescription(season.description || '');
        setCategory(season.category);
        setStartDate(season.startDate);
        setEndDate(season.endDate || '');
        setRewardTitle(season.rewardTitle || '');
        setRewardXP(season.rewardXP || 0);
        setImportance(season.importance || 'medium');
        setContext(season.context || '');
        setAttainable(season.attainable || '');
        setMotivation(season.motivation || '');
        setConsequence(season.consequence || '');
        setChapters(
          season.chapters.map((ch) => ({
            id: ch.id,
            title: ch.title,
            description: ch.description || '',
            deadline: ch.deadline || '',
          }))
        );
      } else {
        setName('');
        setDescription('');
        setCategory('work');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setRewardTitle('');
        setRewardXP(0);
        setImportance('medium');
        setContext('');
        setAttainable('');
        setMotivation('');
        setConsequence('');
        setChapters([
          { id: generateChapterId(), title: '', description: '', deadline: '' },
        ]);
      }
      setStep(1);
    }
  }, [isOpen, season?.id]);

  // Handlers
  const handleBack = () => {
    setStep((s) => (s > 1 ? (s - 1 as WizardStep) : s));
  };

  const handleNext = () => {
    if (canProceed()) {
      setStep((s) => (s < 3 ? (s + 1 as WizardStep) : s));
    }
  };

  const handleUpdateChapter = (
    id: string,
    field: keyof ChapterDraft,
    value: string
  ) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch))
    );
  };

  const handleRemoveChapter = (id: string) => {
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  };

  const handleAddChapter = () => {
    setChapters((prev) => [
      ...prev,
      {
        id: generateChapterId(),
        title: '',
        description: '',
        deadline: '',
      },
    ]);
  };

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !category || !startDate || !chapters.some((ch) => ch.title.trim())) {
      return;
    }

    const isEditing = !!season;
    const autoSeasonStatus = isDateInFuture(startDate) ? 'locked' : 'active';
    const resolvedSeasonStatus = isEditing
      ? (season.status === 'completed' || season.status === 'archived'
        ? season.status
        : (season.status === 'paused' && autoSeasonStatus === 'active' ? 'paused' : autoSeasonStatus))
      : autoSeasonStatus;

    const seasonChapters: Chapter[] = chapters
      .filter((ch) => ch.title.trim())
      .map((ch, index) => {
        const isNewChapter = ch.id.startsWith('ch_draft_');
        // Find existing chapter data if editing
        const existingChapter = isEditing && !isNewChapter
          ? season.chapters.find((c) => c.id === ch.id)
          : null;

        return {
          id: isNewChapter ? `ch_${Date.now()}_${index}` : ch.id,
          title: ch.title.trim(),
          description: ch.description.trim() || undefined,
          order: index + 1,
          // Preserve progress and status for existing chapters
          progress: existingChapter?.progress ?? 0,
          status: existingChapter?.status ?? (index === 0 ? 'active' : 'locked'),
          deadline: ch.deadline || undefined,
          // Preserve other existing data
          completedAt: existingChapter?.completedAt,
          unlockTime: existingChapter?.unlockTime,
          rewardTitle: existingChapter?.rewardTitle,
          rewardXP: existingChapter?.rewardXP,
          linkedQuests: existingChapter?.linkedQuests,
        };
      });

    const seasonData: Partial<Season> = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      startDate,
      endDate: endDate || undefined,
      status: resolvedSeasonStatus,
      level: isEditing ? season.level : 1,
      experience: isEditing ? season.experience : 0,
      chapters: seasonChapters,
      rewardTitle: rewardTitle.trim() || undefined,
      rewardXP: Number(rewardXP) > 0 ? Number(rewardXP) : undefined,
      importance,
      context: context.trim() || undefined,
      attainable: attainable.trim() || undefined,
      motivation: motivation.trim() || undefined,
      consequence: consequence.trim() || undefined,
    };

    onSubmit(seasonData);
    onClose();
  }, [
    name,
    category,
    startDate,
    chapters,
    season,
    description,
    endDate,
    rewardTitle,
    rewardXP,
    importance,
    context,
    attainable,
    motivation,
    consequence,
    onSubmit,
    onClose,
  ]);

  useEffect(() => {
    if (!isOpen || !season) return;

    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [isOpen, season, handleSubmit]);

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim() && category && startDate;
      case 2:
        return chapters.some((ch) => ch.title.trim());
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getCategoryInfo = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat || { id: catId, name: catId, icon: '📌', color: '#8b5cf6' };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={season ? t('season.modal_edit_title') : t('season.modal_create_title')}
      size="md"
    >
      <WizardContainer>
        <StepIndicator>
          <StepDot $active={step === 1} $completed={step > 1} onClick={() => setStep(1)}>
            {step > 1 ? '✓' : '1'}
          </StepDot>
          <StepConnector $completed={step > 1} />
          <StepDot $active={step === 2} $completed={step > 2} onClick={() => step > 1 && setStep(2)}>
            {step > 2 ? '✓' : '2'}
          </StepDot>
          <StepConnector $completed={step > 2} />
          <StepDot $active={step === 3} $completed={false} onClick={() => step > 2 && setStep(3)}>
            3
          </StepDot>
        </StepIndicator>

        {step === 1 && (
          <>
            <div>
              <StepTitle>{t('season.step_basic')}</StepTitle>
              <StepDescription>{t('season.desc_basic')}</StepDescription>
            </div>

            <Form>
              <FormGroup>
                <Label htmlFor="season-name">{t('season.label_name')}</Label>
                <Input
                  id="season-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('season.placeholder_name')}
                />
              </FormGroup>

              {/* SMART Section */}
              <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(50,50,50,0.03)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>
                  {t('season.smart_planning')}
                </div>

                <FormGroup>
                  <Label htmlFor="season-specific">{t('season.label_specific')}</Label>
                  <Textarea
                    id="season-specific"
                    name="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={t('season.placeholder_specific')}
                    style={{ minHeight: '60px' }}
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="season-measurable">{t('season.label_measurable')}</Label>
                  <Textarea
                    id="season-measurable"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('season.placeholder_measurable')}
                    style={{ minHeight: '60px' }}
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="season-attainable">{t('season.label_attainable')}</Label>
                  <Textarea
                    id="season-attainable"
                    name="attainable"
                    value={attainable}
                    onChange={(e) => setAttainable(e.target.value)}
                    placeholder={t('season.placeholder_attainable')}
                    style={{ minHeight: '60px' }}
                  />
                </FormGroup>

                <FormRow>
                  <FormGroup>
                    <Label htmlFor="season-importance">{t('season.label_relevant')}</Label>
                    <select
                      id="season-importance"
                      name="importance"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: '#f9fafb',
                        color: '#111827',
                        fontSize: '1rem',
                        cursor: 'pointer'
                      }}
                      value={importance}
                      onChange={(e) => setImportance(e.target.value as Importance)}
                    >
                      <option value="high">{t('quest.filter_high')}</option>
                      <option value="medium">{t('quest.filter_medium')}</option>
                      <option value="low">{t('quest.filter_low')}</option>
                    </select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="season-start-date">{t('season.label_time_bound')}</Label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input
                        id="season-start-date"
                        name="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder={t('season.placeholder_start')}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <span style={{ alignSelf: 'center', color: '#9ca3af' }}>~</span>
                      <Input
                        id="season-end-date"
                        name="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder={t('season.placeholder_end')}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                    </div>
                  </FormGroup>
                </FormRow>

                <FormGroup style={{ marginTop: '12px' }}>
                  <GroupLabel>{t('season.label_category')}</GroupLabel>
                  <CategorySelector>
                    {categories.map((cat) => (
                      <CategoryButton
                        key={cat.id}
                        $active={category === cat.id}
                        $color={cat.color}
                        onClick={() => setCategory(cat.id)}
                        type="button"
                      >
                        <CategoryIcon>{cat.icon}</CategoryIcon>
                        {cat.name}
                      </CategoryButton>
                    ))}
                  </CategorySelector>
                </FormGroup>
              </div>

              {/* Incentives Section */}
              <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(50,50,50,0.03)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>
                  {t('season.label_incentives')}
                </div>

                <FormRow>
                  <FormGroup>
                    <Label htmlFor="season-motivation">{t('season.label_motivation')}</Label>
                    <Input
                      id="season-motivation"
                      name="motivation"
                      type="text"
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      placeholder={t('quest.placeholder_motivation')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="season-consequence">{t('season.label_consequence')}</Label>
                    <Input
                      id="season-consequence"
                      name="consequence"
                      type="text"
                      value={consequence}
                      onChange={(e) => setConsequence(e.target.value)}
                      placeholder={t('quest.placeholder_consequence')}
                    />
                  </FormGroup>
                </FormRow>

                <FormRow style={{ marginTop: '12px' }}>
                  <FormGroup>
                    <Label htmlFor="season-reward-title">{t('season.label_reward_title')}</Label>
                    <Input
                      id="season-reward-title"
                      name="rewardTitle"
                      type="text"
                      value={rewardTitle}
                      onChange={(e) => setRewardTitle(e.target.value)}
                      placeholder={t('season.placeholder_reward_title')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="season-reward-xp">{t('season.label_reward_xp')}</Label>
                    <Input
                      id="season-reward-xp"
                      name="rewardXP"
                      type="number"
                      value={rewardXP}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') setRewardXP('');
                        else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setRewardXP(num);
                        }
                      }}
                      onBlur={() => {
                        const val = Number(rewardXP);
                        if (isNaN(val) || val < 0) setRewardXP(0);
                        else setRewardXP(val);
                      }}
                      min={0}
                      placeholder="0"
                    />
                  </FormGroup>
                </FormRow>
              </div>
            </Form>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <StepTitle>{t('season.step_chapters')}</StepTitle>
              <StepDescription>{t('season.desc_chapters')}</StepDescription>
            </div>

            <Form>
              <ChapterList>
                {chapters.map((chapter, index) => (
                  <ChapterItem key={chapter.id}>
                    <ChapterHeader>
                      <ChapterNumber>{index + 1}</ChapterNumber>
                      <ChapterInput
                        id={`season-chapter-title-${chapter.id}`}
                        name={`chapterTitle-${chapter.id}`}
                        aria-label={t('season.placeholder_chapter_title').replace('{index}', (index + 1).toString())}
                        type="text"
                        value={chapter.title}
                        onChange={(e) =>
                          handleUpdateChapter(chapter.id, 'title', e.target.value)
                        }
                        placeholder={t('season.placeholder_chapter_title').replace('{index}', (index + 1).toString())}
                      />
                      {chapters.length > 1 && (
                        <RemoveChapterButton
                          onClick={() => handleRemoveChapter(chapter.id)}
                        >
                          ✕
                        </RemoveChapterButton>
                      )}
                    </ChapterHeader>
                    <FormRow>
                      <Input
                        id={`season-chapter-description-${chapter.id}`}
                        name={`chapterDescription-${chapter.id}`}
                        aria-label={t('season.placeholder_chapter_desc')}
                        type="text"
                        value={chapter.description}
                        onChange={(e) =>
                          handleUpdateChapter(chapter.id, 'description', e.target.value)
                        }
                        placeholder={t('season.placeholder_chapter_desc')}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <Input
                        id={`season-chapter-deadline-${chapter.id}`}
                        name={`chapterDeadline-${chapter.id}`}
                        aria-label={t('season.label_time_bound')}
                        type="date"
                        value={chapter.deadline}
                        onChange={(e) =>
                          handleUpdateChapter(chapter.id, 'deadline', e.target.value)
                        }
                        style={{ fontSize: '0.85rem' }}
                      />
                    </FormRow>
                  </ChapterItem>
                ))}
              </ChapterList>

              {chapters.length < 10 && (
                <AddChapterButton onClick={handleAddChapter}>
                  {t('season.btn_add_chapter')}
                </AddChapterButton>
              )}
            </Form>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <StepTitle>{t('season.step_confirm')}</StepTitle>
              <StepDescription>{t('season.desc_confirm')}</StepDescription>
            </div>

            <PreviewCard>
              <PreviewTitle>
                {getCategoryInfo(category).icon} {name || t('season.placeholder_name')}
              </PreviewTitle>
              <PreviewMeta>
                {getCategoryInfo(category).name} · {startDate}
                {endDate && ` ~ ${endDate}`}
              </PreviewMeta>
              {description && (
                <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 12px' }}>
                  {description}
                </p>
              )}
              <PreviewChapters>
                {chapters
                  .filter((ch) => ch.title.trim())
                  .map((chapter, index) => (
                    <PreviewChapterItem key={chapter.id}>
                      <ChapterNumber style={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                        {index + 1}
                      </ChapterNumber>
                      {chapter.title}
                      {chapter.deadline && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                          📅 {chapter.deadline}
                        </span>
                      )}
                    </PreviewChapterItem>
                  ))}
              </PreviewChapters>
            </PreviewCard>
          </>
        )}

        <ButtonRow>
          <div>
            {step > 1 && (
              <Button onClick={handleBack}>
                ← {t('season.btn_prev')}
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {step < 3 ? (
              <Button $variant="primary" onClick={handleNext} disabled={!canProceed()}>
                {t('season.btn_next')} →
              </Button>
            ) : (
              <Button $variant="primary" onClick={handleSubmit}>
                {season ? t('season.btn_save') : t('season.btn_create')}
              </Button>
            )}
          </div>
        </ButtonRow>
      </WizardContainer>
    </Modal>
  );
}

export default SeasonWizardModal;
