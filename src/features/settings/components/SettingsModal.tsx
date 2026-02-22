/**
 * SettingsModal Component
 * Centralized settings for Appearance and Data Management
 */

// import { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '../../../components/ui';
import { useGameStore, useUIStore } from '../../../stores';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import {
    getStorageSize,
    formatBytes,
} from '../../../services/data-export';
import type { TranslationKey } from '../../../lib/i18n/types';
import type { RewardVerb } from '../../../types/task';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type LightThemeVariant = 'solarized';
type DarkThemeVariant = 'solarized' | 'tomorrow' | 'vscode';

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Label = styled.label`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Select = styled.select`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.9rem;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const NumberInput = styled.input`
  width: 100px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.9rem;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const HintText = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const rewardVerbKeys: Record<RewardVerb, TranslationKey> = {
    eat: 'rewards.verb.eat',
    drink: 'rewards.verb.drink',
    buy: 'rewards.verb.buy',
    watch: 'rewards.verb.watch',
    play: 'rewards.verb.play',
    rest: 'rewards.verb.rest',
    other: 'rewards.verb.other',
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const lightVariant = useUIStore((s) => s.lightThemeVariant);
    const darkVariant = useUIStore((s) => s.darkThemeVariant);
    const setLightVariant = useUIStore((s) => s.setLightThemeVariant);
    const setDarkVariant = useUIStore((s) => s.setDarkThemeVariant);
    const rewardPricing = useGameStore((s) => s.rewardPricing);
    const updateRewardPricing = useGameStore((s) => s.updateRewardPricing);
    const { t } = useTranslation();

    // Storage stats for Data section preview
    const storageSize = getStorageSize();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')} width="500px">
            <ModalContent>
                {/* Appearance Section */}
                <Section>
                    <SectionTitle>{t('settings.appearance')}</SectionTitle>

                    <SettingRow>
                        <Label htmlFor="settings-theme-light">{t('settings.theme_light')}</Label>
                        <Select
                            id="settings-theme-light"
                            name="lightTheme"
                            value={lightVariant}
                            onChange={(e) => setLightVariant(e.target.value as LightThemeVariant)}
                        >
                            <option value="solarized">Solarized Light</option>
                        </Select>
                    </SettingRow>

                    <SettingRow>
                        <Label htmlFor="settings-theme-dark">{t('settings.theme_dark')}</Label>
                        <Select
                            id="settings-theme-dark"
                            name="darkTheme"
                            value={darkVariant}
                            onChange={(e) => setDarkVariant(e.target.value as DarkThemeVariant)}
                        >
                            <option value="solarized">Solarized Dark</option>
                            <option value="tomorrow">Tomorrow Night Blue</option>
                            <option value="vscode">Visual Studio Dark</option>
                        </Select>
                    </SettingRow>
                </Section>

                <Section>
                    <SectionTitle>{t('settings.reward_pricing')}</SectionTitle>
                    <HintText>{t('settings.reward_pricing_hint')}</HintText>

                    {(Object.keys(rewardVerbKeys) as RewardVerb[]).map((verb) => (
                        <SettingRow key={verb}>
                            <Label htmlFor={`settings-reward-price-${verb}`}>{t(rewardVerbKeys[verb])}</Label>
                            <NumberInput
                                id={`settings-reward-price-${verb}`}
                                name={`reward_price_${verb}`}
                                type="number"
                                min={1}
                                step={1}
                                value={rewardPricing[verb]}
                                onChange={(e) => {
                                    const parsed = Number(e.target.value);
                                    if (!Number.isFinite(parsed)) return;
                                    updateRewardPricing({ [verb]: Math.max(1, Math.floor(parsed)) });
                                }}
                            />
                        </SettingRow>
                    ))}
                </Section>

                {/* Data Section Link/Preview */}
                <Section>
                    <SectionTitle>{t('settings.data')}</SectionTitle>
                    <SettingRow>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {t('settings.storage_usage').replace('{size}', formatBytes(storageSize))}
                        </div>
                        {/* We can keep the detailed DataManagementModal separate and just link to it, 
                 or merge. For now, let's keep it separate to avoid breaking changes, 
                 and maybe render the DataManagementModal content here if we had time to refactor. 
                 But user asked for "Add dual theme selectors to Settings UI".
                 I will assume replacing the Data button with a Settings button that opens THIS modal, 
                 and THIS modal can open the Data Manager? 
                 Or just put the Appearance options INTO DataManagementModal? 
                 
                 Plan said: "Modify DataManagementModal (or create new AppearanceModal)".
                 Creating new Modal is safer.
              */}
                    </SettingRow>
                </Section>
            </ModalContent>
        </Modal>
    );
}
