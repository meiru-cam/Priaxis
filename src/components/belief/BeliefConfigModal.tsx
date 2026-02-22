import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Modal, Button, Textarea } from '../ui';
import type { BeliefSystemMode } from '../../types/game-data';
import { useTranslation } from '../../lib/i18n/useTranslation';

interface BeliefConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: BeliefSystemMode;
  profileBeliefs: string[];
  onSave: (nextMode: BeliefSystemMode, nextBeliefs: string[]) => void;
}

const Row = styled.div`
  display: flex;
  gap: 8px;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent.purple : theme.colors.border.primary)};
  background: ${({ theme, $active }) => ($active ? theme.colors.card.purple.bg : theme.colors.bg.tertiary)};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
`;

const Hint = styled.p`
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`;

const Footer = styled.div`
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export function BeliefConfigModal({
  isOpen,
  onClose,
  mode,
  profileBeliefs,
  onSave,
}: BeliefConfigModalProps) {
  const { t, language } = useTranslation();
  const [draftMode, setDraftMode] = useState<BeliefSystemMode>(mode);
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraftMode(mode);
    setDraftText(profileBeliefs.join('\n'));
  }, [isOpen, mode, profileBeliefs]);

  const defaultBeliefsPreview = useMemo(() => (
    language === 'zh'
      ? ['先完成再优化', '行动产生反馈', '小步快跑更可持续', '尊重精力边界', '长期主义']
      : ['Done before perfect', 'Action creates feedback', 'Small steps compound', 'Respect energy limits', 'Think long-term']
  ), [language]);

  const handleSave = () => {
    const nextBeliefs = draftText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    onSave(draftMode, nextBeliefs);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('belief.config_title')}
      subtitle={t('belief.config_subtitle')}
      size="md"
    >
      <Row>
        <ModeButton
          type="button"
          $active={draftMode === 'default'}
          onClick={() => setDraftMode('default')}
        >
          {t('belief.mode_default')}
        </ModeButton>
        <ModeButton
          type="button"
          $active={draftMode === 'profile'}
          onClick={() => setDraftMode('profile')}
        >
          {t('belief.mode_profile')}
        </ModeButton>
      </Row>

      {draftMode === 'default' ? (
        <Hint>{defaultBeliefsPreview.join(' / ')}</Hint>
      ) : (
        <>
          <Textarea
            id="belief-profile-text"
            name="beliefProfileText"
            minRows={5}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={t('belief.profile_placeholder')}
          />
          <Hint>{t('belief.profile_hint')}</Hint>
        </>
      )}

      <Footer>
        <Button variant="secondary" type="button" onClick={onClose}>
          {t('belief.cancel')}
        </Button>
        <Button type="button" onClick={handleSave}>
          {t('belief.save')}
        </Button>
      </Footer>
    </Modal>
  );
}

export default BeliefConfigModal;
