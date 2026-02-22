/**
 * DoD Completion Modal
 * 
 * Shown when all Definition of Done checklist items are completed.
 * Allows user to confirm task completion or add more checklist items.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ImeSafeTextareaBase } from './ui';
import { PixelProgressBar } from './PixelProgressBar';

interface DoDCompletionModalProps {
    isOpen: boolean;
    taskTitle: string;
    checklistCount?: number;
    onConfirmComplete: () => void;
    onAddMore: (newItems: string[]) => void;
    onCancel: () => void;
}

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

const Modal = styled.div`
    background: var(--card-bg, #1a1a2e);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: 16px;
    padding: 24px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.3s ease;

    @keyframes slideUp {
        from { 
            opacity: 0;
            transform: translateY(20px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const Header = styled.div`
    text-align: center;
    margin-bottom: 20px;
`;

const Celebration = styled.div`
    font-size: 48px;
    margin-bottom: 12px;
`;

const Title = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin: 0 0 8px 0;
`;

const TaskName = styled.div`
    font-size: 0.9rem;
    color: var(--text-secondary, #888);
    background: rgba(255, 255, 255, 0.05);
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 12px;
`;

const ProgressSection = styled.div`
    margin: 20px 0;
`;

const ButtonGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
    padding: 14px 20px;
    border-radius: 10px;
    border: none;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => {
        switch (props.$variant) {
            case 'primary':
                return `
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    color: white;
                    &:hover { transform: translateY(-2px); }
                `;
            case 'secondary':
                return `
                    background: rgba(139, 92, 246, 0.2);
                    color: #a78bfa;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    &:hover { background: rgba(139, 92, 246, 0.3); }
                `;
            default:
                return `
                    background: transparent;
                    color: var(--text-secondary, #888);
                    &:hover { color: var(--text-primary, #fff); }
                `;
        }
    }}
`;

const AddMoreSection = styled.div`
    margin-top: 16px;
`;

const TextArea = styled(ImeSafeTextareaBase)`
    width: 100%;
    min-height: 80px;
    padding: 12px;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary, #fff);
    font-size: 0.9rem;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: #8b5cf6;
    }

    &::placeholder {
        color: var(--text-tertiary, #666);
    }
`;

const Hint = styled.p`
    font-size: 0.75rem;
    color: var(--text-tertiary, #666);
    margin: 8px 0 0 0;
`;

export const DoDCompletionModal: React.FC<DoDCompletionModalProps> = ({
    isOpen,
    taskTitle,
    checklistCount = 5,
    onConfirmComplete,
    onAddMore,
    onCancel,
}) => {
    const [showAddMore, setShowAddMore] = useState(false);
    const [newItemsText, setNewItemsText] = useState('');

    if (!isOpen) return null;

    const handleAddMore = () => {
        const items = newItemsText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (items.length > 0) {
            onAddMore(items);
            setNewItemsText('');
            setShowAddMore(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <Overlay onClick={handleOverlayClick}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Celebration>🎉</Celebration>
                    <Title>所有子任务已完成！</Title>
                    <TaskName>📋 {taskTitle}</TaskName>
                </Header>

                <ProgressSection>
                    <PixelProgressBar value={checklistCount} max={checklistCount} size="medium" />
                </ProgressSection>

                {showAddMore ? (
                    <AddMoreSection>
                        <TextArea
                            value={newItemsText}
                            onChange={e => setNewItemsText(e.target.value)}
                            placeholder="输入新的子任务，每行一个..."
                            autoFocus
                        />
                        <Hint>每行一个子任务，按回车分隔</Hint>
                        <ButtonGroup>
                            <Button $variant="secondary" onClick={handleAddMore}>
                                ➕ 添加这些子任务
                            </Button>
                            <Button $variant="ghost" onClick={() => setShowAddMore(false)}>
                                返回
                            </Button>
                        </ButtonGroup>
                    </AddMoreSection>
                ) : (
                    <ButtonGroup>
                        <Button $variant="primary" onClick={onConfirmComplete}>
                            ✅ 标记任务完成
                        </Button>
                        <Button $variant="secondary" onClick={() => setShowAddMore(true)}>
                            ➕ 还有更多要做的
                        </Button>
                        <Button $variant="ghost" onClick={onCancel}>
                            稍后再说
                        </Button>
                    </ButtonGroup>
                )}
            </Modal>
        </Overlay>
    );
};

export default DoDCompletionModal;
