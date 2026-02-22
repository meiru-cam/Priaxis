/**
 * Review Settings Component
 * 
 * Settings panel for configuring spaced repetition preferences.
 */

import React from 'react';
import styled from 'styled-components';
import type { SRSettings } from '../../../types/flashcard';
import { useTranslation } from '../../../lib/i18n/useTranslation';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background: ${({ theme }) => theme.colors.bg.card};
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const Title = styled.h3`
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SettingRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
`;

const SettingLabel = styled.label`
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const SettingDescription = styled.span`
    font-size: 0.7rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
`;

const SliderContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const Slider = styled.input`
    width: 120px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 2px;
    outline: none;
    
    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
        cursor: pointer;
        transition: transform 0.2s ease;
        
        &:hover {
            transform: scale(1.1);
        }
    }
    
    &::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
        cursor: pointer;
    }
`;

const SliderValue = styled.span`
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.accent.purple};
    min-width: 32px;
    text-align: right;
`;

const Toggle = styled.button<{ $active: boolean }>`
    width: 48px;
    height: 26px;
    border-radius: 13px;
    border: none;
    cursor: pointer;
    position: relative;
    transition: background 0.2s ease;
    background: ${({ theme, $active }) => $active
        ? `linear-gradient(135deg, ${theme.colors.accent.purple} 0%, ${theme.colors.accent.blue} 100%)`
        : theme.colors.border.secondary};
    
    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${({ $active }) => $active ? '25px' : '3px'};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${({ theme }) => theme.colors.text.inverse};
        transition: left 0.2s ease;
    }
`;

const RefreshButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.accent};
    background: ${({ theme }) => theme.colors.card.purple.bg};
    color: ${({ theme }) => theme.colors.accent.purple};
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        opacity: 0.8;
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

interface ReviewSettingsProps {
    settings: SRSettings;
    onUpdateSettings: (settings: Partial<SRSettings>) => void;
    onRefresh: () => void;
    isLoading?: boolean;
    lastSync?: string | null;
}

export const ReviewSettings: React.FC<ReviewSettingsProps> = ({
    settings,
    onUpdateSettings,
    onRefresh,
    isLoading = false,
    lastSync,
}) => {
    const { t, language } = useTranslation();

    const formatLastSync = () => {
        if (!lastSync) return t('sr.settings.last_sync_never');
        const date = new Date(lastSync);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 1) return t('sr.settings.last_sync_just_now');
        if (diffMins < 60) return t('sr.settings.last_sync_minutes_ago', { count: diffMins });

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return t('sr.settings.last_sync_hours_ago', { count: diffHours });

        return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US');
    };

    return (
        <Container>
            <Title>{t('sr.settings.title')}</Title>

            {/* Daily Limit */}
            <SettingRow>
                <SettingLabel>
                    {t('sr.settings.daily_limit_label')}
                    <SettingDescription>{t('sr.settings.daily_limit_desc')}</SettingDescription>
                </SettingLabel>
                <SliderContainer>
                    <Slider
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={settings.dailyLimit}
                        onChange={(e) => onUpdateSettings({ dailyLimit: Number(e.target.value) })}
                    />
                    <SliderValue>{settings.dailyLimit}</SliderValue>
                </SliderContainer>
            </SettingRow>

            {/* New Cards Per Day */}
            <SettingRow>
                <SettingLabel>
                    {t('sr.settings.new_cards_label')}
                    <SettingDescription>{t('sr.settings.new_cards_desc')}</SettingDescription>
                </SettingLabel>
                <SliderContainer>
                    <Slider
                        type="range"
                        min={0}
                        max={20}
                        step={1}
                        value={settings.newCardsPerDay}
                        onChange={(e) => onUpdateSettings({ newCardsPerDay: Number(e.target.value) })}
                    />
                    <SliderValue>{settings.newCardsPerDay}</SliderValue>
                </SliderContainer>
            </SettingRow>

            {/* Keyboard Shortcuts */}
            <SettingRow>
                <SettingLabel>
                    {t('sr.settings.keyboard_shortcuts_label')}
                    <SettingDescription>{t('sr.settings.keyboard_shortcuts_desc')}</SettingDescription>
                </SettingLabel>
                <Toggle
                    $active={settings.enableKeyboardShortcuts}
                    onClick={() => onUpdateSettings({
                        enableKeyboardShortcuts: !settings.enableKeyboardShortcuts
                    })}
                />
            </SettingRow>

            {/* Include New Cards */}
            <SettingRow>
                <SettingLabel>
                    {t('sr.settings.include_new_label')}
                    <SettingDescription>{t('sr.settings.include_new_desc')}</SettingDescription>
                </SettingLabel>
                <Toggle
                    $active={settings.includeNewCards}
                    onClick={() => onUpdateSettings({
                        includeNewCards: !settings.includeNewCards
                    })}
                />
            </SettingRow>

            {/* Refresh Button */}
            <SettingRow>
                <SettingLabel>
                    {t('sr.settings.sync_label')}
                    <SettingDescription>
                        {t('sr.settings.last_synced_prefix')}: {formatLastSync()}
                    </SettingDescription>
                </SettingLabel>
                <RefreshButton onClick={onRefresh} disabled={isLoading}>
                    {isLoading ? t('sr.settings.syncing') : t('sr.settings.refresh')}
                </RefreshButton>
            </SettingRow>
        </Container>
    );
};

export default ReviewSettings;
