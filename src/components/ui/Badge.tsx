/**
 * Badge Component
 * Variants: active, paused, completed, success, warning, danger, info, default
 * Sizes: sm, md, lg
 */

import styled, { css } from 'styled-components';

type BadgeVariant = 'active' | 'paused' | 'completed' | 'success' | 'warning' | 'danger' | 'info' | 'default';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  sm: css`
    padding: 2px 8px;
    font-size: 0.75rem;
    border-radius: 8px;
  `,
  md: css`
    padding: 4px 12px;
    font-size: 0.85rem;
    border-radius: 12px;
  `,
  lg: css`
    padding: 6px 16px;
    font-size: 0.95rem;
    border-radius: 14px;
  `,
};

const variantStyles = {
  active: css`
    background: ${({ theme }) => theme.colors.badge.active.bg};
    color: ${({ theme }) => theme.colors.badge.active.text};
    border-color: ${({ theme }) => theme.colors.badge.active.border};
  `,
  paused: css`
    background: ${({ theme }) => theme.colors.badge.paused.bg};
    color: ${({ theme }) => theme.colors.badge.paused.text};
    border-color: ${({ theme }) => theme.colors.badge.paused.border};
  `,
  completed: css`
    background: ${({ theme }) => theme.colors.badge.completed.bg};
    color: ${({ theme }) => theme.colors.badge.completed.text};
    border-color: ${({ theme }) => theme.colors.badge.completed.border};
  `,
  success: css`
    background: ${({ theme }) => theme.colors.badge.success.bg};
    color: ${({ theme }) => theme.colors.badge.success.text};
    border-color: ${({ theme }) => theme.colors.badge.success.border};
  `,
  warning: css`
    background: ${({ theme }) => theme.colors.badge.warning.bg};
    color: ${({ theme }) => theme.colors.badge.warning.text};
    border-color: ${({ theme }) => theme.colors.badge.warning.border};
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.badge.danger.bg};
    color: ${({ theme }) => theme.colors.badge.danger.text};
    border-color: ${({ theme }) => theme.colors.badge.danger.border};
  `,
  info: css`
    background: ${({ theme }) => theme.colors.badge.info.bg};
    color: ${({ theme }) => theme.colors.badge.info.text};
    border-color: ${({ theme }) => theme.colors.badge.info.border};
  `,
  default: css`
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
    border-color: ${({ theme }) => theme.colors.border.primary};
  `,
};

const StyledBadge = styled.span<{ $variant: BadgeVariant; $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  border: 1px solid;
  white-space: nowrap;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
`;

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  return (
    <StyledBadge $variant={variant} $size={size} className={className}>
      {children}
    </StyledBadge>
  );
}

// Status badge with icon support
interface StatusBadgeProps extends BadgeProps {
  icon?: React.ReactNode;
}

export function StatusBadge({ icon, children, ...props }: StatusBadgeProps) {
  return (
    <Badge {...props}>
      {icon}
      {children}
    </Badge>
  );
}

// Importance badge (high, medium, low)
type ImportanceLevel = 'high' | 'medium' | 'low';

const importanceToVariant: Record<ImportanceLevel, BadgeVariant> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const importanceLabels: Record<ImportanceLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

interface ImportanceBadgeProps {
  level: ImportanceLevel;
  size?: BadgeSize;
  showLabel?: boolean;
}

export function ImportanceBadge({ level, size = 'sm', showLabel = true }: ImportanceBadgeProps) {
  return (
    <Badge variant={importanceToVariant[level]} size={size}>
      {showLabel ? importanceLabels[level] : level.charAt(0).toUpperCase()}
    </Badge>
  );
}

// Effort badge
type EffortLevel = 'high' | 'medium' | 'low';

const effortLabels: Record<EffortLevel, string> = {
  high: '大',
  medium: '中',
  low: '小',
};

interface EffortBadgeProps {
  level: EffortLevel;
  size?: BadgeSize;
}

export function EffortBadge({ level, size = 'sm' }: EffortBadgeProps) {
  return (
    <Badge variant="default" size={size}>
      {effortLabels[level]}
    </Badge>
  );
}

// Task type badge
type TaskType = 'creative' | 'tax' | 'maintenance';

const taskTypeLabels: Record<TaskType, string> = {
  creative: '创造',
  tax: '税收',
  maintenance: '维护',
};

const taskTypeVariants: Record<TaskType, BadgeVariant> = {
  creative: 'success',
  tax: 'info',
  maintenance: 'warning',
};

interface TaskTypeBadgeProps {
  type: TaskType;
  size?: BadgeSize;
}

export function TaskTypeBadge({ type, size = 'sm' }: TaskTypeBadgeProps) {
  return (
    <Badge variant={taskTypeVariants[type]} size={size}>
      {taskTypeLabels[type]}
    </Badge>
  );
}

// Quest status badge
type QuestStatus = 'active' | 'paused' | 'completed' | 'abandoned';

const questStatusLabels: Record<QuestStatus, string> = {
  active: '进行中',
  paused: '暂停',
  completed: '完成',
  abandoned: '放弃',
};

const questStatusVariants: Record<QuestStatus, BadgeVariant> = {
  active: 'active',
  paused: 'paused',
  completed: 'completed',
  abandoned: 'danger',
};

interface QuestStatusBadgeProps {
  status: QuestStatus;
  size?: BadgeSize;
}

export function QuestStatusBadge({ status, size = 'sm' }: QuestStatusBadgeProps) {
  return (
    <Badge variant={questStatusVariants[status]} size={size}>
      {questStatusLabels[status]}
    </Badge>
  );
}

export default Badge;
