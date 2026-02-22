/**
 * Modal Component
 * Full-featured modal with portal rendering, animations, and accessibility
 * Sizes: sm, md, lg, full
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  width?: string; // Custom width override (e.g., "600px", "80%")
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div<{ $isClosing: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.bg.modalOverlay};
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease-out;

  ${({ $isClosing }) =>
    $isClosing &&
    css`
      animation: ${fadeIn} 0.2s ease-out reverse;
    `}
`;

const sizeStyles = {
  sm: css`max-width: 500px;`,
  md: css`max-width: 700px;`,
  lg: css`max-width: 900px;`,
  full: css`
    max-width: 95%;
    max-height: 95vh;
  `,
};

const Content = styled.div<{ $size: ModalSize; $isClosing: boolean; $customWidth?: string }>`
  background: ${({ theme }) => theme.colors.bg.modal};
  border-radius: 20px;
  padding: 40px;
  width: ${({ $customWidth }) => $customWidth || 'min(90%, calc(100vw - 32px))'};
  max-height: min(85vh, calc(100vh - 40px));
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  position: relative;
  animation: ${slideIn} 0.3s ease-out;

  /* Responsive padding */
  @media (max-width: 640px) {
    padding: 24px 16px;
    border-radius: 16px;
  }

  ${({ $size, $customWidth }) => !$customWidth && sizeStyles[$size]}

  ${({ $isClosing }) =>
    $isClosing &&
    css`
      animation: ${slideIn} 0.2s ease-out reverse;
    `}

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.accent.primary};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.accent.secondary};
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(107, 114, 128, 0.2);
  border: 1px solid #6b7280;
  color: #9ca3af;
  font-size: 1.5em;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
  font-weight: 300;
  line-height: 1;
  z-index: 10;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: #ef4444;
    color: #ef4444;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Header = styled.div`
  margin-bottom: 25px;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 1.8em;
  font-weight: 600;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.accent.purple}, ${({ theme }) => theme.colors.accent.blue});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 10px;
`;

const Subtitle = styled.p`
  font-size: 1em;
  opacity: 0.9;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Body = styled.div`
  margin-bottom: 25px;
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  width,
  title,
  subtitle,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Handle mouse down to track where the click started
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  };

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if the mouse down AND mouse up (click) both happened on the overlay
    // This prevents closing when selecting text inside the modal and dragging outside
    if (
      closeOnOverlayClick &&
      e.target === e.currentTarget &&
      mouseDownTargetRef.current === e.currentTarget
    ) {
      onClose();
    }
    // Reset after click
    mouseDownTargetRef.current = null;
  };

  // Add/remove event listeners and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnEscape, onClose]);

  // Focus modal container only when it first opens.
  // Do not re-focus on every re-render, otherwise typing fields lose focus.
  useEffect(() => {
    if (!isOpen) return;
    contentRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <Overlay
      $isClosing={false}
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <Content
        ref={contentRef}
        $size={size}
        $customWidth={width}
        $isClosing={false}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {showCloseButton && (
          <CloseButton onClick={onClose} aria-label="Close modal">
            ×
          </CloseButton>
        )}

        {(title || subtitle) && (
          <Header>
            {title && <Title id="modal-title">{title}</Title>}
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
          </Header>
        )}

        <Body>{children}</Body>

        {footer && <Footer>{footer}</Footer>}
      </Content>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
}

// Subcomponents for custom layout
Modal.Header = Header;
Modal.Title = Title;
Modal.Subtitle = Subtitle;
Modal.Body = Body;
Modal.Footer = Footer;

// Confirm Modal - for simple confirmations
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

const ConfirmMessage = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
`;

const ConfirmButton = styled.button<{ $variant: 'default' | 'danger' }>`
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;

  ${({ $variant, theme }) =>
    $variant === 'danger'
      ? css`
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
          }
        `
      : css`
          background: linear-gradient(135deg, ${theme.colors.accent.purple}, ${theme.colors.accent.blue});
          color: ${theme.colors.text.inverse};

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(139, 92, 246, 0.3);
          }
        `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <CancelButton onClick={onClose} disabled={isLoading}>
            {cancelText}
          </CancelButton>
          <ConfirmButton
            $variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : confirmText}
          </ConfirmButton>
        </>
      }
    >
      <ConfirmMessage>{message}</ConfirmMessage>
    </Modal>
  );
}

// Alert Modal - for simple alerts
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

const AlertIcon = styled.div<{ $variant: 'info' | 'success' | 'warning' | 'error' }>`
  font-size: 3rem;
  text-align: center;
  margin-bottom: 16px;

  ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return '&::before { content: "✓"; color: #10b981; }';
      case 'warning':
        return '&::before { content: "⚠"; color: #f59e0b; }';
      case 'error':
        return '&::before { content: "✕"; color: #ef4444; }';
      default:
        return '&::before { content: "ℹ"; color: #3b82f6; }';
    }
  }}
`;

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = '确定',
  variant = 'info',
}: AlertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <ConfirmButton $variant="default" onClick={onClose}>
          {buttonText}
        </ConfirmButton>
      }
    >
      <AlertIcon $variant={variant} />
      <ConfirmMessage>{message}</ConfirmMessage>
    </Modal>
  );
}

export default Modal;
