/**
 * Import/Export Modal
 * 
 * Modal for importing and exporting flashcard data.
 * Supports JSON (full data) and Markdown (portable) formats.
 */

import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import type { Flashcard, FlashcardProgress } from '../../../types/flashcard';
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
    max-width: 500px;
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
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 1.5rem;
    cursor: pointer;
    
    &:hover {
        color: ${({ theme }) => theme.colors.text.primary};
    }
`;

const Content = styled.div`
    padding: 24px;
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
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
`;

const ActionButton = styled.button`
    flex: 1;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.bg.card};
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    
    &:hover {
        background: ${({ theme }) => theme.colors.card.purple.bg};
        border-color: ${({ theme }) => theme.colors.border.accent};
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ButtonIcon = styled.span`
    font-size: 1.2rem;
`;

const ButtonLabel = styled.span`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.secondary};
`;

const FileInput = styled.input`
    display: none;
`;

const DropZone = styled.div<{ $active: boolean }>`
    border: 2px dashed ${({ theme, $active }) => $active
        ? theme.colors.accent.purple
        : theme.colors.border.secondary};
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${({ theme, $active }) => $active
        ? theme.colors.card.purple.bg
        : 'transparent'};
    
    &:hover {
        border-color: ${({ theme }) => theme.colors.accent.purple};
        background: ${({ theme }) => theme.colors.card.purple.bg};
    }
`;

const DropText = styled.div`
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.85rem;
`;

const StatsText = styled.div`
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
    text-align: center;
`;

const SuccessMessage = styled.div`
    background: ${({ theme }) => theme.colors.status.success.bg};
    border: 1px solid ${({ theme }) => theme.colors.status.success.border};
    color: ${({ theme }) => theme.colors.status.success.text};
    padding: 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    text-align: center;
`;

const ErrorMessage = styled.div`
    background: ${({ theme }) => theme.colors.status.danger.bg};
    border: 1px solid ${({ theme }) => theme.colors.status.danger.border};
    color: ${({ theme }) => theme.colors.status.danger.text};
    padding: 12px;
    border-radius: 8px;
    font-size: 0.85rem;
`;

interface ImportExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    flashcards: Flashcard[];
    progress: Record<string, FlashcardProgress>;
    onImport: (data: { flashcards: Flashcard[]; progress: Record<string, FlashcardProgress> }) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
    isOpen,
    onClose,
    flashcards,
    progress,
    onImport,
}) => {
    const { t } = useTranslation();
    const [dragActive, setDragActive] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportJSON = () => {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            flashcards,
            progress,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcards-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: t('sr.import_export.exported_cards', { count: flashcards.length }) });
    };

    const handleExportMarkdown = () => {
        // Group cards by deck
        const deckGroups: Record<string, Flashcard[]> = {};
        flashcards.forEach(card => {
            if (!deckGroups[card.deck]) {
                deckGroups[card.deck] = [];
            }
            deckGroups[card.deck].push(card);
        });

        let markdown = `# Flashcards Export\n\nExported: ${new Date().toLocaleString()}\n\n`;

        for (const [deck, cards] of Object.entries(deckGroups)) {
            markdown += `## #${deck}\n\n`;
            cards.forEach(card => {
                if (card.hint) {
                    // Use cloze format for cards with hints
                    markdown += `${card.question.replace('[...]', `==[;;]${card.answer}[;;${card.hint}]==`)}\n\n`;
                } else {
                    // Use Q&A format
                    markdown += `${card.question} ;; ${card.answer}\n\n`;
                }
            });
        }

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcards-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: t('sr.import_export.exported_markdown', { count: flashcards.length }) });
    };

    const handleFileSelect = (file: File) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);

                    if (!data.flashcards || !Array.isArray(data.flashcards)) {
                        throw new Error(t('sr.import_export.error_invalid_json'));
                    }

                    onImport({
                        flashcards: data.flashcards,
                        progress: data.progress || {},
                    });

                    setMessage({
                        type: 'success',
                        text: t('sr.import_export.imported_cards', { count: data.flashcards.length })
                    });
                } else {
                    // Parse markdown (basic implementation)
                    // This is simplified - real implementation would use the parser
                    setMessage({
                        type: 'error',
                        text: t('sr.import_export.error_markdown_not_supported')
                    });
                }
            } catch (err: unknown) {
                setMessage({
                    type: 'error',
                    text: err instanceof Error ? err.message : t('sr.import_export.error_invalid_json'),
                });
            }
        };

        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    if (!isOpen) return null;

    const totalCards = flashcards.length;
    const reviewedCards = Object.keys(progress).length;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>{t('sr.import_export.title')}</Title>
                    <CloseButton onClick={onClose}>×</CloseButton>
                </Header>

                <Content>
                    {/* Export Section */}
                    <Section>
                        <SectionTitle>{t('sr.import_export.export_title')}</SectionTitle>
                        <ButtonGroup>
                            <ActionButton onClick={handleExportJSON}>
                                <ButtonIcon>📋</ButtonIcon>
                                JSON
                                <ButtonLabel>{t('sr.import_export.json_label')}</ButtonLabel>
                            </ActionButton>
                            <ActionButton onClick={handleExportMarkdown}>
                                <ButtonIcon>📝</ButtonIcon>
                                Markdown
                                <ButtonLabel>{t('sr.import_export.markdown_label')}</ButtonLabel>
                            </ActionButton>
                        </ButtonGroup>
                        <StatsText>
                            {t('sr.import_export.stats', { total: totalCards, reviewed: reviewedCards })}
                        </StatsText>
                    </Section>

                    {/* Import Section */}
                    <Section>
                        <SectionTitle>{t('sr.import_export.import_title')}</SectionTitle>
                        <DropZone
                            $active={dragActive}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <DropText>
                                {t('sr.import_export.drop_text')}
                                <br />
                                <small>{t('sr.import_export.drop_support')}</small>
                            </DropText>
                        </DropZone>
                        <FileInput
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.md"
                            onChange={handleFileInputChange}
                        />
                    </Section>

                    {/* Message */}
                    {message && (
                        message.type === 'success'
                            ? <SuccessMessage>{message.text}</SuccessMessage>
                            : <ErrorMessage>{message.text}</ErrorMessage>
                    )}
                </Content>
            </Modal>
        </Overlay>
    );
};

export default ImportExportModal;
