/**
 * Add Card Modal
 * 
 * Modal for creating new flashcards with markdown support.
 * Supports images (via URL) and hyperlinks in content.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import type { NewFlashcardInput } from '../../../types/flashcard';
import { ImeSafeInputBase, ImeSafeTextareaBase } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/useTranslation';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
`;

const Modal = styled.div`
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: ${({ theme }) => theme.shadows.lg};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const Title = styled.h2`
    font-size: 1.2rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 1.5rem;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
    
    &:hover {
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

const Content = styled.div`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 0.85rem;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
    display: flex;
    align-items: center;
    gap: 6px;
`;

const RequiredStar = styled.span`
    color: ${({ theme }) => theme.colors.semantic.danger};
`;

const TextArea = styled(ImeSafeTextareaBase)`
    width: 100%;
    min-height: 100px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.input.bg};
    color: ${({ theme }) => theme.colors.input.text};
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    
    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.accent.purple};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.card.purple.bg};
    }
    
    &::placeholder {
        color: ${({ theme }) => theme.colors.input.placeholder};
    }
`;

const Input = styled(ImeSafeInputBase)`
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.input.bg};
    color: ${({ theme }) => theme.colors.input.text};
    font-size: 0.9rem;
    
    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.accent.purple};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.card.purple.bg};
    }
    
    &::placeholder {
        color: ${({ theme }) => theme.colors.input.placeholder};
    }
`;

const Select = styled.select`
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.input.bg};
    color: ${({ theme }) => theme.colors.input.text};
    font-size: 0.9rem;
    cursor: pointer;
    
    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.accent.purple};
    }
    
    option {
        background: ${({ theme }) => theme.colors.bg.tertiary};
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

const DeckInputGroup = styled.div`
    display: flex;
    gap: 8px;
`;

const ToolbarRow = styled.div`
    display: flex;
    gap: 8px;
    margin-top: -4px;
`;

const ToolbarButton = styled.button`
    background: ${({ theme }) => theme.colors.border.secondary};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    color: ${({ theme }) => theme.colors.text.secondary};
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    
    &:hover {
        background: ${({ theme }) => theme.colors.card.purple.bg};
        color: ${({ theme }) => theme.colors.accent.purple};
        border-color: ${({ theme }) => theme.colors.border.accent};
    }
`;

const HelpText = styled.div`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
    display: flex;
    align-items: center;
    gap: 4px;
`;

const PreviewSection = styled.div`
    background: ${({ theme }) => theme.colors.bg.card};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    border-radius: 8px;
    padding: 12px;
`;

const PreviewLabel = styled.div`
    font-size: 0.7rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const PreviewContent = styled.div`
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: pre-wrap;
    
    a {
        color: ${({ theme }) => theme.colors.accent.purple};
        text-decoration: underline;
    }
    
    img {
        max-width: 100%;
        border-radius: 8px;
        margin: 8px 0;
    }
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const Button = styled.button<{ $primary?: boolean }>`
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    background: ${({ theme, $primary }) => $primary
        ? theme.colors.button.primary.bg
        : 'transparent'};
    border: ${({ theme, $primary }) => $primary
        ? 'none'
        : `1px solid ${theme.colors.border.primary}`};
    color: ${({ theme, $primary }) => $primary
        ? theme.colors.button.primary.text
        : theme.colors.text.secondary};
    
    &:hover {
        ${({ theme, $primary }) => $primary
        ? `transform: translateY(-1px); box-shadow: 0 4px 12px ${theme.colors.button.primary.shadow};`
        : `border-color: ${theme.colors.border.accent}; color: ${theme.colors.text.primary};`}
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;

const ErrorText = styled.div`
    color: ${({ theme }) => theme.colors.semantic.danger};
    font-size: 0.8rem;
    margin-top: 4px;
`;

interface AddCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (card: NewFlashcardInput) => Promise<void>;
    existingDecks: string[];
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    existingDecks,
}) => {
    const { t } = useTranslation();
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [hint, setHint] = useState('');
    const [deck, setDeck] = useState('');
    const [newDeckName, setNewDeckName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuestion('');
            setAnswer('');
            setHint('');
            setDeck(existingDecks[0] || '');
            setNewDeckName('');
            setImageUrl('');
            setError('');
            setShowPreview(false);
        }
    }, [isOpen, existingDecks]);

    const handleInsertLink = (field: 'question' | 'answer') => {
        const url = prompt(t('sr.add_card.prompt_url'));
        const text = prompt(t('sr.add_card.prompt_link_text'));
        if (url && text) {
            const linkMd = `[${text}](${url})`;
            if (field === 'question') {
                setQuestion(prev => prev + linkMd);
            } else {
                setAnswer(prev => prev + linkMd);
            }
        }
    };

    const handleInsertImage = () => {
        const url = prompt(t('sr.add_card.prompt_image_url'));
        if (url) {
            setImageUrl(url);
            setQuestion(prev => prev + `\n![image](${url})`);
        }
    };

    const handleSubmit = async () => {
        // Validation
        const finalDeck = deck === '__new__' ? newDeckName.trim() : deck;

        if (!question.trim()) {
            setError(t('sr.add_card.error_question_required'));
            return;
        }
        if (!answer.trim()) {
            setError(t('sr.add_card.error_answer_required'));
            return;
        }
        if (!finalDeck) {
            setError(t('sr.add_card.error_deck_required'));
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit({
                question: question.trim(),
                answer: answer.trim(),
                hint: hint.trim() || undefined,
                deck: finalDeck.toLowerCase().replace(/[^a-z0-9]/g, ''),
                imageUrl: imageUrl || undefined,
            });
            onClose();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : t('sr.add_card.error_create_failed');
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render markdown preview in plain text to avoid HTML injection.
    const renderPreviewText = (text: string) =>
        text
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[Image: $1] ($2)');

    if (!isOpen) return null;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>{t('sr.add_card.title')}</Title>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </Header>

                <Content>
                    {/* Question */}
                    <FormGroup>
                        <Label htmlFor="add-card-question">
                            {t('sr.add_card.question_label')} <RequiredStar>*</RequiredStar>
                        </Label>
                        <TextArea
                            id="add-card-question"
                            name="question"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder={t('sr.add_card.question_placeholder')}
                            rows={3}
                        />
                        <ToolbarRow>
                            <ToolbarButton type="button" onClick={() => handleInsertLink('question')}>
                                {t('sr.add_card.toolbar_link')}
                            </ToolbarButton>
                            <ToolbarButton type="button" onClick={handleInsertImage}>
                                {t('sr.add_card.toolbar_image')}
                            </ToolbarButton>
                        </ToolbarRow>
                    </FormGroup>

                    {/* Answer */}
                    <FormGroup>
                        <Label htmlFor="add-card-answer">
                            {t('sr.add_card.answer_label')} <RequiredStar>*</RequiredStar>
                        </Label>
                        <TextArea
                            id="add-card-answer"
                            name="answer"
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder={t('sr.add_card.answer_placeholder')}
                            rows={4}
                        />
                        <ToolbarRow>
                            <ToolbarButton type="button" onClick={() => handleInsertLink('answer')}>
                                {t('sr.add_card.toolbar_link')}
                            </ToolbarButton>
                        </ToolbarRow>
                    </FormGroup>

                    {/* Hint (optional) */}
                    <FormGroup>
                        <Label htmlFor="add-card-hint">{t('sr.add_card.hint_label')}</Label>
                        <Input
                            id="add-card-hint"
                            name="hint"
                            value={hint}
                            onChange={e => setHint(e.target.value)}
                            placeholder={t('sr.add_card.hint_placeholder')}
                        />
                    </FormGroup>

                    {/* Deck */}
                    <FormGroup>
                        <Label htmlFor="add-card-deck">
                            {t('sr.add_card.deck_label')} <RequiredStar>*</RequiredStar>
                        </Label>
                        <DeckInputGroup>
                            <Select
                                id="add-card-deck"
                                name="deck"
                                value={deck}
                                onChange={e => setDeck(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">{t('sr.add_card.deck_select_placeholder')}</option>
                                {existingDecks.map(d => (
                                    <option key={d} value={d}>#{d}</option>
                                ))}
                                <option value="__new__">{t('sr.add_card.deck_create_new')}</option>
                            </Select>
                        </DeckInputGroup>
                        {deck === '__new__' && (
                            <Input
                                id="add-card-new-deck"
                                name="newDeckName"
                                value={newDeckName}
                                onChange={e => setNewDeckName(e.target.value)}
                                placeholder={t('sr.add_card.new_deck_placeholder')}
                                style={{ marginTop: 8 }}
                            />
                        )}
                    </FormGroup>

                    {/* Preview Toggle */}
                    <ToolbarButton
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {showPreview ? t('sr.add_card.preview_hide') : t('sr.add_card.preview_show')}
                    </ToolbarButton>

                    {/* Preview */}
                    {showPreview && (question || answer) && (
                        <PreviewSection>
                            <PreviewLabel>{t('sr.add_card.preview_label')}</PreviewLabel>
                            <PreviewContent>
                                <strong>Q:</strong>{' '}
                                <span>{renderPreviewText(question)}</span>
                            </PreviewContent>
                            <PreviewContent style={{ marginTop: 12 }}>
                                <strong>A:</strong>{' '}
                                <span>{renderPreviewText(answer)}</span>
                            </PreviewContent>
                        </PreviewSection>
                    )}

                    <HelpText>
                        {t('sr.add_card.help_markdown')}
                    </HelpText>

                    {error && <ErrorText>{error}</ErrorText>}
                </Content>

                <Footer>
                    <Button onClick={onClose}>{t('common.cancel')}</Button>
                    <Button
                        $primary
                        onClick={handleSubmit}
                        disabled={isSubmitting || !question.trim() || !answer.trim()}
                    >
                        {isSubmitting ? t('sr.add_card.creating') : t('sr.add_card.create_button')}
                    </Button>
                </Footer>
            </Modal>
        </Overlay>
    );
};

export default AddCardModal;
