/**
 * Breadcrumb Component
 * Navigation breadcrumb for hierarchy display
 */

import styled from 'styled-components';

export interface BreadcrumbItem {
  id: string;
  label: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onClick?: (item: BreadcrumbItem) => void;
}

const BreadcrumbContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  white-space: nowrap;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 2px;
  }
`;

const BreadcrumbItemWrapper = styled.button<{ $isLast: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: ${({ $isLast, theme }) =>
    $isLast ? theme.colors.accent.purple : 'transparent'};
  color: ${({ $isLast, theme }) =>
    $isLast ? 'white' : theme.colors.text.secondary};
  font-size: 0.9rem;
  cursor: ${({ $isLast }) => ($isLast ? 'default' : 'pointer')};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isLast, theme }) =>
      $isLast ? theme.colors.accent.purple : theme.colors.bg.secondary};
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 0.8rem;
`;

const Icon = styled.span`
  font-size: 1rem;
`;

export function Breadcrumb({ items, onClick }: BreadcrumbProps) {
  return (
    <BreadcrumbContainer>
      {items.map((item, index) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {index > 0 && <Separator>›</Separator>}
          <BreadcrumbItemWrapper
            $isLast={index === items.length - 1}
            onClick={() => index < items.length - 1 && onClick?.(item)}
          >
            {item.icon && <Icon>{item.icon}</Icon>}
            <span>{item.label}</span>
          </BreadcrumbItemWrapper>
        </div>
      ))}
    </BreadcrumbContainer>
  );
}

export default Breadcrumb;

