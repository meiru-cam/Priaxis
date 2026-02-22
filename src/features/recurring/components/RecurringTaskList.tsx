import styled from 'styled-components';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { useGameStore } from '../../../stores';
import type { RecurringTask } from '../../../types/task';
import { EFFORT_CONFIG } from '../../../constants/task';

interface RecurringTaskListProps {
  tasks: RecurringTask[];
  onEdit: (task: RecurringTask) => void;
  onDelete: (id: string) => void;
  onTrigger: (id: string) => void;
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const Name = styled.h4`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Badge = styled.span`
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const InfoRow = styled.div`
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  align-items: center;
`;

const QuestLink = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.accent.gold};
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 10px;
  padding: 12px;
  text-align: center;
`;

const StatIcon = styled.div`
  font-size: 1.2rem;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'primary' }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: transparent;
  color: ${({ theme, $variant }) =>
    $variant === 'danger' ? theme.colors.status.danger :
      $variant === 'primary' ? theme.colors.accent.gold :
        theme.colors.text.secondary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant, theme }) => $variant === 'primary' && `
    border-color: ${theme.colors.accent.gold};
  `}

  &:hover {
    background: ${({ theme, $variant }) =>
    $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' :
      $variant === 'primary' ? 'rgba(234, 179, 8, 0.1)' :
        theme.colors.bg.tertiary};
    border-color: ${({ theme, $variant }) =>
    $variant === 'danger' ? theme.colors.status.danger :
      $variant === 'primary' ? theme.colors.accent.gold :
        theme.colors.text.primary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 40px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
`;

import type { TranslationKey } from '../../../lib/i18n/types';

const DAYS_MAP: TranslationKey[] = ['weekly.day_sun', 'weekly.day_mon', 'weekly.day_tue', 'weekly.day_wed', 'weekly.day_thu', 'weekly.day_fri', 'weekly.day_sat'];

export function RecurringTaskList({ tasks, onEdit, onDelete, onTrigger }: RecurringTaskListProps) {
  const { t } = useTranslation();
  const mainQuests = useGameStore(s => s.mainQuests);
  const activeSeasons = useGameStore(s => s.activeSeasons);

  const getFrequencyText = (task: RecurringTask) => {
    if (task.frequency === 'daily') return t('recurring.freq_daily');
    if (task.frequency === 'monthly') return t('recurring.freq_monthly').replace('{day}', task.dayOfMonth?.toString() || '1');
    if (task.frequency === 'weekly' && task.daysOfWeek) {
      const days = task.daysOfWeek.map(d => t(DAYS_MAP[d])).join('、');
      return t('recurring.freq_weekly').replace('{days}', days);
    }
    return t('recurring.freq_custom');
  };

  const getLinkedQuestName = (questId?: string) => {
    if (!questId) return null;
    const quest = mainQuests.find(q => q.id === questId);
    return quest ? quest.title : t('recurring.unknown_quest');
  };

  const getLinkedSeasonName = (seasonId?: string) => {
    if (!seasonId) return t('recurring.unknown_season');
    const season = activeSeasons.find(s => s.id === seasonId);
    return season ? season.name : t('recurring.unknown_season');
  };

  const getLinkedChapterName = (seasonId?: string, chapterId?: string) => {
    if (!seasonId || !chapterId) return t('recurring.unknown_chapter');
    const season = activeSeasons.find(s => s.id === seasonId);
    if (!season) return t('recurring.unknown_chapter');
    const chapter = season.chapters.find(c => c.id === chapterId);
    return chapter ? `${season.name} - ${chapter.title}` : t('recurring.unknown_chapter');
  };

  if (tasks.length === 0) {
    return (
      <EmptyState>
        <h3>{t('recurring.task_empty_title')}</h3>
        <p>{t('recurring.task_empty_desc')}</p>
      </EmptyState>
    );
  }

  // Calculate stats
  const enabledTasks = tasks.filter(t => t.enabled);
  const dailyCount = tasks.filter(t => t.frequency === 'daily').length;
  const weeklyCount = tasks.filter(t => t.frequency === 'weekly').length;
  const monthlyCount = tasks.filter(t => t.frequency === 'monthly').length;
  const linkedCount = tasks.filter(t => t.linkedMainQuestId || t.linkedSeasonId || t.linkedChapterId).length;

  return (
    <>
      {/* Stats Panel */}
      <StatsContainer>
        <StatCard>
          <StatIcon>⚙️</StatIcon>
          <StatValue>{enabledTasks.length}/{tasks.length}</StatValue>
          <StatLabel>{t('recurring.stat_enabled')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon>📆</StatIcon>
          <StatValue>{dailyCount}</StatValue>
          <StatLabel>{t('recurring.stat_daily')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon>📅</StatIcon>
          <StatValue>{weeklyCount}</StatValue>
          <StatLabel>{t('recurring.stat_weekly')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon>🗓️</StatIcon>
          <StatValue>{monthlyCount}</StatValue>
          <StatLabel>{t('recurring.stat_monthly')}</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon>🔗</StatIcon>
          <StatValue>{linkedCount}</StatValue>
          <StatLabel>{t('recurring.stat_linked')}</StatLabel>
        </StatCard>
      </StatsContainer>

      <Grid>
        {tasks.map(task => (
          <Card key={task.id}>
            <CardHeader>
              <Name>{task.name}</Name>
              <Badge>
                {task.taskType === 'creative' ? t('recurring.type_creative') :
                  task.taskType === 'tax' ? t('recurring.type_tax') :
                    t('recurring.type_maintenance')}
              </Badge>
            </CardHeader>

            <InfoRow>
              📅 {getFrequencyText(task)}
            </InfoRow>

            <InfoRow>
              ⚡ {task.estimatedCosts?.energy ? task.estimatedCosts.energy : (EFFORT_CONFIG[task.effort] ? t(EFFORT_CONFIG[task.effort].labelKey) : t('recurring.importance_medium'))}
            </InfoRow>

            {/* Show linked entity (quest, season, or chapter) */}
            {(task.linkedMainQuestId || task.linkedSeasonId || task.linkedChapterId) && (
              <InfoRow>
                <QuestLink>
                  {task.linkedMainQuestId ? (
                    <>⚔️ {getLinkedQuestName(task.linkedMainQuestId)}</>
                  ) : task.linkedChapterId ? (
                    <>📖 {getLinkedChapterName(task.linkedSeasonId, task.linkedChapterId)}</>
                  ) : task.linkedSeasonId ? (
                    <>📜 {getLinkedSeasonName(task.linkedSeasonId)}</>
                  ) : null}
                </QuestLink>
              </InfoRow>
            )}

            <Actions>
              <ActionButton
                $variant="primary"
                onClick={() => onTrigger(task.id)}
                style={{ marginRight: 'auto' }}
                title={t('recurring.action_trigger')}
              >
                ⚡ {t('recurring.action_trigger')}
              </ActionButton>
              <ActionButton onClick={() => onEdit(task)}>✏️ {t('recurring.action_edit')}</ActionButton>
              <ActionButton $variant="danger" onClick={() => onDelete(task.id)}>{t('season.delete_btn')}</ActionButton>
            </Actions>
          </Card>
        ))}
      </Grid>
    </>
  );
}
