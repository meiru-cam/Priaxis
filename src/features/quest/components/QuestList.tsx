/**
 * QuestList Component
 * List of quest cards with filtering and grouping
 */

import styled from 'styled-components';
import { QuestCard } from './QuestCard';
import type { MainQuest, Status, CustomTask, Importance, Season } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { getEffectiveQuestStatus } from '../../../lib/hierarchy-status';

interface QuestListProps {
  quests: MainQuest[];
  linkedTasksMap?: Record<string, CustomTask[]>;
  seasons?: Season[];
  onEdit: (quest: MainQuest) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onStatusChange: (id: string, status: Status) => void;
  onAddTask?: (questId: string) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onUpdateDates?: (id: string, updates: { unlockTime?: string; deadline?: string }) => void;
  onUpdateImportance?: (id: string, importance: Importance) => void;
  onUpdateLinkedChapter?: (id: string, chapterId: string | undefined, seasonId: string | undefined) => void;
  emptyMessage?: string;
  isArchived?: boolean;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  margin: 24px 0 12px;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;

  &:first-child {
    margin-top: 0;
  }
`;

const QuestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 1rem;
`;

const CollapsibleSection = styled.details`
  margin-top: 24px;

  &[open] summary::after {
    transform: rotate(180deg);
  }
`;

const SectionSummary = styled.summary`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 12px;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    content: '▼';
    font-size: 0.7rem;
    margin-left: auto;
    transition: transform 0.2s ease;
  }
`;



interface QuestListProps {
  quests: MainQuest[];
  linkedTasksMap?: Record<string, CustomTask[]>;
  seasons?: Season[];
  onEdit: (quest: MainQuest) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onStatusChange: (id: string, status: Status) => void;
  onAddTask?: (questId: string) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onUpdateDates?: (id: string, updates: { unlockTime?: string; deadline?: string }) => void;
  onUpdateImportance?: (id: string, importance: Importance) => void;
  onUpdateLinkedChapter?: (id: string, chapterId: string | undefined, seasonId: string | undefined) => void;
  emptyMessage?: string;
  isArchived?: boolean;
}

const CountBadge = styled.span`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
`;

export function QuestList({
  quests,
  linkedTasksMap,
  seasons,
  onEdit,
  onDelete,
  onArchive,
  onUpdateProgress,
  onStatusChange,
  onAddTask,
  onToggleTaskComplete,
  onUpdateDates,
  onUpdateImportance,
  onUpdateLinkedChapter,
  emptyMessage,
  isArchived = false,
}: QuestListProps) {
  const { t } = useTranslation();
  const effectiveStatusByQuestId: Record<string, Status> = {};
  quests.forEach((q) => {
    effectiveStatusByQuestId[q.id] = getEffectiveQuestStatus(q, seasons || []);
  });

  // Group quests by status
  const activeQuests = quests.filter((q) => effectiveStatusByQuestId[q.id] === 'active');
  const pausedQuests = quests.filter((q) => effectiveStatusByQuestId[q.id] === 'paused');
  const lockedQuests = quests
    .filter((q) => effectiveStatusByQuestId[q.id] === 'locked')
    .sort((a, b) => {
      if (!a.unlockTime && !b.unlockTime) return 0;
      if (!a.unlockTime) return 1;
      if (!b.unlockTime) return -1;
      return new Date(a.unlockTime).getTime() - new Date(b.unlockTime).getTime();
    });
  const completedQuests = quests.filter((q) => effectiveStatusByQuestId[q.id] === 'completed');
  const archivedQuests = quests.filter((q) => effectiveStatusByQuestId[q.id] === 'archived');

  // Sort active quests by deadline urgency
  const sortedActiveQuests = [...activeQuests].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  if (quests.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>🎯</EmptyIcon>
        <EmptyText>{emptyMessage || t('quest.list.empty_message')}</EmptyText>
      </EmptyState>
    );
  }

  const renderQuestCard = (quest: MainQuest) => (
    <QuestCard
      key={quest.id}
      quest={quest}
      linkedTasks={linkedTasksMap?.[quest.id]}
      seasons={seasons}
      onEdit={onEdit}
      onDelete={onDelete}
      onArchive={onArchive}
      onUpdateProgress={onUpdateProgress}
      onStatusChange={onStatusChange}
      onAddTask={onAddTask}
      onToggleTaskComplete={onToggleTaskComplete}
      onUpdateDates={onUpdateDates}
      onUpdateImportance={onUpdateImportance}
      onUpdateLinkedChapter={onUpdateLinkedChapter}
      isArchived={isArchived}
    />
  );

  return (
    <ListContainer>
      {/* Active Quests */}
      {sortedActiveQuests.length > 0 && (
        <>
          <SectionTitle>
            🟢 {t('quest.status.active')} <CountBadge>{sortedActiveQuests.length}</CountBadge>
          </SectionTitle>
          <QuestGrid>
            {sortedActiveQuests.map(renderQuestCard)}
          </QuestGrid>
        </>
      )}

      {/* Paused Quests */}
      {pausedQuests.length > 0 && (
        <CollapsibleSection>
          <SectionSummary>
            ⏸️ {t('quest.status.paused')} <CountBadge>{pausedQuests.length}</CountBadge>
          </SectionSummary>
          <QuestGrid>
            {pausedQuests.map(renderQuestCard)}
          </QuestGrid>
        </CollapsibleSection>
      )}

      {/* Locked Quests */}
      {lockedQuests.length > 0 && (
        <CollapsibleSection>
          <SectionSummary>
            🔒 {t('quest.status.locked')} <CountBadge>{lockedQuests.length}</CountBadge>
          </SectionSummary>
          <QuestGrid>
            {lockedQuests.map(renderQuestCard)}
          </QuestGrid>
        </CollapsibleSection>
      )}

      {/* Completed Quests */}
      {completedQuests.length > 0 && (
        <CollapsibleSection>
          <SectionSummary>
            ✅ {t('quest.status.completed')} <CountBadge>{completedQuests.length}</CountBadge>
          </SectionSummary>
          <QuestGrid>
            {completedQuests.map(renderQuestCard)}
          </QuestGrid>
        </CollapsibleSection>
      )}

      {/* Archived Quests */}
      {archivedQuests.length > 0 && (
        <CollapsibleSection open>
          <SectionSummary>
            📦 {t('quest.status.archived')} <CountBadge>{archivedQuests.length}</CountBadge>
          </SectionSummary>
          <QuestGrid>
            {archivedQuests.map(renderQuestCard)}
          </QuestGrid>
        </CollapsibleSection>
      )}
    </ListContainer>
  );
}

export default QuestList;
