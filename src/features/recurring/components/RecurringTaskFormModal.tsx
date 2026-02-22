import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { Modal, ImeSafeInputBase } from '../../../components/ui';
import { useGameStore } from '../../../stores';
import type { RecurringTask, Importance, Effort, TaskType } from '../../../types/task';
import { EFFORT_CONFIG } from '../../../constants/task';

type RecurringFrequency = RecurringTask['frequency'];
type RecurringLinkType = 'none' | 'quest' | 'season' | 'chapter';
type RecurringTaskSubmitData = Omit<RecurringTask, 'id' | 'createdAt' | 'streak' | 'lastGeneratedDate'>;

interface RecurringTaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (taskData: Omit<RecurringTask, 'id' | 'createdAt' | 'streak' | 'lastGeneratedDate'>) => void;
    task?: RecurringTask | null;
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const Select = styled.select`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 1rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: ${({ $variant, theme }) =>
        $variant === 'primary' ? theme.colors.accent.purple : theme.colors.bg.tertiary};
  color: ${({ $variant, theme }) =>
        $variant === 'primary' ? 'white' : theme.colors.text.secondary};
  &:hover {
    filter: brightness(1.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const DayButton = styled.button<{ $selected: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.purple : theme.colors.border.secondary};
  background: ${({ theme, $selected }) =>
        $selected ? theme.colors.accent.purple : 'transparent'};
  color: ${({ theme, $selected }) =>
        $selected ? 'white' : theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

import type { TranslationKey } from '../../../lib/i18n/types';

const DAYS: TranslationKey[] = ['weekly.day_sun', 'weekly.day_mon', 'weekly.day_tue', 'weekly.day_wed', 'weekly.day_thu', 'weekly.day_fri', 'weekly.day_sat'];

export function RecurringTaskFormModal({
    isOpen,
    onClose,
    onSubmit,
    task,
}: RecurringTaskFormModalProps) {
    const mainQuests = useGameStore((s) => s.mainQuests);
    const activeSeasons = useGameStore((s) => s.activeSeasons);
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<RecurringFrequency>('daily');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [selectedDate, setSelectedDate] = useState(task?.dayOfMonth || 1);
    const [importance, setImportance] = useState<Importance>(task?.importance || 'medium');
    const [effort, setEffort] = useState<Effort>(task?.effort || 'medium');
    const [taskType, setTaskType] = useState<TaskType>(task?.taskType || 'creative');
    const [estimatedEnergy, setEstimatedEnergy] = useState<number | string>(task?.estimatedCosts?.energy || 0);

    // Link State
    const [linkType, setLinkType] = useState<RecurringLinkType>('none');
    const [linkedQuestId, setLinkedQuestId] = useState('');
    const [linkedSeasonId, setLinkedSeasonId] = useState('');
    const [linkedChapterId, setLinkedChapterId] = useState('');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const resetForm = useCallback(() => {
        setName('');
        setDescription('');
        setFrequency('daily');
        setSelectedDays([1, 2, 3, 4, 5]); // Default Mon-Fri
        setSelectedDate(1);
        setImportance('medium');
        setEffort('medium');
        setTaskType('creative');
        setLinkType('none');
        setLinkedQuestId('');
        setLinkedSeasonId('');
        setLinkedChapterId('');
        setStartDate('');
        setEndDate('');
    }, []);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setDescription(task.description || '');
            setFrequency(task.frequency);
            setSelectedDays(task.daysOfWeek || []);
            setSelectedDate(task.dayOfMonth || 1);
            setImportance(task.importance);
            setEffort(task.effort);
            setTaskType(task.taskType);
            // Determine link type from existing links
            if (task.linkedChapterId) {
                setLinkType('chapter');
                setLinkedChapterId(task.linkedChapterId);
                setLinkedSeasonId(task.linkedSeasonId || '');
            } else if (task.linkedSeasonId) {
                setLinkType('season');
                setLinkedSeasonId(task.linkedSeasonId);
            } else if (task.linkedMainQuestId) {
                setLinkType('quest');
                setLinkedQuestId(task.linkedMainQuestId);
            } else {
                setLinkType('none');
            }
            setStartDate(task.startDate || '');
            setEndDate(task.endDate || '');
        } else {
            resetForm();
        }
    // Intentionally key by id to avoid resetting fields on parent re-renders.
    }, [isOpen, task?.id, resetForm]);

    const toggleDay = (dayIndex: number) => {
        setSelectedDays(prev =>
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex].sort()
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const taskData: RecurringTaskSubmitData = {
            name,
            description,
            frequency,
            daysOfWeek: frequency === 'weekly' ? selectedDays : undefined,
            dayOfMonth: frequency === 'monthly' ? selectedDate : undefined,
            time: '00:00', // Default time
            enabled: true,
            importance,
            effort,
            taskType,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            estimatedCosts: Number(estimatedEnergy) > 0 ? { energy: Number(estimatedEnergy) } : undefined,
            // Explicitly clear all link IDs first to prevent old ones from persisting
            linkedMainQuestId: undefined,
            linkedSeasonId: undefined,
            linkedChapterId: undefined,
        };

        // Add link IDs based on link type
        if (linkType === 'quest' && linkedQuestId) {
            taskData.linkedMainQuestId = linkedQuestId;
        } else if (linkType === 'season' && linkedSeasonId) {
            taskData.linkedSeasonId = linkedSeasonId;
        } else if (linkType === 'chapter' && linkedChapterId) {
            taskData.linkedChapterId = linkedChapterId;
            taskData.linkedSeasonId = linkedSeasonId;
        }

        onSubmit(taskData);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={task ? t('recurring.task_edit') : t('recurring.task_create')}
            size="md"
        >
            <Form onSubmit={handleSubmit}>
                <FormGroup>
                    <Label htmlFor="recurring-task-name">{t('recurring.task_name')}</Label>
                    <Input
                        id="recurring-task-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('recurring.task_name_placeholder')}
                        required
                    />
                </FormGroup>

                <FormRow>
                    <FormGroup>
                        <Label htmlFor="recurring-frequency">{t('recurring.freq_type')}</Label>
                        <Select
                            id="recurring-frequency"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                        >
                            <option value="daily">{t('recurring.freq_daily_label')}</option>
                            <option value="weekly">{t('recurring.freq_weekly_label')}</option>
                            <option value="monthly">{t('recurring.freq_monthly_label')}</option>
                        </Select>
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="recurring-task-type">{t('recurring.task_type')}</Label>
                        <Select
                            id="recurring-task-type"
                            value={taskType}
                            onChange={(e) => setTaskType(e.target.value as TaskType)}
                        >
                            <option value="creative">{t('recurring.type_creative')}</option>
                            <option value="tax">{t('recurring.type_tax')}</option>
                            <option value="maintenance">{t('recurring.type_maintenance')}</option>
                        </Select>
                    </FormGroup>
                </FormRow>

                {frequency === 'weekly' && (
                    <FormGroup>
                        <GroupLabel>{t('recurring.repeat_days')}</GroupLabel>
                        <CheckboxGroup>
                            {DAYS.map((day, index) => (
                                <DayButton
                                    key={index}
                                    type="button"
                                    $selected={selectedDays.includes(index)}
                                    onClick={() => toggleDay(index)}
                                >
                                    {t(day)}
                                </DayButton>
                            ))}
                        </CheckboxGroup>
                    </FormGroup>
                )}

                {frequency === 'monthly' && (
                    <FormGroup>
                        <Label htmlFor="recurring-month-day">{t('recurring.day_of_month')}</Label>
                        <Select
                            id="recurring-month-day"
                            name="monthDay"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(Number(e.target.value))}
                        >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>{d}{t('recurring.month_day_suffix')}</option>
                            ))}
                        </Select>
                    </FormGroup>
                )}

                <FormRow>
                    <FormGroup>
                        <Label htmlFor="recurring-start-date">{t('recurring.start_date')}</Label>
                        <Input
                            id="recurring-start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label htmlFor="recurring-end-date">{t('recurring.end_date')}</Label>
                        <Input
                            id="recurring-end-date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </FormGroup>
                </FormRow>

                <FormRow>
                    <FormGroup>
                        <Label htmlFor="recurring-importance">{t('recurring.importance')}</Label>
                        <Select
                            id="recurring-importance"
                            name="importance"
                            value={importance}
                            onChange={(e) => setImportance(e.target.value as Importance)}
                        >
                            <option value="high">{t('recurring.importance_high')}</option>
                            <option value="medium">{t('recurring.importance_medium')}</option>
                            <option value="low">{t('recurring.importance_low')}</option>
                        </Select>
                    </FormGroup>

                    <FormGroup>


                        <Label htmlFor="recurring-energy-select">{t('recurring.energy_cost')}</Label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Select
                                id="recurring-energy-select"
                                value={effort}
                                onChange={(e) => setEffort(e.target.value as Effort)}
                                style={{ flex: 1 }}
                            >
                                {(Object.keys(EFFORT_CONFIG) as Effort[]).map((key) => (
                                    <option key={key} value={key}>
                                        {EFFORT_CONFIG[key].icon} {t(EFFORT_CONFIG[key].labelKey)}
                                    </option>
                                ))}
                            </Select>
                            <Input
                                id="recurring-energy-custom"
                                aria-label={t('recurring.energy_custom_aria')}
                                type="number"
                                placeholder={t('recurring.energy_custom_placeholder')}
                                value={estimatedEnergy}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') setEstimatedEnergy('');
                                    else {
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num)) setEstimatedEnergy(num);
                                    }
                                }}
                                onBlur={() => {
                                    const val = Number(estimatedEnergy);
                                    if (isNaN(val) || val < 0) setEstimatedEnergy(0);
                                    else setEstimatedEnergy(val);
                                }}
                                style={{ width: '80px' }}
                                min="0"
                            />
                        </div>
                    </FormGroup>
                </FormRow>

                <FormGroup>
                    <Label htmlFor="recurring-link-type">{t('recurring.link_type')}</Label>
                    <Select
                        id="recurring-link-type"
                        name="linkType"
                        value={linkType}
                        onChange={(e) => {
                            setLinkType(e.target.value as RecurringLinkType);
                            setLinkedQuestId('');
                            setLinkedSeasonId('');
                            setLinkedChapterId('');
                        }}
                    >
                        <option value="none">{t('recurring.link_none')}</option>
                        <option value="quest">{t('recurring.link_quest')}</option>
                        <option value="season">{t('recurring.link_season')}</option>
                        <option value="chapter">{t('recurring.link_chapter')}</option>
                    </Select>
                </FormGroup>

                {linkType === 'quest' && (
                    <FormGroup>
                        <Label htmlFor="recurring-linked-quest">{t('recurring.select_quest')}</Label>
                        <Select
                            id="recurring-linked-quest"
                            name="linkedQuestId"
                            value={linkedQuestId}
                            onChange={(e) => setLinkedQuestId(e.target.value)}
                        >
                            <option value="">{t('recurring.select_quest_placeholder')}</option>
                            {mainQuests.filter(q => q.status === 'active').map(q => (
                                <option key={q.id} value={q.id}>{q.title}</option>
                            ))}
                        </Select>
                    </FormGroup>
                )}

                {linkType === 'season' && (
                    <FormGroup>
                        <Label htmlFor="recurring-linked-season">{t('recurring.select_season')}</Label>
                        <Select
                            id="recurring-linked-season"
                            name="linkedSeasonId"
                            value={linkedSeasonId}
                            onChange={(e) => setLinkedSeasonId(e.target.value)}
                        >
                            <option value="">{t('recurring.select_season_placeholder')}</option>
                            {activeSeasons.filter(s => s.status === 'active').map(s => (
                                <option key={s.id} value={s.id}>📜 {s.name}</option>
                            ))}
                        </Select>
                    </FormGroup>
                )}

                {linkType === 'chapter' && (
                    <>
                        <FormGroup>
                            <Label htmlFor="recurring-chapter-season">{t('recurring.select_season')}</Label>
                            <Select
                                id="recurring-chapter-season"
                                name="chapterSeasonId"
                                value={linkedSeasonId}
                                onChange={(e) => {
                                    setLinkedSeasonId(e.target.value);
                                    setLinkedChapterId('');
                                }}
                            >
                                <option value="">{t('recurring.select_season_placeholder')}</option>
                                {activeSeasons.filter(s => s.status === 'active').map(s => (
                                    <option key={s.id} value={s.id}>📜 {s.name}</option>
                                ))}
                            </Select>
                        </FormGroup>
                        {linkedSeasonId && (
                            <FormGroup>
                                <Label htmlFor="recurring-linked-chapter">{t('recurring.select_chapter')}</Label>
                                <Select
                                    id="recurring-linked-chapter"
                                    name="linkedChapterId"
                                    value={linkedChapterId}
                                    onChange={(e) => setLinkedChapterId(e.target.value)}
                                >
                                    <option value="">{t('recurring.select_chapter_placeholder')}</option>
                                    {activeSeasons.find(s => s.id === linkedSeasonId)?.chapters
                                        .filter(ch => ch.status !== 'locked')
                                        .map((ch, i) => (
                                            <option key={ch.id} value={ch.id}>
                                                {ch.status === 'completed' ? '✅' : '📖'} {t('recurring.chapter_item_prefix').replace('{index}', (i + 1).toString())}: {ch.title}
                                            </option>
                                        ))}
                                </Select>
                            </FormGroup>
                        )}
                    </>
                )}

                <ButtonRow>
                    <Button type="button" onClick={onClose} $variant="secondary">{t('common.cancel')}</Button>
                    <Button type="submit" $variant="primary">{t('common.save')}</Button>
                </ButtonRow>
            </Form>
        </Modal>
    );
}
