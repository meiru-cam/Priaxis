import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useGameStore } from '../../stores';
import { useTranslation } from '../../lib/i18n/useTranslation';
import type { RewardSticker, RewardVerb } from '../../types/task';
import type { TranslationKey } from '../../lib/i18n/types';
import { parseRewardTexts } from '../../lib/reward-parser';
import { Modal } from '../../components/ui/Modal';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 16px;
`;

const Title = styled.h2`
  margin: 0 0 6px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const VisuallyHiddenLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const FilterSelect = styled.select`
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
`;

const CommandInput = styled.input`
  flex: 1;
  min-width: 220px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
`;

const EditInput = styled(CommandInput)`
  min-width: 0;
  width: 100%;
`;

const Button = styled.button<{ $danger?: boolean }>`
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme, $danger }) => ($danger ? theme.colors.status.danger.border : theme.colors.border.secondary)};
  background: ${({ theme, $danger }) => ($danger ? theme.colors.status.danger.bg : theme.colors.bg.secondary)};
  color: ${({ theme, $danger }) => ($danger ? theme.colors.status.danger.text : theme.colors.text.primary)};
  cursor: pointer;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Hint = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 12px;
`;

const SectionTitle = styled.h3`
  margin: 10px 0 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EditGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px 120px 120px;
  gap: 8px;
  margin-bottom: 8px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
`;

const EditModalLayout = styled.div`
  display: grid;
  gap: 10px;
`;

const EditModalActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const Board = styled.div`
  position: relative;
  height: 520px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  overflow: hidden;
  margin-bottom: 16px;
`;

const Sticker = styled.button<{
  $selected: boolean;
  $x: number;
  $y: number;
  $rotation: number;
  $z: number;
}>`
  position: absolute;
  width: 170px;
  min-height: 90px;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  z-index: ${({ $z }) => $z};
  border: 1px dashed ${({ theme, $selected }) => ($selected ? theme.colors.accent.purple : theme.colors.border.secondary)};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.card.purple.bg};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  padding: 10px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  transform: rotate(${({ $rotation }) => $rotation}deg);
`;

const StickerMain = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
  margin-bottom: 4px;
`;

const StickerMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.35;
`;

const RedeemedList = styled.div`
  display: grid;
  gap: 8px;
`;

const RedeemedItem = styled.button<{ $selected: boolean }>`
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.colors.accent.purple : theme.colors.border.secondary)};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  text-align: left;
  cursor: pointer;
`;

const VerbChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
`;

const VerbChip = styled.span`
  font-size: 0.78rem;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 999px;
  padding: 4px 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

type VerbFilter = RewardVerb | 'all';

const VERBS: RewardVerb[] = ['eat', 'drink', 'buy', 'watch', 'play', 'rest', 'other'];

const VERB_KEY: Record<RewardVerb, TranslationKey> = {
  eat: 'rewards.verb.eat',
  drink: 'rewards.verb.drink',
  buy: 'rewards.verb.buy',
  watch: 'rewards.verb.watch',
  play: 'rewards.verb.play',
  rest: 'rewards.verb.rest',
  other: 'rewards.verb.other',
};

function normalizeCommand(text: string) {
  return text
    .toLowerCase()
    .replace(/^(我)?(想)?(要)?(兑换|使用|redeem|use)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function RewardBoardPage() {
  const { t } = useTranslation();
  const rewardPool = useGameStore((s) => s.rewardPool || []);
  const goldBalance = useGameStore((s) => s.resources.money.balance);
  const redeemRewardSticker = useGameStore((s) => s.redeemRewardSticker);
  const deleteRewardSticker = useGameStore((s) => s.deleteRewardSticker);
  const updateRewardStickerPosition = useGameStore((s) => s.updateRewardStickerPosition);
  const updateRewardStickerData = useGameStore((s) => s.updateRewardStickerData);
  const randomizeRewardBoardLayout = useGameStore((s) => s.randomizeRewardBoardLayout);
  const logs = useGameStore((s) => s.rewardActionLogs || []);
  const addRewardActionLog = useGameStore((s) => s.addRewardActionLog);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [filter, setFilter] = useState<VerbFilter>('all');
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [editRawText, setEditRawText] = useState('');
  const [editVerb, setEditVerb] = useState<RewardVerb>('other');
  const [editObject, setEditObject] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    zIndex: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const available = useMemo(() => rewardPool.filter((r) => r.status === 'available'), [rewardPool]);
  const redeemed = useMemo(() => rewardPool.filter((r) => r.status === 'redeemed'), [rewardPool]);
  const maxZ = useMemo(() => Math.max(1, ...available.map((r) => r.zIndex || 1)), [available]);

  const visibleAvailable = useMemo(
    () => available.filter((item) => filter === 'all' || item.verb === filter),
    [available, filter]
  );

  const counts = useMemo(() => {
    const map: Record<RewardVerb, number> = { eat: 0, drink: 0, buy: 0, watch: 0, play: 0, rest: 0, other: 0 };
    available.forEach((item) => { map[item.verb] += 1; });
    return map;
  }, [available]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addLog = (text: string) => {
    addRewardActionLog(text);
  };

  const redeemSelected = () => {
    if (selectedIds.length === 0) return;
    let failNonAvailable = false;
    let successCount = 0;
    let failInsufficient = false;
    selectedIds.forEach((id) => {
      const result = redeemRewardSticker(id);
      if (result.success) successCount += 1;
      if (result.reason === 'insufficient_gold') failInsufficient = true;
      if (result.reason === 'already_redeemed' || result.reason === 'not_found') failNonAvailable = true;
    });
    if (successCount > 0) {
      addLog(t('rewards.log_redeemed_count').replace('{count}', successCount.toString()));
    }
    if (failInsufficient) {
      addLog(t('rewards.error_insufficient_gold'));
    }
    if (failNonAvailable) {
      addLog(t('rewards.command_not_found'));
    }
    setSelectedIds([]);
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => deleteRewardSticker(id));
    addLog(t('rewards.log_deleted_count').replace('{count}', selectedIds.length.toString()));
    if (editingStickerId && selectedIds.includes(editingStickerId)) {
      setEditingStickerId(null);
    }
    setSelectedIds([]);
  };

  const randomizeLayout = () => {
    if (available.length === 0) return;
    randomizeRewardBoardLayout();
    addLog(t('rewards.log_shuffled').replace('{count}', available.length.toString()));
  };

  const executeCommand = () => {
    const raw = command.trim();
    if (!raw) return;
    const normalized = normalizeCommand(raw);
    const parsed = parseRewardTexts(normalized);
    const first = parsed[0];
    if (!first) {
      addLog(t('rewards.command_not_found'));
      return;
    }

    const scored = available
      .map((item) => {
        let score = 0;
        if (first.verb !== 'other' && item.verb === first.verb) score += 3;
        if (first.object && item.object.includes(first.object)) score += 4;
        if (first.object && item.rawText.includes(first.object)) score += 2;
        if (first.quantity && item.quantity === first.quantity) score += 2;
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      addLog(t('rewards.command_not_found'));
      return;
    }

    // Upgrade: if command says quantity and multiple stickers match, redeem multiple.
    const targetCount = Math.max(1, first.quantity || 1);
    const chosen = scored.slice(0, targetCount).map((x) => x.item);
    const redeemedItems: RewardSticker[] = [];
    let failInsufficient = false;
    let failNonAvailable = false;
    chosen.forEach((item) => {
      const result = redeemRewardSticker(item.id);
      if (result.success) redeemedItems.push(item);
      if (result.reason === 'insufficient_gold') failInsufficient = true;
      if (result.reason === 'already_redeemed' || result.reason === 'not_found') failNonAvailable = true;
    });
    if (redeemedItems.length > 0) {
      addLog(
        t('rewards.command_success_count')
          .replace('{count}', redeemedItems.length.toString())
          .replace('{item}', redeemedItems.map((x) => x.rawText).join(' / '))
      );
    }
    if (failInsufficient) {
      addLog(t('rewards.error_insufficient_gold'));
    }
    if (failNonAvailable) {
      addLog(t('rewards.command_not_found'));
    }
    setCommand('');
  };

  const onStickerPointerDown = (e: React.PointerEvent<HTMLButtonElement>, sticker: RewardSticker) => {
    if (e.button !== 0) return;
    if (!boardRef.current) return;
    e.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    dragState.current = {
      id: sticker.id,
      offsetX: e.clientX - rect.left - sticker.x,
      offsetY: e.clientY - rect.top - sticker.y,
      zIndex: maxZ + 1,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };
  };

  const onStickerClick = (item: RewardSticker) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleSelect(item.id);
  };

  const onStickerContextMenu = (e: React.MouseEvent<HTMLButtonElement>, item: RewardSticker) => {
    e.preventDefault();
    setEditingStickerId(item.id);
    setEditRawText(item.rawText || '');
    setEditVerb(item.verb);
    setEditObject(item.object || '');
    setEditQuantity(item.quantity ? String(item.quantity) : '');
    setEditUnit(item.unit || '');
  };

  const saveStickerEdit = () => {
    if (!editingStickerId) return;
    const trimmedRaw = editRawText.trim();
    const trimmedObject = editObject.trim();
    if (!trimmedRaw && !trimmedObject) return;
    const quantityNumber = editQuantity.trim() ? Number(editQuantity) : undefined;
    updateRewardStickerData(editingStickerId, {
      rawText: trimmedRaw || trimmedObject,
      verb: editVerb,
      object: trimmedObject || trimmedRaw,
      quantity: quantityNumber && quantityNumber > 0 ? quantityNumber : undefined,
      unit: editUnit.trim() || undefined,
    });
    addLog(t('rewards.log_updated'));
    setEditingStickerId(null);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!boardRef.current || !dragState.current) return;
      const dx = e.clientX - dragState.current.startClientX;
      const dy = e.clientY - dragState.current.startClientY;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) return;
      dragState.current.moved = true;
      const rect = boardRef.current.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left - dragState.current.offsetX, 0, rect.width - 170);
      const y = clamp(e.clientY - rect.top - dragState.current.offsetY, 0, rect.height - 90);
      suppressClickRef.current = true;
      updateRewardStickerPosition(dragState.current.id, x, y, dragState.current.zIndex);
    };

    const handlePointerUp = () => {
      if (dragState.current?.moved) {
        suppressClickRef.current = true;
      }
      dragState.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [updateRewardStickerPosition]);

  return (
    <PageContainer>
      <Header>
        <Title>🎁 {t('rewards.title')}</Title>
        <Subtitle>{t('rewards.subtitle')}</Subtitle>
      </Header>

      <Toolbar>
        <VisuallyHiddenLabel htmlFor="reward-filter">{t('rewards.filter_label')}</VisuallyHiddenLabel>
        <FilterSelect
          id="reward-filter"
          name="reward-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as VerbFilter)}
        >
          <option value="all">{t('rewards.filter_all')}</option>
          {VERBS.map((verb) => (
            <option key={verb} value={verb}>{t(VERB_KEY[verb])}</option>
          ))}
        </FilterSelect>
        <Button onClick={randomizeLayout}>{t('rewards.shuffle_layout')}</Button>
        <VisuallyHiddenLabel htmlFor="reward-command">{t('rewards.command_label')}</VisuallyHiddenLabel>
        <CommandInput
          id="reward-command"
          name="reward-command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={t('rewards.command_placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) executeCommand();
          }}
        />
        <Button onClick={executeCommand} disabled={available.length === 0}>{t('rewards.redeem_btn')}</Button>
        <Button onClick={redeemSelected} disabled={selectedIds.length === 0}>{t('rewards.redeem_selected')}</Button>
        <Button $danger onClick={deleteSelected}>{t('rewards.delete_selected')}</Button>
      </Toolbar>

      <VerbChipRow>
        {VERBS.map((verb) => (
          <VerbChip key={verb}>
            {t(VERB_KEY[verb])}: {counts[verb]}
          </VerbChip>
        ))}
      </VerbChipRow>

      <Hint>{t('rewards.selected_count').replace('{count}', selectedIds.length.toString())}</Hint>
      <Hint>{t('rewards.gold_balance').replace('{balance}', goldBalance.toString())}</Hint>

      <Board ref={boardRef}>
        {visibleAvailable.length === 0 ? (
          <Hint style={{ padding: 12 }}>{t('rewards.empty_available')}</Hint>
        ) : (
          visibleAvailable.map((item) => (
            <Sticker
              key={item.id}
              $selected={selectedIds.includes(item.id)}
              $x={item.x}
              $y={item.y}
              $rotation={item.rotation}
              $z={item.zIndex || 1}
              onClick={() => onStickerClick(item)}
              onContextMenu={(e) => onStickerContextMenu(e, item)}
              onPointerDown={(e) => onStickerPointerDown(e, item)}
              title={item.rawText}
            >
              <StickerMain>
                {item.quantity ? `x${item.quantity}${item.unit || ''} ` : ''}
                {item.object}
              </StickerMain>
              <StickerMeta>
                {t('rewards.price_label').replace('{tier}', item.priceTier).replace('{price}', item.priceGold.toString())}
                {' · '}
                {t(VERB_KEY[item.verb])}
                {item.sourceTaskName ? ` · ${t('rewards.source_task').replace('{task}', item.sourceTaskName)}` : ''}
              </StickerMeta>
            </Sticker>
          ))
        )}
      </Board>

      <SectionTitle>{t('rewards.log_title')}</SectionTitle>
      {logs.length === 0 ? (
        <Hint>{t('rewards.log_empty')}</Hint>
      ) : (
        <RedeemedList>
          {logs.map((log) => (
            <RedeemedItem key={log.id} $selected={false}>{log.text}</RedeemedItem>
          ))}
        </RedeemedList>
      )}

      <SectionTitle style={{ marginTop: 16 }}>{t('rewards.redeemed')}</SectionTitle>
      {redeemed.length === 0 ? (
        <Hint>{t('rewards.empty_redeemed')}</Hint>
      ) : (
        <RedeemedList>
          {redeemed.map((item) => (
            <RedeemedItem
              key={item.id}
              $selected={selectedIds.includes(item.id)}
              onClick={() => toggleSelect(item.id)}
            >
              {item.rawText}
            </RedeemedItem>
          ))}
        </RedeemedList>
      )}

      <Modal
        isOpen={!!editingStickerId}
        onClose={() => setEditingStickerId(null)}
        title={t('rewards.edit_title')}
        size="md"
      >
        <EditModalLayout>
          <EditGrid>
            <VisuallyHiddenLabel htmlFor="reward-edit-raw">{t('rewards.edit_raw_label')}</VisuallyHiddenLabel>
            <EditInput
              id="reward-edit-raw"
              name="reward-edit-raw"
              value={editRawText}
              onChange={(e) => setEditRawText(e.target.value)}
              placeholder={t('rewards.edit_raw')}
            />
            <VisuallyHiddenLabel htmlFor="reward-edit-verb">{t('rewards.edit_verb_label')}</VisuallyHiddenLabel>
            <FilterSelect
              id="reward-edit-verb"
              name="reward-edit-verb"
              value={editVerb}
              onChange={(e) => setEditVerb(e.target.value as RewardVerb)}
            >
              {VERBS.map((verb) => (
                <option key={verb} value={verb}>{t(VERB_KEY[verb])}</option>
              ))}
            </FilterSelect>
            <VisuallyHiddenLabel htmlFor="reward-edit-quantity">{t('rewards.edit_quantity_label')}</VisuallyHiddenLabel>
            <EditInput
              id="reward-edit-quantity"
              name="reward-edit-quantity"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value.replace(/[^\d]/g, ''))}
              placeholder={t('rewards.edit_quantity')}
            />
            <VisuallyHiddenLabel htmlFor="reward-edit-unit">{t('rewards.edit_unit_label')}</VisuallyHiddenLabel>
            <EditInput
              id="reward-edit-unit"
              name="reward-edit-unit"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              placeholder={t('rewards.edit_unit')}
            />
          </EditGrid>
          <VisuallyHiddenLabel htmlFor="reward-edit-object">{t('rewards.edit_object_label')}</VisuallyHiddenLabel>
          <EditInput
            id="reward-edit-object"
            name="reward-edit-object"
            value={editObject}
            onChange={(e) => setEditObject(e.target.value)}
            placeholder={t('rewards.edit_object')}
          />
          <EditModalActions>
            <Button onClick={() => setEditingStickerId(null)}>{t('rewards.edit_cancel')}</Button>
            <Button onClick={saveStickerEdit}>{t('rewards.edit_save')}</Button>
          </EditModalActions>
        </EditModalLayout>
      </Modal>
    </PageContainer>
  );
}

export default RewardBoardPage;
