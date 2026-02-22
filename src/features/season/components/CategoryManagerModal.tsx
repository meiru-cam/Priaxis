/**
 * CategoryManagerModal Component
 * Modal for managing quest/season categories
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Modal, Button, ConfirmModal, ImeSafeInputBase } from '../../../components/ui';
import type { Category } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    onAdd: (category: Omit<Category, 'id'>) => void;
    onUpdate: (id: string, updates: Partial<Category>) => void;
    onDelete: (id: string) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const CategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 3px;
  }
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const CategoryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconPreview = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
`;

const CategoryName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const DeleteButton = styled(ActionButton)`
  &:hover {
    background: ${({ theme }) => theme.colors.status.danger.bg};
    color: ${({ theme }) => theme.colors.status.danger.text};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
`;

const FormTitle = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const GroupLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Input = styled(ImeSafeInputBase)`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.input.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.input.bg};
  color: ${({ theme }) => theme.colors.input.text};
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.purple};
  }
`;

const ColorGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ColorOption = styled.button<{ $color: string; $selected: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ $selected }) => ($selected ? 'white' : 'transparent')};
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 2px #8b5cf6' : 'none')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
    '#84cc16', // lime
];

export function CategoryManagerModal({
    isOpen,
    onClose,
    categories,
    onAdd,
    onUpdate,
    onDelete,
}: CategoryManagerModalProps) {
    const { t } = useTranslation();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('📌');
    const [color, setColor] = useState('#3b82f6');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingId) {
            onUpdate(editingId, { name, icon, color });
            setEditingId(null);
        } else {
            onAdd({ name, icon, color });
        }
        resetForm();
    };

    const handleEdit = (cat: Category) => {
        setEditingId(cat.id);
        setName(cat.name);
        setIcon(cat.icon);
        setColor(cat.color);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deletingId) {
            onDelete(deletingId);
            setDeletingId(null);
        }
        setIsDeleteModalOpen(false);
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setIcon('📌');
        setColor('#3b82f6');
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={t('season.category_modal.title')}
                size="md"
            >
                <Container>
                    <Form onSubmit={handleSubmit}>
                        <FormTitle>{editingId ? t('season.category_modal.edit') : t('season.category_modal.add')}</FormTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                            <FormGroup>
                                <Label htmlFor="season-category-icon">{t('season.category_modal.icon')}</Label>
                                <Input
                                    id="season-category-icon"
                                    name="icon"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="Emoji"
                                    style={{ textAlign: 'center' }}
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label htmlFor="season-category-name">{t('season.category_modal.name')}</Label>
                                <Input
                                    id="season-category-name"
                                    name="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('season.category_modal.name_placeholder')}
                                />
                            </FormGroup>
                        </div>
                        <FormGroup>
                            <GroupLabel>{t('season.category_modal.color')}</GroupLabel>
                            <ColorGrid>
                                {colors.map((c) => (
                                    <ColorOption
                                        key={c}
                                        type="button"
                                        $color={c}
                                        $selected={color === c}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </ColorGrid>
                        </FormGroup>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            {editingId && (
                                <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                                    {t('common.cancel')}
                                </Button>
                            )}
                            <Button type="submit" size="sm">
                                {editingId ? t('common.save') : t('common.create')}
                            </Button>
                        </div>
                    </Form>

                    <CategoryList>
                        {categories.map((cat) => (
                            <CategoryItem key={cat.id}>
                                <CategoryInfo>
                                    <IconPreview $color={cat.color}>{cat.icon}</IconPreview>
                                    <CategoryName>{cat.name}</CategoryName>
                                </CategoryInfo>
                                <Actions>
                                    <ActionButton onClick={() => handleEdit(cat)} title={t('cmd.edit_task')}>
                                        ✏️
                                    </ActionButton>
                                    {/* Prevent deleting default categories if needed, or allow all */}
                                    <DeleteButton onClick={() => handleDeleteClick(cat.id)} title={t('daily.delete_btn')}>
                                        🗑️
                                    </DeleteButton>
                                </Actions>
                            </CategoryItem>
                        ))}
                    </CategoryList>
                </Container>
            </Modal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('season.category_modal.delete_title')}
                message={t('season.category_modal.delete_message')}
                variant="danger"
                confirmText={t('daily.delete_btn')}
            />
        </>
    );
}
