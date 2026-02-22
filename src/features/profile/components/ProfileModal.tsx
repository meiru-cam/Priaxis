/**
 * ProfileModal Component
 * Full player profile with stats, titles, and achievements
 */

import { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Modal } from '../../../components/ui';
import { BeliefConfigModal } from '../../../components/belief/BeliefConfigModal';
import { useGameStore } from '../../../stores';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import type { TranslationKey } from '../../../lib/i18n/types';
import { getTotalXPForLevel, getXPForLevel } from '../../../lib/player-progression';
import { sumTaskFocusMinutes } from '../../../lib/focus-time';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

// ===== Header Section =====
const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 12px;
`;

const Avatar = styled.div<{ $level: number }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${({ $level }) => {
    if ($level >= 50) return '#ffd700, #ff8c00';
    if ($level >= 30) return '#c0c0c0, #a8a8a8';
    if ($level >= 10) return '#cd7f32, #8b4513';
    return '#6366f1, #8b5cf6';
  }}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: white;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const PlayerName = styled.h2`
  margin: 0 0 4px;
  font-size: 1.4rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TitleBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 20px;
  font-size: 0.8rem;
  color: white;
  margin-bottom: 12px;
`;

const XPDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LevelBadge = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.purple};
`;

const XPBarLarge = styled.div`
  flex: 1;
  height: 8px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 4px;
  overflow: hidden;
`;

const XPProgressLarge = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #8b5cf6, #a855f7);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const XPText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 100px;
  text-align: right;
`;

// ===== Stats Section =====
const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 10px;
  padding: 16px;
  text-align: center;
`;

const StatEmoji = styled.div`
  font-size: 1.5rem;
  margin-bottom: 8px;
`;

const StatName = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatBar = styled.div`
  margin-top: 8px;
  height: 4px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 2px;
  overflow: hidden;
`;

const StatProgress = styled.div<{ $value: number; $color: string }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  background: ${({ $color }) => $color};
  border-radius: 2px;
`;

const SkillsSection = styled.div`
  margin-top: 16px;
`;

const BeliefSection = styled.div`
  margin-top: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 10px;
  padding: 12px;
`;

const BeliefHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const BeliefModeChip = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: ${({ theme }) => theme.colors.card.purple.bg};
  color: ${({ theme }) => theme.colors.accent.purple};
`;

const BeliefList = styled.ul`
  margin: 8px 0 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.84rem;
  line-height: 1.5;
`;

const OrchestraSection = styled.div`
  margin-top: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 10px;
  padding: 12px;
`;

const OrchestraMeta = styled.div`
  margin-top: 8px;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.45;
`;

const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const SkillCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 10px;
  padding: 10px 12px;
`;

const SkillTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 6px;
`;

const SkillMeta = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// ===== Resources Section =====
const ResourcesRow = styled.div`
  display: flex;
  gap: 16px;
`;

const ResourceCard = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ResourceIcon = styled.div`
  font-size: 1.8rem;
`;

const ResourceInfo = styled.div`
  flex: 1;
`;

const ResourceName = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ResourceValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
`;

const ChangeIndicator = styled.span<{ $positive: boolean; $visible: boolean }>`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? '#10b981' : '#ef4444')};
  animation: ${({ $visible }) => ($visible ? fadeIn : fadeOut)} 0.3s ease forwards;
`;

// ===== Titles Section =====
const TitlesSection = styled.div``;

const TitlesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TitleItem = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid
    ${({ $active, theme }) =>
    $active ? theme.colors.accent.purple : theme.colors.border.primary};
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accent.purple : theme.colors.text.secondary};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    background: rgba(139, 92, 246, 0.1);
  }
`;

// ===== Tab Navigation =====
const TabNav = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.accent.purple : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? 'white' : theme.colors.text.secondary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active, theme }) =>
    $active ? theme.colors.accent.purple : theme.colors.bg.tertiary};
  }
`;

// Stats definitions
// We'll translate name inside the component
const STATS_CONFIG = [
  { key: 'life', nameKey: 'profile.stat_life', emoji: '❤️', color: '#ef4444' },
  { key: 'intelligence', nameKey: 'profile.stat_intelligence', emoji: '🎯', color: '#3b82f6' },
  { key: 'spirit', nameKey: 'profile.stat_spirit', emoji: '✨', color: '#a855f7' },
  { key: 'action', nameKey: 'profile.stat_action', emoji: '⚡', color: '#f59e0b' },
  { key: 'agility', nameKey: 'profile.stat_agility', emoji: '🔄', color: '#10b981' },
  { key: 'charm', nameKey: 'profile.stat_charm', emoji: '💫', color: '#ec4899' },
];

// Default titles
const DEFAULT_TITLES = [
  { id: 'novice', nameKey: 'profile.title_novice' as TranslationKey, minLevel: 1 },
  { id: 'apprentice', nameKey: 'profile.title_apprentice' as TranslationKey, minLevel: 5 },
  { id: 'journeyman', nameKey: 'profile.title_journeyman' as TranslationKey, minLevel: 10 },
  { id: 'expert', nameKey: 'profile.title_expert' as TranslationKey, minLevel: 20 },
  { id: 'master', nameKey: 'profile.title_master' as TranslationKey, minLevel: 30 },
  { id: 'grandmaster', nameKey: 'profile.title_grandmaster' as TranslationKey, minLevel: 50 },
];

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'titles'>('stats');

  const level = useGameStore((s) => s.level);
  const experience = useGameStore((s) => s.experience);
  const currentTitle = useGameStore((s) => s.currentTitle);
  const unlockedTitles = useGameStore((s) => s.unlockedTitles);
  const stats = useGameStore((s) => s.stats);
  const skills = useGameStore((s) => s.skills);
  const beliefSystem = useGameStore((s) => s.beliefSystem);
  const worldState = useGameStore((s) => s.worldState);
  const loreProfile = useGameStore((s) => s.loreProfile);
  const orchestrationLog = useGameStore((s) => s.orchestrationLog);
  const resources = useGameStore((s) => s.resources);
  const customTasks = useGameStore((s) => s.customTasks);
  const archivedTasks = useGameStore((s) => s.archivedTasks);
  const setCurrentTitle = useGameStore((s) => s.setCurrentTitle);
  // unlockTitle is available for future use when completing seasons/chapters
  // const unlockTitle = useGameStore((s) => s.unlockTitle);
  const removeTitle = useGameStore((s) => s.removeTitle);
  const resetPlayerStats = useGameStore((s) => s.resetPlayerStats);
  const setBeliefMode = useGameStore((s) => s.setBeliefMode);
  const setProfileBeliefs = useGameStore((s) => s.setProfileBeliefs);
  const runOrchestrationCycle = useGameStore((s) => s.runOrchestrationCycle);
  const { t } = useTranslation();
  const [beliefConfigOpen, setBeliefConfigOpen] = useState(false);

  // Gold from resources.money.balance (the actual updated value by AI tools)
  const goldBalance = resources.money.balance;

  // Track gold changes for animation
  const [goldChange, setGoldChange] = useState<number | null>(null);
  const [showGoldChange, setShowGoldChange] = useState(false);
  const prevGoldRef = useRef(goldBalance);

  useEffect(() => {
    if (prevGoldRef.current !== goldBalance && prevGoldRef.current !== undefined) {
      const diff = goldBalance - prevGoldRef.current;
      if (diff !== 0) {
        setGoldChange(diff);
        setShowGoldChange(true);
        const timer = setTimeout(() => setShowGoldChange(false), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevGoldRef.current = goldBalance;
  }, [goldBalance]);

  // Safe calculations
  const safeLevel = Math.max(1, Math.min(level, 100));
  const safeXP = Math.max(0, experience);
  const currentLevelXP = getTotalXPForLevel(safeLevel);
  const nextLevelXP = getXPForLevel(safeLevel);
  const progressXP = Math.max(0, safeXP - currentLevelXP);
  const progressPercent = Math.min(100, Math.max(0, (progressXP / nextLevelXP) * 100));

  // Get available titles based on level
  const availableTitles = DEFAULT_TITLES.filter((title) => safeLevel >= title.minLevel);
  const localizedDefaultTitles = DEFAULT_TITLES.map((title) => t(title.nameKey));
  const allTitles = [...availableTitles.map((title) => t(title.nameKey)), ...unlockedTitles];
  const totalFocusMinutes = sumTaskFocusMinutes([...customTasks, ...archivedTasks]);
  const skillEntries = [
    { key: 'magician.manifestation', label: t('profile.skill.manifestation'), data: skills.magician.manifestation },
    { key: 'magician.beliefAlignment', label: t('profile.skill.belief_alignment'), data: skills.magician.beliefAlignment },
    { key: 'magician.energyAlchemy', label: t('profile.skill.energy_alchemy'), data: skills.magician.energyAlchemy },
    { key: 'systemBalancer.teaming', label: t('profile.skill.teaming'), data: skills.systemBalancer.teaming },
    { key: 'systemBalancer.karmaManagement', label: t('profile.skill.karma_management'), data: skills.systemBalancer.karmaManagement },
    { key: 'systemBalancer.startupAlchemy', label: t('profile.skill.startup_alchemy'), data: skills.systemBalancer.startupAlchemy },
    { key: 'observer.intuitionNavigation', label: t('profile.skill.intuition_navigation'), data: skills.observer.intuitionNavigation },
    { key: 'observer.selfCompassion', label: t('profile.skill.self_compassion'), data: skills.observer.selfCompassion },
    { key: 'observer.tripleVision', label: t('profile.skill.triple_vision'), data: skills.observer.tripleVision },
  ];
  const defaultBeliefs = t('belief.default_values').split('|').filter(Boolean);
  const beliefList = beliefSystem.mode === 'profile' && beliefSystem.profileBeliefs.length > 0
    ? beliefSystem.profileBeliefs
    : defaultBeliefs;

  const handleResetStats = () => {
    if (window.confirm(t('profile.reset_confirm'))) {
      resetPlayerStats(1, 0);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile.title')} width="600px">
      <ModalContent>
        {/* Profile Header */}
        <ProfileHeader>
          <Avatar $level={safeLevel}>Lv{safeLevel}</Avatar>
          <HeaderInfo>
            <PlayerName>Player</PlayerName>
            {currentTitle && <TitleBadge>{currentTitle}</TitleBadge>}
            <XPDisplay>
              <LevelBadge>{t('profile.level').replace('{level}', safeLevel.toString())}</LevelBadge>
              <XPBarLarge>
                <XPProgressLarge $percent={progressPercent} />
              </XPBarLarge>
              <XPText>
                {progressXP} / {nextLevelXP} XP
              </XPText>
            </XPDisplay>
            <button
              onClick={handleResetStats}
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              {t('profile.reset_level')}
            </button>
          </HeaderInfo>
        </ProfileHeader>

        {/* Resources */}
        <div>
          <SectionTitle>{t('profile.resources')}</SectionTitle>
          <ResourcesRow>
            <ResourceCard>
              <ResourceIcon>⚡</ResourceIcon>
              <ResourceInfo>
                <ResourceName>{t('profile.energy')}</ResourceName>
                <ResourceValue>{resources.energy.current}%</ResourceValue>
              </ResourceInfo>
            </ResourceCard>
            <ResourceCard>
              <ResourceIcon>🪙</ResourceIcon>
              <ResourceInfo>
                <ResourceName>{t('profile.gold')}</ResourceName>
                <ResourceValue>
                  {goldBalance}
                  {goldChange !== null && (
                    <ChangeIndicator
                      $positive={goldChange > 0}
                      $visible={showGoldChange}
                    >
                      {goldChange > 0 ? `+${goldChange}` : goldChange}
                    </ChangeIndicator>
                  )}
                </ResourceValue>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', lineHeight: 1.4 }}>
                  <div>{t('profile.monthly_income')}: {resources.money.monthlyIncome}</div>
                  <div>{t('profile.monthly_spent')}: {resources.money.monthlySpent}</div>
                  <div>{t('profile.monthly_net')}: {resources.money.monthlyNet}</div>
                </div>
              </ResourceInfo>
            </ResourceCard>
            <ResourceCard>
              <ResourceIcon>⏰</ResourceIcon>
              <ResourceInfo>
                <ResourceName>{t('profile.focus_time')}</ResourceName>
                <ResourceValue>{totalFocusMinutes} {t('profile.minutes')}</ResourceValue>
              </ResourceInfo>
            </ResourceCard>
          </ResourcesRow>
        </div>

        {/* Tab Navigation */}
        <TabNav>
          <Tab $active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
            {t('profile.stats')}
          </Tab>
          <Tab $active={activeTab === 'titles'} onClick={() => setActiveTab('titles')}>
            {t('profile.titles')}
          </Tab>
        </TabNav>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div>
            <StatsGrid>
              {STATS_CONFIG.map((stat) => (
                <StatCard key={stat.key}>
                  <StatEmoji>{stat.emoji}</StatEmoji>
                  <StatName>{t(stat.nameKey as TranslationKey)}</StatName>
                  <StatValue>
                    {stats[stat.key as keyof typeof stats] || 0}
                  </StatValue>
                  <StatBar>
                    <StatProgress
                      $value={stats[stat.key as keyof typeof stats] || 0}
                      $color={stat.color}
                    />
                  </StatBar>
                </StatCard>
              ))}
            </StatsGrid>
            <SkillsSection>
              <SectionTitle>{t('profile.skills')}</SectionTitle>
              <SkillsGrid>
                {skillEntries.map((entry) => (
                  <SkillCard key={entry.key}>
                    <SkillTitle>{entry.label}</SkillTitle>
                    <SkillMeta>
                      {t('profile.skill_level')}: {entry.data.level} · {t('profile.skill_xp')}: {entry.data.xp}/{entry.data.maxXp}
                    </SkillMeta>
                  </SkillCard>
                ))}
              </SkillsGrid>
            </SkillsSection>
            <BeliefSection>
              <BeliefHeader>
                <SectionTitle style={{ marginBottom: 0 }}>{t('belief.profile_section_title')}</SectionTitle>
                <button type="button" onClick={() => setBeliefConfigOpen(true)}>
                  {t('belief.configure')}
                </button>
              </BeliefHeader>
              <div style={{ marginTop: '8px' }}>
                <BeliefModeChip>
                  {beliefSystem.mode === 'profile' ? t('belief.mode_profile') : t('belief.mode_default')}
                </BeliefModeChip>
              </div>
              <BeliefList>
                {beliefList.slice(0, 5).map((belief) => (
                  <li key={belief}>{belief}</li>
                ))}
              </BeliefList>
            </BeliefSection>
            <OrchestraSection>
              <BeliefHeader>
                <SectionTitle style={{ marginBottom: 0 }}>{t('orchestra.profile_title')}</SectionTitle>
                <button
                  type="button"
                  onClick={() => runOrchestrationCycle('manual', 'manual_profile_run')}
                >
                  {t('orchestra.run_now')}
                </button>
              </BeliefHeader>
              <OrchestraMeta>
                <div>{t('orchestra.world_epoch').replace('{value}', String(worldState.epoch))}</div>
                <div>{t('orchestra.world_theme').replace('{value}', loreProfile.worldTheme)}</div>
                <div>{t('orchestra.last_evolution').replace('{value}', worldState.lastEvolutionAt || '-')}</div>
                <div>{t('orchestra.last_trigger').replace('{value}', orchestrationLog[0]?.trigger || '-')}</div>
              </OrchestraMeta>
            </OrchestraSection>
          </div>
        )}

        {/* Titles Tab */}
        {activeTab === 'titles' && (
          <TitlesSection>
            <SectionTitle>
              {t('profile.unlocked_titles').replace('{count}', allTitles.length.toString())}
            </SectionTitle>
            <TitlesList>
              {allTitles.map((title) => (
                <TitleItem
                  key={title}
                  $active={currentTitle === title}
                  onClick={() => setCurrentTitle(title)}
                  style={{ position: 'relative' }}
                >
                  {title}
                  {!localizedDefaultTitles.includes(title) && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t('profile.delete_title_confirm').replace('{title}', title))) {
                          removeTitle(title);
                        }
                      }}
                      style={{
                        marginLeft: '6px',
                        fontSize: '0.7rem',
                        opacity: 0.6,
                        cursor: 'pointer',
                      }}
                      title={t('recurring.delete_confirm_title')}
                    >
                      ✕
                    </span>
                  )}
                </TitleItem>
              ))}
              {DEFAULT_TITLES.filter((title) => safeLevel < title.minLevel).map((title) => (
                <TitleItem key={title.id} $active={false} disabled style={{ opacity: 0.4 }}>
                  🔒 Lv.{title.minLevel} {t(title.nameKey)}
                </TitleItem>
              ))}
            </TitlesList>
            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#6b7280' }}>
              {t('profile.tip_titles')}
            </div>
          </TitlesSection>
        )}
      </ModalContent>
      <BeliefConfigModal
        isOpen={beliefConfigOpen}
        onClose={() => setBeliefConfigOpen(false)}
        mode={beliefSystem.mode}
        profileBeliefs={beliefSystem.profileBeliefs}
        onSave={(nextMode, nextBeliefs) => {
          setBeliefMode(nextMode);
          setProfileBeliefs(nextBeliefs);
        }}
      />
    </Modal>
  );
}

export default ProfileModal;
