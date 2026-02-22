/**
 * DataManagementModal Component
 * Modal for data export, import, and backup management
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Modal, Button } from '../../../components/ui';
import { useGameStore } from '../../../stores';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import {
  exportGameData,
  copyDataToClipboard,
  importFromFile,
  getDataStats,
  getStorageSize,
  formatBytes,
} from '../../../services/data-export';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContent = styled.div`
  padding: 8px 0;
`;

const Section = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  padding: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 4px;
`;

const StorageInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  margin-bottom: 16px;
`;

const StorageLabel = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StorageValue = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ActionButton = styled(Button)`
  justify-content: flex-start;
  padding: 12px 16px;
`;

const ButtonIcon = styled.span`
  font-size: 1.2rem;
  margin-right: 12px;
`;

const ButtonText = styled.div`
  text-align: left;
`;

const ButtonTitle = styled.div`
  font-weight: 600;
`;

const ButtonDesc = styled.div`
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 2px;
`;

const WarningBox = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
`;

const WarningTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.status.danger.text};
  margin-bottom: 4px;
`;

const WarningText = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SuccessMessage = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.accent.green};
  text-align: center;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.status.danger.text};
  text-align: center;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: flex-end;
`;

export function DataManagementModal({
  isOpen,
  onClose,
}: DataManagementModalProps) {
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingData, setPendingData] = useState<unknown>(null);

  const exportData = useGameStore((s) => s.exportData);
  const loadFromJSON = useGameStore((s) => s.loadFromJSON);
  const resetData = useGameStore((s) => s.resetData);
  const { t } = useTranslation();

  const data = exportData();
  const stats = getDataStats(data);
  const storageSize = getStorageSize();

  const handleExport = () => {
    try {
      exportGameData(data);
      setMessage({ type: 'success', text: t('data.export_success') });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: t('data.export_error') });
    }
  };

  const handleCopyToClipboard = async () => {
    const success = await copyDataToClipboard(data);
    if (success) {
      setMessage({ type: 'success', text: t('data.copy_success') });
    } else {
      setMessage({ type: 'error', text: t('data.copy_error') });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImport = async () => {
    try {
      const result = await importFromFile();

      if (!result.validation.valid) {
        setMessage({
          type: 'error',
          text: `❌ ${t('data.import_error')}：${result.validation.errors.join(', ')}`,
        });
        return;
      }

      // Show confirmation
      setPendingData(result.data);
      setConfirmImport(true);
    } catch (err) {
      if ((err as Error).message !== t('data.import_cancelled')) {
        setMessage({ type: 'error', text: `❌ ${(err as Error).message}` });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const handleConfirmImport = () => {
    if (pendingData) {
      loadFromJSON(pendingData as Parameters<typeof loadFromJSON>[0]);
      setMessage({ type: 'success', text: t('data.import_success') });
      setConfirmImport(false);
      setPendingData(null);

      // Reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const handleCancelImport = () => {
    setConfirmImport(false);
    setPendingData(null);
  };

  const handleReset = () => {
    if (
      window.confirm(
        t('data.reset_confirm')
      )
    ) {
      resetData();
      setMessage({ type: 'success', text: t('data.reset_success') });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('data.title')} width="500px">
      <ModalContent>
        {/* Stats Section */}
        <Section>
          <SectionTitle>{t('data.stats')}</SectionTitle>
          <StatsGrid>
            <StatCard>
              <StatValue>{stats.tasks}</StatValue>
              <StatLabel>{t('data.active_tasks')}</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.archivedTasks}</StatValue>
              <StatLabel>{t('data.archived_tasks')}</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.quests}</StatValue>
              <StatLabel>{t('data.quests')}</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.seasons}</StatValue>
              <StatLabel>{t('data.seasons')}</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.habits}</StatValue>
              <StatLabel>{t('data.habits')}</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.totalXP}</StatValue>
              <StatLabel>{t('data.total_xp')}</StatLabel>
            </StatCard>
          </StatsGrid>
          <StorageInfo>
            <StorageLabel>{t('data.local_storage')}</StorageLabel>
            <StorageValue>{formatBytes(storageSize)}</StorageValue>
          </StorageInfo>
        </Section>

        {/* Export Section */}
        <Section>
          <SectionTitle>{t('data.export')}</SectionTitle>
          <ButtonGroup>
            <ActionButton variant="secondary" onClick={handleExport}>
              <ButtonIcon>💾</ButtonIcon>
              <ButtonText>
                <ButtonTitle>{t('data.export_file')}</ButtonTitle>
                <ButtonDesc>{t('data.export_file_desc')}</ButtonDesc>
              </ButtonText>
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleCopyToClipboard}>
              <ButtonIcon>📋</ButtonIcon>
              <ButtonText>
                <ButtonTitle>{t('data.copy_clipboard')}</ButtonTitle>
                <ButtonDesc>{t('data.copy_clipboard_desc')}</ButtonDesc>
              </ButtonText>
            </ActionButton>
          </ButtonGroup>
        </Section>

        {/* Import Section */}
        <Section>
          <SectionTitle>{t('data.import')}</SectionTitle>
          <ButtonGroup>
            <ActionButton variant="secondary" onClick={handleImport}>
              <ButtonIcon>📂</ButtonIcon>
              <ButtonText>
                <ButtonTitle>{t('data.import_file')}</ButtonTitle>
                <ButtonDesc>{t('data.import_file_desc')}</ButtonDesc>
              </ButtonText>
            </ActionButton>
          </ButtonGroup>
          <WarningBox>
            <WarningTitle>{t('data.warning')}</WarningTitle>
            <WarningText>{t('data.import_warning')}</WarningText>
          </WarningBox>
        </Section>

        {/* Confirm Import Dialog */}
        {confirmImport && (
          <Section>
            <WarningBox>
              <WarningTitle>{t('data.confirm_import_title')}</WarningTitle>
              <WarningText>
                {t('data.confirm_import_text')}
              </WarningText>
              <ConfirmButtons>
                <Button variant="ghost" onClick={handleCancelImport}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" onClick={handleConfirmImport}>
                  {t('data.confirm_import_btn')}
                </Button>
              </ConfirmButtons>
            </WarningBox>
          </Section>
        )}

        {/* Reset Section */}
        <Section>
          <SectionTitle>{t('data.danger_zone')}</SectionTitle>
          <ButtonGroup>
            <ActionButton variant="danger" onClick={handleReset}>
              <ButtonIcon>⚠️</ButtonIcon>
              <ButtonText>
                <ButtonTitle>{t('data.reset_data')}</ButtonTitle>
                <ButtonDesc>{t('data.reset_data_desc')}</ButtonDesc>
              </ButtonText>
            </ActionButton>
          </ButtonGroup>
        </Section>

        {/* Messages */}
        {message && (
          <>
            {message.type === 'success' ? (
              <SuccessMessage>{message.text}</SuccessMessage>
            ) : (
              <ErrorMessage>{message.text}</ErrorMessage>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default DataManagementModal;
