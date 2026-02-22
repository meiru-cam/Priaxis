/**
 * Spaced Repetition Tab
 * 
 * Main tab component for in-app flashcard review.
 * Integrates with Obsidian vault via MCP for card data.
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useFlashcardStore } from '../../../stores/flashcard-store';
import { DeckSelector } from './DeckSelector';
import { FlashcardReview } from './FlashcardReview';
import { ReviewSettings } from './ReviewSettings';
import { AddCardModal } from './AddCardModal';
import { ImportExportModal } from './ImportExportModal';
import { useTranslation } from '../../../lib/i18n/useTranslation';

const TabContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    height: 100%;
    overflow-y: auto;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Title = styled.h2`
    font-size: 1.5rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ConnectionStatus = styled.div<{ $connected: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: ${({ theme, $connected }) => $connected ? theme.colors.semantic.success : theme.colors.semantic.danger};
    
    &::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
    }
`;

const StatsCard = styled.div`
    background: ${({ theme }) => theme.colors.bg.card};
    border-radius: 12px;
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
`;

const StatItem = styled.div`
    text-align: center;
`;

const StatValue = styled.div`
    font-size: 1.5rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-top: 4px;
`;

const SectionTitle = styled.h3`
    font-size: 1rem;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin: 8px 0;
`;

const StartButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 24px;
    border-radius: 12px;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${({ theme }) => theme.colors.button.primary.bg};
    color: ${({ theme }) => theme.colors.button.primary.text};
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.button.primary.shadow};
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px ${({ theme }) => theme.colors.button.primary.shadow};
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;

const ErrorMessage = styled.div`
    background: ${({ theme }) => theme.colors.status.danger.bg};
    border: 1px solid ${({ theme }) => theme.colors.status.danger.border};
    color: ${({ theme }) => theme.colors.status.danger.text};
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
`;

const SessionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const SessionTitle = styled.span`
    font-weight: 600;
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.text.primary};
`;

const EndSessionButton = styled.button`
    background: ${({ theme }) => theme.colors.status.danger.bg};
    border: 1px solid ${({ theme }) => theme.colors.status.danger.border};
    color: ${({ theme }) => theme.colors.status.danger.text};
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    
    &:hover {
        opacity: 0.8;
    }
`;

const LoadingOverlay = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 40px;
    color: ${({ theme }) => theme.colors.text.secondary};
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${({ theme }) => theme.colors.border.secondary};
    border-top-color: ${({ theme }) => theme.colors.accent.purple};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const SettingsToggle = styled.button`
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    
    &:hover {
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

export const SpacedRepetitionTab: React.FC = () => {
    const { t, language } = useTranslation();
    const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const {
        flashcards,
        settings,
        isLoading,
        error,
        errorCode,
        lastSync,
        session,
        showAnswer,
        showHint,
        loadFlashcards,
        refreshFromVault,
        startReview,
        endReview,
        flipCard,
        toggleHint,
        submitReview,
        updateSettings,
        openInObsidian,
        getDeckStats,
        getReviewableCount,
        getCurrentCard,
        getIntervalPreview,
        addCard,
        importData,
        progress,
    } = useFlashcardStore();

    // Modal state
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [showImportExportModal, setShowImportExportModal] = useState(false);

    // Load flashcards on mount
    useEffect(() => {
        loadFlashcards();
    }, [loadFlashcards]);

    const deckStats = getDeckStats();
    const currentCard = getCurrentCard();
    const intervalPreview = getIntervalPreview(language);
    const localizedError = errorCode === 'NO_DUE_CARDS'
        ? t('sr.dashboard.no_due_cards')
        : error;
    const reviewableCount = getReviewableCount(selectedDeck);

    // Calculate total stats
    const totalStats = deckStats.reduce(
        (acc, deck) => ({
            total: acc.total + deck.totalCards,
            due: acc.due + deck.dueToday,
            new: acc.new + deck.newCards,
            mastered: acc.mastered + deck.masteredCards,
        }),
        { total: 0, due: 0, new: 0, mastered: 0 }
    );

    // In review mode
    if (session && currentCard) {
        return (
            <TabContainer>
                <SessionHeader>
                    <SessionTitle>
                        {t('sr.dashboard.reviewing', {
                            deck: session.deckName ? `#${session.deckName}` : t('sr.deck.all')
                        })}
                    </SessionTitle>
                    <EndSessionButton onClick={endReview}>
                        {t('sr.dashboard.end_session')}
                    </EndSessionButton>
                </SessionHeader>

                <FlashcardReview
                    card={currentCard}
                    showAnswer={showAnswer}
                    showHint={showHint}
                    progress={{
                        current: session.currentIndex + 1,
                        total: session.queue.length,
                    }}
                    intervalPreview={intervalPreview}
                    onFlip={flipCard}
                    onToggleHint={toggleHint}
                    onRate={submitReview}
                    onOpenObsidian={() => openInObsidian(currentCard)}
                    enableKeyboardShortcuts={settings.enableKeyboardShortcuts}
                />
            </TabContainer>
        );
    }

    // Dashboard mode
    return (
        <TabContainer>
            <Header>
                <Title>{t('sr.dashboard.title')}</Title>
                <HeaderActions>
                    <SettingsToggle onClick={() => setShowAddCardModal(true)}>
                        {t('sr.dashboard.add_card')}
                    </SettingsToggle>
                    <SettingsToggle onClick={() => setShowImportExportModal(true)}>
                        {t('sr.dashboard.import_export')}
                    </SettingsToggle>
                    <SettingsToggle onClick={() => setShowSettings(!showSettings)}>
                        {showSettings ? t('sr.dashboard.hide_settings') : t('sr.dashboard.show_settings')}
                    </SettingsToggle>
                    <ConnectionStatus $connected={flashcards.length > 0}>
                        {flashcards.length > 0
                            ? t('sr.dashboard.cards_loaded', { count: flashcards.length })
                            : t('sr.dashboard.no_cards')}
                    </ConnectionStatus>
                </HeaderActions>
            </Header>

            {localizedError && <ErrorMessage>{localizedError}</ErrorMessage>}

            {isLoading ? (
                <LoadingOverlay>
                    <Spinner />
                    <span>{t('sr.dashboard.loading')}</span>
                </LoadingOverlay>
            ) : (
                <>
                    {/* Stats Overview */}
                    <StatsCard>
                        <StatItem>
                            <StatValue>{totalStats.due}</StatValue>
                            <StatLabel>{t('sr.dashboard.stat_due_today')}</StatLabel>
                        </StatItem>
                        <StatItem>
                            <StatValue>{totalStats.new}</StatValue>
                            <StatLabel>{t('sr.dashboard.stat_new')}</StatLabel>
                        </StatItem>
                        <StatItem>
                            <StatValue>{totalStats.mastered}</StatValue>
                            <StatLabel>{t('sr.dashboard.stat_mastered')}</StatLabel>
                        </StatItem>
                        <StatItem>
                            <StatValue>{totalStats.total}</StatValue>
                            <StatLabel>{t('sr.dashboard.stat_total')}</StatLabel>
                        </StatItem>
                    </StatsCard>

                    {/* Settings Panel (Collapsible) */}
                    {showSettings && (
                        <ReviewSettings
                            settings={settings}
                            onUpdateSettings={updateSettings}
                            onRefresh={refreshFromVault}
                            isLoading={isLoading}
                            lastSync={lastSync}
                        />
                    )}

                    {/* Deck Selector */}
                    <SectionTitle>{t('sr.dashboard.select_deck')}</SectionTitle>
                    <DeckSelector
                        decks={deckStats}
                        selectedDeck={selectedDeck}
                        onSelectDeck={setSelectedDeck}
                    />

                    {/* Start Review Button */}
                    <StartButton
                        onClick={() => startReview(selectedDeck)}
                        disabled={reviewableCount === 0}
                    >
                        {t('sr.dashboard.start_review')}
                        {` (${t('sr.dashboard.card_count', { count: reviewableCount })})`}
                    </StartButton>
                </>
            )}

            {/* Modals */}
            <AddCardModal
                isOpen={showAddCardModal}
                onClose={() => setShowAddCardModal(false)}
                onSubmit={addCard}
                existingDecks={deckStats.map(d => d.deckName)}
            />
            <ImportExportModal
                isOpen={showImportExportModal}
                onClose={() => setShowImportExportModal(false)}
                flashcards={flashcards}
                progress={progress}
                onImport={importData}
            />
        </TabContainer>
    );
};

export default SpacedRepetitionTab;
