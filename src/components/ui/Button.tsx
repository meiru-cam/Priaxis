/**
 * Button Component
 * Variants: primary, secondary, success, warning, info, danger, ghost
 * Sizes: sm, md, lg
 */

import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const sizeStyles = {
  sm: css`
    padding: 6px 12px;
    font-size: 0.875rem;
    border-radius: 6px;
  `,
  md: css`
    padding: 10px 20px;
    font-size: 1rem;
    border-radius: 8px;
  `,
  lg: css`
    padding: 14px 28px;
    font-size: 1.125rem;
    border-radius: 10px;
  `,
};

const variantStyles = {
  primary: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.accent.purple}, ${({ theme }) => theme.colors.accent.blue});
    color: ${({ theme }) => theme.colors.text.inverse};
    border: none;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(139, 92, 246, 0.3);
    }
  `,
  secondary: css`
    background: rgba(255, 255, 255, 0.1);
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }
  `,
  success: css`
    background: ${({ theme }) => theme.colors.button.success.bg};
    color: ${({ theme }) => theme.colors.button.success.text};
    border: none;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);
    }
  `,
  warning: css`
    background: ${({ theme }) => theme.colors.button.warning.bg};
    color: ${({ theme }) => theme.colors.button.warning.text};
    border: none;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(251, 146, 60, 0.3);
    }
  `,
  info: css`
    background: ${({ theme }) => theme.colors.button.info.bg};
    color: ${({ theme }) => theme.colors.button.info.text};
    border: none;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(139, 92, 246, 0.3);
    }
  `,
  danger: css`
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    border: none;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    border: none;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.bg.tertiary};
    }
  `,
};

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $isLoading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  ${({ $isLoading }) =>
    $isLoading &&
    css`
      pointer-events: none;
      opacity: 0.7;
    `}
`;

const Spinner = styled.span`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $isLoading={isLoading}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner />}
      {children}
    </StyledButton>
  );
}

export default Button;
