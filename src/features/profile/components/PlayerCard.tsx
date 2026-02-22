/**
 * PlayerCard Component
 * Compact player profile card for header/navigation
 */

import styled from 'styled-components';
import { useGameStore } from '../../../stores';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { getTotalXPForLevel, getXPForLevel } from '../../../lib/player-progression';

interface PlayerCardProps {
  onClick?: () => void;
  compact?: boolean;
}

const CardWrapper = styled.button<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $compact }) => ($compact ? '8px' : '12px')};
  padding: ${({ $compact }) => ($compact ? '6px 12px' : '10px 16px')};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
    transform: translateY(-1px);
  }
`;

const Avatar = styled.div<{ $level: number }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${({ $level }) => {
    if ($level >= 50) return '#ffd700, #ff8c00'; // Gold
    if ($level >= 30) return '#c0c0c0, #a8a8a8'; // Silver
    if ($level >= 10) return '#cd7f32, #8b4513'; // Bronze
    return '#6366f1, #8b5cf6'; // Purple (starter)
  }}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: white;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const ResourceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LevelBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const XPBar = styled.div`
  width: 80px;
  height: 4px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 2px;
  overflow: hidden;
`;

const XPProgress = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #8b5cf6, #a855f7);
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const Title = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`;

const EnergyBadge = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  color: ${({ $level }) => ($level === 'low' ? '#dc2626' : $level === 'medium' ? '#92400e' : '#166534')};
  background: ${({ $level }) => ($level === 'low' ? '#fee2e2' : $level === 'medium' ? '#fef3c7' : '#dcfce7')};
`;

export function PlayerCard({ onClick, compact = false }: PlayerCardProps) {
  const level = useGameStore((s) => s.level);
  const experience = useGameStore((s) => s.experience);
  const energy = useGameStore((s) => s.resources.energy.current);
  const currentTitle = useGameStore((s) => s.currentTitle);
  const { t } = useTranslation();

  // Safe calculations to prevent negative/overflow display
  const safeLevel = Math.max(1, Math.min(level, 100));
  const safeXP = Math.max(0, experience);
  const currentLevelXP = getTotalXPForLevel(safeLevel);
  const nextLevelXP = getXPForLevel(safeLevel);
  const progressXP = Math.max(0, safeXP - currentLevelXP);
  const progressPercent = Math.min(100, Math.max(0, (progressXP / nextLevelXP) * 100));
  const safeEnergy = Math.max(0, Math.min(100, Math.round(energy)));
  const energyLevel = safeEnergy < 30 ? 'low' : safeEnergy < 70 ? 'medium' : 'high';

  return (
    <CardWrapper onClick={onClick} $compact={compact}>
      <Avatar $level={safeLevel}>Lv</Avatar>
      <InfoSection>
        <LevelBadge>
          {t('profile.level').replace('{level}', safeLevel.toString())} • {progressXP}/{nextLevelXP} XP
        </LevelBadge>
        <XPBar>
          <XPProgress $percent={progressPercent} />
        </XPBar>
        <ResourceRow>
          <EnergyBadge $level={energyLevel}>
            ⚡ {t('profile.energy')}: {safeEnergy}
          </EnergyBadge>
        </ResourceRow>
        {!compact && currentTitle && <Title>{currentTitle}</Title>}
      </InfoSection>
    </CardWrapper>
  );
}

export default PlayerCard;
