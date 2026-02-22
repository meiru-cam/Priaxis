/**
 * Card Component
 * Variants: default, subtle-purple, subtle-blue, subtle-green, subtle-gold, highlight
 * With optional header, body, and footer sections
 */

import styled, { css } from 'styled-components';

type CardVariant = 'default' | 'subtle-purple' | 'subtle-blue' | 'subtle-green' | 'subtle-gold' | 'highlight';

interface CardProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const paddingStyles = {
  none: css`padding: 0;`,
  sm: css`padding: 10px;`,
  md: css`padding: 15px;`,
  lg: css`padding: 20px;`,
};

const variantStyles = {
  default: css`
    background: ${({ theme }) => theme.colors.bg.secondary};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
  `,
  'subtle-purple': css`
    background: ${({ theme }) => theme.colors.card.purple.bg};
    color: ${({ theme }) => theme.colors.card.purple.text};
  `,
  'subtle-blue': css`
    background: ${({ theme }) => theme.colors.card.blue.bg};
    color: ${({ theme }) => theme.colors.card.blue.text};
  `,
  'subtle-green': css`
    background: ${({ theme }) => theme.colors.card.green.bg};
    color: ${({ theme }) => theme.colors.card.green.text};
  `,
  'subtle-gold': css`
    background: ${({ theme }) => theme.colors.card.gold.bg};
    color: ${({ theme }) => theme.colors.card.gold.text};
  `,
  highlight: css`
    background: ${({ theme }) => theme.colors.card.highlight.bg};
    color: ${({ theme }) => theme.colors.card.highlight.text};
    border: 1px solid ${({ theme }) => theme.colors.card.highlight.border};
  `,
};

const StyledCard = styled.div<{
  $variant: CardVariant;
  $padding: 'none' | 'sm' | 'md' | 'lg';
  $hoverable: boolean;
  $clickable: boolean;
}>`
  border-radius: 10px;
  transition: all 0.2s ease;

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $padding }) => paddingStyles[$padding]}

  ${({ $hoverable }) =>
    $hoverable &&
    css`
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${({ theme }) => theme.shadows.lg};
      }
    `}

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      user-select: none;
    `}
`;

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  children,
  className,
  onClick,
}: CardProps) {
  return (
    <StyledCard
      $variant={variant}
      $padding={padding}
      $hoverable={hoverable}
      $clickable={clickable || !!onClick}
      className={className}
      onClick={onClick}
    >
      {children}
    </StyledCard>
  );
}

// Card subcomponents
const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CardSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 4px 0 0;
`;

const CardBody = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

// Export subcomponents
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Actions = CardActions;

// Task Card - specialized for task items
interface TaskCardProps {
  completed?: boolean;
  overdue?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const StyledTaskCard = styled(StyledCard)<{
  $completed: boolean;
  $overdue: boolean;
}>`
  position: relative;

  ${({ $completed }) =>
    $completed &&
    css`
      opacity: 0.7;
      background: ${({ theme }) => theme.colors.bg.tertiary};

      &::after {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        width: 100%;
        height: 1px;
        background: ${({ theme }) => theme.colors.text.tertiary};
      }
    `}

  ${({ $overdue }) =>
    $overdue &&
    css`
      border-left: 3px solid ${({ theme }) => theme.colors.status.danger.border};
    `}
`;

export function TaskCard({
  completed = false,
  overdue = false,
  children,
  className,
  onClick,
}: TaskCardProps) {
  return (
    <StyledTaskCard
      $variant="default"
      $padding="md"
      $hoverable
      $clickable={!!onClick}
      $completed={completed}
      $overdue={overdue}
      className={className}
      onClick={onClick}
    >
      {children}
    </StyledTaskCard>
  );
}

// Stats Card - for displaying statistics
interface StatsCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: CardVariant;
}

const StatsCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatsIcon = styled.div`
  font-size: 2rem;
  line-height: 1;
`;

const StatsInfo = styled.div`
  flex: 1;
`;

const StatsLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 4px;
`;

const StatsValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatsTrend = styled.span<{ $trend: 'up' | 'down' | 'neutral' }>`
  font-size: 0.75rem;
  margin-left: 8px;
  color: ${({ theme, $trend }) =>
    $trend === 'up'
      ? theme.colors.status.success.text
      : $trend === 'down'
      ? theme.colors.status.danger.text
      : theme.colors.text.tertiary};
`;

export function StatsCard({ icon, label, value, trend, trendValue, variant = 'default' }: StatsCardProps) {
  return (
    <Card variant={variant} padding="md">
      <StatsCardContent>
        {icon && <StatsIcon>{icon}</StatsIcon>}
        <StatsInfo>
          <StatsLabel>{label}</StatsLabel>
          <StatsValue>
            {value}
            {trend && trendValue && (
              <StatsTrend $trend={trend}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </StatsTrend>
            )}
          </StatsValue>
        </StatsInfo>
      </StatsCardContent>
    </Card>
  );
}

export default Card;
