/**
 * HierarchyTree Component
 * Collapsible tree view for Season -> Chapter -> Quest -> Task hierarchy
 */

import { useState } from 'react';
import styled from 'styled-components';
import type { Season, MainQuest, CustomTask, Chapter } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// Helper functions
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  const deadline = new Date(dateStr);
  deadline.setHours(23, 59, 59, 999);
  return deadline < new Date();
}

// Selection types
type SelectedItem =
  | { type: 'season'; id: string }
  | { type: 'chapter'; seasonId: string; chapterId: string }
  | { type: 'quest'; id: string }
  | { type: 'task'; id: string }
  | null;

interface HierarchyTreeProps {
  seasons: Season[];
  quests: MainQuest[];
  tasks: CustomTask[];
  selectedItem: SelectedItem;
  onSelect: (item: SelectedItem) => void;
}

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TreeItem = styled.div<{ $level: number; $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  padding-left: ${({ $level }) => 12 + $level * 16}px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent.purple : 'transparent'};
  color: ${({ $selected, theme }) =>
    $selected ? 'white' : theme.colors.text.primary};

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? theme.colors.accent.purple : theme.colors.bg.tertiary};
  }
`;

const ExpandButton = styled.button<{ $expanded: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.7rem;
  transition: transform 0.2s ease;
  transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0deg')});
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const ItemIcon = styled.span`
  font-size: 1rem;
  flex-shrink: 0;
`;

const ItemLabel = styled.span<{ $completed?: boolean }>`
  flex: 1;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
  opacity: ${({ $completed }) => ($completed ? 0.6 : 1)};
`;

const ItemMeta = styled.span`
  font-size: 0.75rem;
  opacity: 0.7;
  flex-shrink: 0;
`;

const EmptyPlaceholder = styled.div<{ $level: number }>`
  padding: 6px 12px;
  padding-left: ${({ $level }) => 12 + $level * 16}px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`;

const OrphanSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.primary};
`;

export function HierarchyTree({
  seasons,
  quests,
  tasks,
  selectedItem,
  onSelect,
}: HierarchyTreeProps) {
  const { t } = useTranslation();
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(
    new Set(seasons.map((s) => s.id))
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());
  const [expandedOrphanQuests, setExpandedOrphanQuests] = useState(true);
  const [expandedOrphanTasks, setExpandedOrphanTasks] = useState(true);

  const toggleSeason = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleChapter = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleQuest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedQuests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Find orphan quests (not linked to any season) - sort: incomplete first
  const orphanQuests = quests
    .filter((q) => !q.seasonId)
    .sort((a, b) => {
      const aCompleted = a.status === 'completed' ? 1 : 0;
      const bCompleted = b.status === 'completed' ? 1 : 0;
      return aCompleted - bCompleted;
    });

  // Find orphan tasks (not linked to any quest) - sort: incomplete first
  const orphanTasks = tasks
    .filter((t) => !t.linkedMainQuestId)
    .sort((a, b) => {
      const aCompleted = a.completed ? 1 : 0;
      const bCompleted = b.completed ? 1 : 0;
      return aCompleted - bCompleted;
    });

  const isSelected = (type: string, id: string, extra?: { seasonId?: string }) => {
    if (!selectedItem) return false;
    if (selectedItem.type !== type) return false;
    if (selectedItem.type === 'chapter') {
      return (
        selectedItem.chapterId === id && selectedItem.seasonId === extra?.seasonId
      );
    }
    return 'id' in selectedItem && selectedItem.id === id;
  };

  const renderTask = (task: CustomTask, level: number) => (
    <TreeItem
      key={task.id}
      $level={level}
      $selected={isSelected('task', task.id)}
      onClick={() => onSelect({ type: 'task', id: task.id })}
    >
      <ItemIcon>{task.completed ? '✅' : '⬜'}</ItemIcon>
      <ItemLabel $completed={task.completed}>{task.name}</ItemLabel>
    </TreeItem>
  );

  const renderQuest = (quest: MainQuest, level: number) => {
    const linkedTasks = tasks
      .filter((t) => t.linkedMainQuestId === quest.id)
      .sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    const hasChildren = linkedTasks.length > 0;
    const isExpanded = expandedQuests.has(quest.id);

    return (
      <div key={quest.id}>
        <TreeItem
          $level={level}
          $selected={isSelected('quest', quest.id)}
          onClick={() => onSelect({ type: 'quest', id: quest.id })}
        >
          {hasChildren ? (
            <ExpandButton
              $expanded={isExpanded}
              onClick={(e) => toggleQuest(quest.id, e)}
            >
              ▶
            </ExpandButton>
          ) : (
            <span style={{ width: 20 }} />
          )}
          <ItemIcon>📋</ItemIcon>
          <ItemLabel $completed={quest.status === 'completed'}>
            {quest.title}
          </ItemLabel>
          {quest.deadline && (
            <ItemMeta style={{ color: isOverdue(quest.deadline) ? '#ef4444' : undefined }}>
              📅 {formatShortDate(quest.deadline)}
            </ItemMeta>
          )}
          <ItemMeta>{quest.progress}%</ItemMeta>
        </TreeItem>

        {isExpanded &&
          (linkedTasks.length > 0 ? (
            linkedTasks.map((task) => renderTask(task, level + 1))
          ) : (
            <EmptyPlaceholder $level={level + 1}>{t('cmd.tree.empty_linked_tasks')}</EmptyPlaceholder>
          ))}
      </div>
    );
  };

  const renderChapter = (chapter: Chapter, seasonId: string, level: number) => {
    const linkedQuests = quests
      .filter((q) => q.linkedChapterId === chapter.id && q.seasonId === seasonId)
      .sort((a, b) => {
        const aCompleted = a.status === 'completed' ? 1 : 0;
        const bCompleted = b.status === 'completed' ? 1 : 0;
        return aCompleted - bCompleted;
      });
    const hasChildren = linkedQuests.length > 0;
    const isExpanded = expandedChapters.has(chapter.id);

    return (
      <div key={chapter.id}>
        <TreeItem
          $level={level}
          $selected={isSelected('chapter', chapter.id, { seasonId })}
          onClick={() =>
            onSelect({ type: 'chapter', seasonId, chapterId: chapter.id })
          }
        >
          {hasChildren ? (
            <ExpandButton
              $expanded={isExpanded}
              onClick={(e) => toggleChapter(chapter.id, e)}
            >
              ▶
            </ExpandButton>
          ) : (
            <span style={{ width: 20 }} />
          )}
          <ItemIcon>📖</ItemIcon>
          <ItemLabel $completed={chapter.status === 'completed'}>
            {chapter.title}
          </ItemLabel>
          {chapter.deadline && (
            <ItemMeta style={{ color: isOverdue(chapter.deadline) ? '#ef4444' : undefined }}>
              📅 {formatShortDate(chapter.deadline)}
            </ItemMeta>
          )}
          <ItemMeta>{chapter.progress}%</ItemMeta>
        </TreeItem>

        {isExpanded &&
          (linkedQuests.length > 0 ? (
            linkedQuests.map((quest) => renderQuest(quest, level + 1))
          ) : (
            <EmptyPlaceholder $level={level + 1}>{t('cmd.tree.empty_linked_quests')}</EmptyPlaceholder>
          ))}
      </div>
    );
  };

  const renderSeason = (season: Season) => {
    const isExpanded = expandedSeasons.has(season.id);
    const hasChildren = season.chapters.length > 0;

    // Also find quests directly linked to season but not to a chapter - sort: incomplete first
    const directQuests = quests
      .filter((q) => q.seasonId === season.id && !q.linkedChapterId)
      .sort((a, b) => {
        const aCompleted = a.status === 'completed' ? 1 : 0;
        const bCompleted = b.status === 'completed' ? 1 : 0;
        return aCompleted - bCompleted;
      });
    
    // Sort chapters: incomplete first
    const sortedChapters = [...season.chapters].sort((a, b) => {
      const aCompleted = a.status === 'completed' ? 1 : 0;
      const bCompleted = b.status === 'completed' ? 1 : 0;
      return aCompleted - bCompleted;
    });

    // Calculate overall season progress
    const allLinkedQuests = quests.filter((q) => q.seasonId === season.id);
    const seasonProgress = allLinkedQuests.length > 0
      ? Math.round(allLinkedQuests.reduce((sum, q) => sum + q.progress, 0) / allLinkedQuests.length)
      : 0;

    return (
      <div key={season.id}>
        <TreeItem
          $level={0}
          $selected={isSelected('season', season.id)}
          onClick={() => onSelect({ type: 'season', id: season.id })}
        >
          {hasChildren || directQuests.length > 0 ? (
            <ExpandButton
              $expanded={isExpanded}
              onClick={(e) => toggleSeason(season.id, e)}
            >
              ▶
            </ExpandButton>
          ) : (
            <span style={{ width: 20 }} />
          )}
          <ItemIcon>📜</ItemIcon>
          <ItemLabel>{season.name}</ItemLabel>
          {season.endDate && (
            <ItemMeta style={{ color: isOverdue(season.endDate) ? '#ef4444' : undefined }}>
              📅 {formatShortDate(season.endDate)}
            </ItemMeta>
          )}
          <ItemMeta>{seasonProgress}%</ItemMeta>
        </TreeItem>

        {isExpanded && (
          <>
            {sortedChapters.map((chapter) =>
              renderChapter(chapter, season.id, 1)
            )}
            {/* Direct quests without chapter - show as collapsible group */}
            {directQuests.length > 0 && (
              <div>
                <TreeItem
                  $level={1}
                  $selected={false}
                  onClick={() => toggleChapter(`${season.id}-direct`)}
                  style={{ opacity: 0.8, fontStyle: 'italic' }}
                >
                  <ExpandButton
                    $expanded={expandedChapters.has(`${season.id}-direct`)}
                    onClick={(e) => toggleChapter(`${season.id}-direct`, e)}
                  >
                    ▶
                  </ExpandButton>
                  <ItemIcon>📂</ItemIcon>
                  <ItemLabel>{t('cmd.tree.uncategorized_quests')}</ItemLabel>
                  <ItemMeta>{t('cmd.tree.count_items', { count: directQuests.length })}</ItemMeta>
                </TreeItem>
                {expandedChapters.has(`${season.id}-direct`) &&
                  directQuests.map((quest) => renderQuest(quest, 2))}
              </div>
            )}
            {sortedChapters.length === 0 && directQuests.length === 0 && (
              <EmptyPlaceholder $level={1}>{t('cmd.tree.empty_chapters_or_quests')}</EmptyPlaceholder>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <TreeContainer>
      {seasons.length > 0 ? (
        seasons.map(renderSeason)
      ) : (
        <EmptyPlaceholder $level={0}>{t('cmd.tree.empty_seasons')}</EmptyPlaceholder>
      )}

      {/* Orphan Quests Section */}
      {orphanQuests.length > 0 && (
        <OrphanSection>
          <TreeItem
            $level={0}
            $selected={false}
            onClick={() => setExpandedOrphanQuests(!expandedOrphanQuests)}
            style={{ background: 'transparent' }}
          >
            <ExpandButton $expanded={expandedOrphanQuests} onClick={(e) => { e.stopPropagation(); setExpandedOrphanQuests(!expandedOrphanQuests); }}>
              ▶
            </ExpandButton>
            <ItemIcon>📋</ItemIcon>
            <ItemLabel>{t('cmd.tree.orphan_quests')}</ItemLabel>
            <ItemMeta>
              {orphanQuests.filter(q => q.status !== 'completed').length}/{orphanQuests.length}
            </ItemMeta>
          </TreeItem>
          {expandedOrphanQuests && orphanQuests.map((quest) => renderQuest(quest, 1))}
        </OrphanSection>
      )}

      {/* Orphan Tasks Section */}
      {orphanTasks.length > 0 && (
        <OrphanSection>
          <TreeItem
            $level={0}
            $selected={false}
            onClick={() => setExpandedOrphanTasks(!expandedOrphanTasks)}
            style={{ background: 'transparent' }}
          >
            <ExpandButton $expanded={expandedOrphanTasks} onClick={(e) => { e.stopPropagation(); setExpandedOrphanTasks(!expandedOrphanTasks); }}>
              ▶
            </ExpandButton>
            <ItemIcon>✅</ItemIcon>
            <ItemLabel>{t('cmd.tree.orphan_tasks')}</ItemLabel>
            <ItemMeta>
              {orphanTasks.filter(t => !t.completed).length}/{orphanTasks.length}
            </ItemMeta>
          </TreeItem>
          {expandedOrphanTasks && (
            <>
              {orphanTasks.slice(0, 20).map((task) => renderTask(task, 1))}
              {orphanTasks.length > 20 && (
                <EmptyPlaceholder $level={1}>
                  {t('cmd.tree.more_tasks', { count: orphanTasks.length - 20 })}
                </EmptyPlaceholder>
              )}
            </>
          )}
        </OrphanSection>
      )}
    </TreeContainer>
  );
}

export default HierarchyTree;
