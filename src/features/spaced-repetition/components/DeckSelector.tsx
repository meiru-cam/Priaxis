/**
 * Deck Selector Component
 * 
 * Displays available decks with statistics and allows selection.
 */

import React from 'react';
import styled from 'styled-components';
import type { DeckStats } from '../../../types/flashcard';
import { useTranslation } from '../../../lib/i18n/useTranslation';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DeckCard = styled.button<{ $selected?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 10px;
    border: 2px solid ${({ theme, $selected }) => $selected
        ? theme.colors.accent.purple
        : theme.colors.border.secondary};
    background: ${({ theme, $selected }) => $selected
        ? theme.colors.card.purple.bg
        : theme.colors.bg.card};
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    
    &:hover {
        border-color: ${({ theme }) => theme.colors.accent.purple};
        background: ${({ theme }) => theme.colors.card.purple.bg};
    }
`;

const DeckInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DeckName = styled.span`
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.95rem;
    text-transform: capitalize;
`;

const DeckMeta = styled.span`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.secondary};
`;

const DueBadge = styled.span<{ $count: number }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    border-radius: 14px;
    font-size: 0.8rem;
    font-weight: 600;
    background: ${({ theme, $count }) => $count > 0
        ? `linear-gradient(135deg, ${theme.colors.accent.purple} 0%, ${theme.colors.accent.blue} 100%)`
        : theme.colors.border.secondary};
    color: ${({ theme, $count }) => $count > 0 ? theme.colors.text.inverse : theme.colors.text.secondary};
`;

const AllDecksCard = styled(DeckCard)`
    background: ${({ theme, $selected }) => $selected
        ? theme.colors.card.purple.bg
        : theme.colors.card.purple.bg};
    border-color: ${({ theme, $selected }) => $selected
        ? theme.colors.accent.purple
        : theme.colors.border.accent};
`;

interface DeckSelectorProps {
    decks: DeckStats[];
    selectedDeck: string | null;
    onSelectDeck: (deckName: string | null) => void;
}

export const DeckSelector: React.FC<DeckSelectorProps> = ({
    decks,
    selectedDeck,
    onSelectDeck,
}) => {
    const { t } = useTranslation();

    // Calculate totals for "All Decks" option
    const totals = decks.reduce(
        (acc, deck) => ({
            totalCards: acc.totalCards + deck.totalCards,
            dueToday: acc.dueToday + deck.dueToday,
            newCards: acc.newCards + deck.newCards,
        }),
        { totalCards: 0, dueToday: 0, newCards: 0 }
    );

    return (
        <Container>
            {/* All Decks Option */}
            <AllDecksCard
                $selected={selectedDeck === null}
                onClick={() => onSelectDeck(null)}
            >
                <DeckInfo>
                    <DeckName>{t('sr.deck.all')}</DeckName>
                    <DeckMeta>
                        {t('sr.deck.meta', {
                            total: totals.totalCards,
                            new: totals.newCards,
                        })}
                    </DeckMeta>
                </DeckInfo>
                <DueBadge $count={totals.dueToday}>
                    {totals.dueToday}
                </DueBadge>
            </AllDecksCard>

            {/* Individual Decks */}
            {decks.map(deck => (
                <DeckCard
                    key={deck.deckName}
                    $selected={selectedDeck === deck.deckName}
                    onClick={() => onSelectDeck(deck.deckName)}
                >
                    <DeckInfo>
                        <DeckName>#{deck.deckName}</DeckName>
                        <DeckMeta>
                            {t('sr.deck.item_meta', {
                                total: deck.totalCards,
                                mastered: deck.masteredCards,
                            })}
                        </DeckMeta>
                    </DeckInfo>
                    <DueBadge $count={deck.dueToday}>
                        {deck.dueToday}
                    </DueBadge>
                </DeckCard>
            ))}

            {decks.length === 0 && (
                <DeckMeta style={{ textAlign: 'center', padding: '20px' }}>
                    {t('sr.deck.empty')}
                </DeckMeta>
            )}
        </Container>
    );
};

export default DeckSelector;
