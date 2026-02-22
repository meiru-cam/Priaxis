/**
 * Flashcard Review Component
 * 
 * The main flashcard review interface with flip animation,
 * hint support, and rating buttons.
 */

import React, { useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import type { Flashcard } from '../../../types/flashcard';
import { useTranslation } from '../../../lib/i18n/useTranslation';

// Animations
const flipIn = keyframes`
    from {
        transform: rotateY(180deg);
        opacity: 0;
    }
    to {
        transform: rotateY(0deg);
        opacity: 1;
    }
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
`;

const ProgressBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ProgressTrack = styled.div`
    flex: 1;
    height: 6px;
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 3px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    height: 100%;
    width: ${props => props.$progress}%;
    background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%);
    border-radius: 3px;
    transition: width 0.3s ease;
`;

const ProgressText = styled.span`
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    min-width: 60px;
    text-align: right;
`;

const CardContainer = styled.div`
    flex: 1;
    perspective: 1000px;
    min-height: 300px;
`;

const Card = styled.div<{ $flipped: boolean }>`
    width: 100%;
    height: 100%;
    min-height: 300px;
    background: ${({ theme }) => theme.colors.bg.card};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    padding: 24px;
    cursor: ${props => props.$flipped ? 'default' : 'pointer'};
    transition: transform 0.4s ease, box-shadow 0.2s ease;
    transform-style: preserve-3d;
    
    ${props => props.$flipped && css`
        animation: ${flipIn} 0.4s ease forwards;
    `}
    
    &:hover {
        box-shadow: ${({ theme }) => theme.shadows.md};
    }
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
`;

const DeckTag = styled.span`
    font-size: 0.75rem;
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.15);
    padding: 4px 10px;
    border-radius: 12px;
    text-transform: capitalize;
`;

const CardType = styled.span`
    font-size: 0.7rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
    text-transform: uppercase;
`;

const CardContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 16px;
`;

const QuestionText = styled.div`
    font-size: 1.2rem;
    color: ${({ theme }) => theme.colors.text.primary};
    line-height: 1.6;
    white-space: pre-wrap;
`;

const AnswerText = styled.div`
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.semantic.success};
    line-height: 1.6;
    white-space: pre-wrap;
    padding: 16px;
    background: ${({ theme }) => theme.colors.status.success.bg};
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.status.success.border};
`;

const HintText = styled.div`
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.semantic.warning};
    font-style: italic;
    padding: 12px;
    background: ${({ theme }) => theme.colors.status.warning.bg};
    border-radius: 8px;
    border: 1px dashed ${({ theme }) => theme.colors.status.warning.border};
`;

const FlipPrompt = styled.div`
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-top: 16px;
    
    kbd {
        background: ${({ theme }) => theme.colors.border.secondary};
        padding: 2px 8px;
        border-radius: 4px;
        font-family: monospace;
        margin: 0 4px;
    }
`;

const HintButton = styled.button`
    background: none;
    border: 1px dashed ${({ theme }) => theme.colors.status.warning.border};
    color: ${({ theme }) => theme.colors.semantic.warning};
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    
    &:hover {
        background: ${({ theme }) => theme.colors.status.warning.bg};
    }
`;

const RatingButtons = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
`;

const RatingButton = styled.button<{ $type: 'hard' | 'good' | 'easy' }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px;
    border-radius: 12px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    
    ${props => {
        switch (props.$type) {
            case 'hard':
                return `
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    &:hover {
                        background: rgba(239, 68, 68, 0.25);
                        transform: translateY(-2px);
                    }
                `;
            case 'good':
                return `
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    &:hover {
                        background: rgba(59, 130, 246, 0.25);
                        transform: translateY(-2px);
                    }
                `;
            case 'easy':
                return `
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    &:hover {
                        background: rgba(34, 197, 94, 0.25);
                        transform: translateY(-2px);
                    }
                `;
        }
    }}
`;

const RatingLabel = styled.span`
    font-size: 0.95rem;
`;

const RatingInterval = styled.span`
    font-size: 0.7rem;
    opacity: 0.8;
`;

const KeyHint = styled.kbd`
    font-size: 0.65rem;
    background: ${({ theme }) => theme.colors.border.secondary};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.text.secondary};
`;

const ObsidianLink = styled.button`
    background: none;
    border: none;
    color: #8b5cf6;
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
    
    &:hover {
        text-decoration: underline;
    }
`;

interface FlashcardReviewProps {
    card: Flashcard;
    showAnswer: boolean;
    showHint: boolean;
    progress: { current: number; total: number };
    intervalPreview: { hard: string; good: string; easy: string } | null;
    onFlip: () => void;
    onToggleHint: () => void;
    onRate: (rating: 'easy' | 'good' | 'hard') => void;
    onOpenObsidian: () => void;
    enableKeyboardShortcuts?: boolean;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({
    card,
    showAnswer,
    showHint,
    progress,
    intervalPreview,
    onFlip,
    onToggleHint,
    onRate,
    onOpenObsidian,
    enableKeyboardShortcuts = true,
}) => {
    const { t } = useTranslation();
    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enableKeyboardShortcuts) return;

        if (!showAnswer) {
            // Space or Enter to flip
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onFlip();
            }
            // H for hint
            if (e.key === 'h' || e.key === 'H') {
                onToggleHint();
            }
        } else {
            // 1/2/3 for rating
            switch (e.key) {
                case '1':
                    onRate('hard');
                    break;
                case '2':
                    onRate('good');
                    break;
                case '3':
                    onRate('easy');
                    break;
            }
        }
    }, [showAnswer, enableKeyboardShortcuts, onFlip, onToggleHint, onRate]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const progressPercent = (progress.current / progress.total) * 100;

    return (
        <Container>
            {/* Progress */}
            <ProgressBar>
                <ProgressTrack>
                    <ProgressFill $progress={progressPercent} />
                </ProgressTrack>
                <ProgressText>
                    {progress.current} / {progress.total}
                </ProgressText>
            </ProgressBar>

            {/* Card */}
            <CardContainer>
                <Card $flipped={showAnswer} onClick={!showAnswer ? onFlip : undefined}>
                    <CardHeader>
                        <DeckTag>#{card.deck}</DeckTag>
                        <CardType>{card.type}</CardType>
                    </CardHeader>

                    <CardContent>
                        <QuestionText>{card.question}</QuestionText>

                        {/* Hint (only before flip, for cloze cards with hints) */}
                        {!showAnswer && card.hint && (
                            showHint ? (
                                <HintText>💡 {card.hint}</HintText>
                            ) : (
                                <HintButton onClick={(e) => { e.stopPropagation(); onToggleHint(); }}>
                                    {t('sr.review.show_hint')}
                                </HintButton>
                            )
                        )}

                        {/* Answer */}
                        {showAnswer && (
                            <>
                                <AnswerText>{card.answer}</AnswerText>
                                <ObsidianLink onClick={onOpenObsidian}>
                                    {t('sr.review.open_obsidian')}
                                </ObsidianLink>
                            </>
                        )}

                        {/* Flip prompt */}
                        {!showAnswer && (
                            <FlipPrompt>
                                {t('sr.review.flip_prompt')}
                            </FlipPrompt>
                        )}
                    </CardContent>
                </Card>
            </CardContainer>

            {/* Rating buttons (only after flip) */}
            {showAnswer && (
                <RatingButtons>
                    <RatingButton $type="hard" onClick={() => onRate('hard')}>
                        <RatingLabel>{t('sr.review.rate_again')}</RatingLabel>
                        {intervalPreview && (
                            <RatingInterval>{intervalPreview.hard}</RatingInterval>
                        )}
                        <KeyHint>1</KeyHint>
                    </RatingButton>
                    <RatingButton $type="good" onClick={() => onRate('good')}>
                        <RatingLabel>{t('sr.review.rate_good')}</RatingLabel>
                        {intervalPreview && (
                            <RatingInterval>{intervalPreview.good}</RatingInterval>
                        )}
                        <KeyHint>2</KeyHint>
                    </RatingButton>
                    <RatingButton $type="easy" onClick={() => onRate('easy')}>
                        <RatingLabel>{t('sr.review.rate_easy')}</RatingLabel>
                        {intervalPreview && (
                            <RatingInterval>{intervalPreview.easy}</RatingInterval>
                        )}
                        <KeyHint>3</KeyHint>
                    </RatingButton>
                </RatingButtons>
            )}
        </Container>
    );
};

export default FlashcardReview;
