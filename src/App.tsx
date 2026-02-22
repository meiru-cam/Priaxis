import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import styled from 'styled-components';

import { themes, GlobalStyles } from './styles';
import { useEffectiveTheme, useGameStore, useUIStore, usePlannerStore, useChatStore } from './stores';
import { useTranslation } from './lib/i18n/useTranslation';
import type { TranslationKey } from './lib/i18n/types';
import { monitorEngine } from './services/monitor-engine';
import { systemMonitor } from './services/system-monitor';

const importDailyFeature = () => import('./features/daily');
const importQuestFeature = () => import('./features/quest');
const importSeasonFeature = () => import('./features/season');
const importWeeklyFeature = () => import('./features/weekly');
const importRecurringFeature = () => import('./features/recurring');
const importPomodoroFeature = () => import('./features/pomodoro');
const importSettingsFeature = () => import('./features/settings');
const importProfileFeature = () => import('./features/profile');
const importCommandCenterFeature = () => import('./features/command-center');
const importPlannerFeature = () => import('./features/planner');
const importAIFeature = () => import('./features/ai');
const importSpacedRepetitionFeature = () => import('./features/spaced-repetition');
const importRewardsFeature = () => import('./features/rewards');

const DailyPage = lazy(() => importDailyFeature().then((m) => ({ default: m.DailyPage })));
const QuestPage = lazy(() => importQuestFeature().then((m) => ({ default: m.QuestPage })));
const SeasonPage = lazy(() => importSeasonFeature().then((m) => ({ default: m.SeasonPage })));
const WeeklyPage = lazy(() => importWeeklyFeature().then((m) => ({ default: m.WeeklyPage })));
const RecurringPage = lazy(() => importRecurringFeature().then((m) => ({ default: m.RecurringPage })));
const PomodoroWidget = lazy(() => importPomodoroFeature().then((m) => ({ default: m.PomodoroWidget })));
const DataManagementModal = lazy(() => importSettingsFeature().then((m) => ({ default: m.DataManagementModal })));
const SettingsModal = lazy(() => importSettingsFeature().then((m) => ({ default: m.SettingsModal })));
const PlayerCard = lazy(() => importProfileFeature().then((m) => ({ default: m.PlayerCard })));
const ProfileModal = lazy(() => importProfileFeature().then((m) => ({ default: m.ProfileModal })));
const CommandCenterPage = lazy(() => importCommandCenterFeature().then((m) => ({ default: m.CommandCenterPage })));
const StatusIndicator = lazy(() => importPlannerFeature().then((m) => ({ default: m.StatusIndicator })));
const InterventionPopup = lazy(() => importPlannerFeature().then((m) => ({ default: m.InterventionPopup })));
const SummaryDashboard = lazy(() => importPlannerFeature().then((m) => ({ default: m.SummaryDashboard })));
const AIChatInterface = lazy(() => importAIFeature().then((m) => ({ default: m.AIChatInterface })));
const SpacedRepetitionTab = lazy(() => importSpacedRepetitionFeature().then((m) => ({ default: m.SpacedRepetitionTab })));
const RewardBoardPage = lazy(() => importRewardsFeature().then((m) => ({ default: m.RewardBoardPage })));

const SuspenseFallback = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
);

// Placeholder components - will be replaced in later phases
const PlaceholderPage = ({ name }: { name: string }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>{name}</h2>
    <p>This page will be implemented in a future phase.</p>
  </div>
);

// Navigation tabs configuration
// Labels will be translated in the component
const navTabsConfig: Record<string, { icon: string }> = {
  daily: { icon: '💫' },
  quest: { icon: '📋' },
  season: { icon: '📜' },
  'command-center': { icon: '🎯' },
  weekly: { icon: '📅' },
  recurring: { icon: '🔄' },
  rewards: { icon: '🎁' },
  'spaced-repetition': { icon: '📚' },
  reflection: { icon: '📊' },
};

const DEFAULT_TAB_ORDER = ['daily', 'quest', 'season', 'command-center', 'weekly', 'recurring', 'rewards', 'spaced-repetition', 'reflection'];

const TAB_MODULE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  daily: importDailyFeature,
  quest: importQuestFeature,
  season: importSeasonFeature,
  'command-center': importCommandCenterFeature,
  weekly: importWeeklyFeature,
  recurring: importRecurringFeature,
  rewards: importRewardsFeature,
  'spaced-repetition': importSpacedRepetitionFeature,
  reflection: importPlannerFeature,
};

const preloadedTabModules = new Set<string>();

function preloadTabModule(tabId: string) {
  const preloader = TAB_MODULE_PRELOADERS[tabId];
  if (!preloader || preloadedTabModules.has(tabId)) return;
  preloadedTabModules.add(tabId);
  void preloader().catch(() => {
    preloadedTabModules.delete(tabId);
  });
}

// Styled components for navigation
const NavContainer = styled.nav`
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 2px;
  }
`;

const NavTab = styled.button<{ $active: boolean; $dragging?: boolean; $dragOver?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme, $active, $dragOver }) =>
    $dragOver ? theme.colors.bg.tertiary : $active ? theme.colors.accent.purple : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? 'white' : theme.colors.text.secondary};
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: ${({ $dragging }) => ($dragging ? 'grabbing' : 'grab')};
  transition: all 0.2s ease;
  white-space: nowrap;
  opacity: ${({ $dragging }) => ($dragging ? 0.5 : 1)};
  transform: ${({ $dragOver }) => ($dragOver ? 'scale(1.05)' : 'scale(1)')};
  user-select: none;

  &:hover {
    background: ${({ theme, $active }) =>
    $active ? theme.colors.accent.purple : theme.colors.bg.tertiary};
  }
`;

// Navigation component with drag-and-drop
function Navigation({ onTabHover }: { onTabHover?: (tabId: string) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabOrder = useUIStore((s) => s.tabOrder);
  const setTabOrder = useUIStore((s) => s.setTabOrder);
  const { t } = useTranslation();

  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const dragNodeRef = useRef<HTMLButtonElement | null>(null);

  // Get ordered tabs based on stored order, filtered to only include configured tabs
  const orderedTabs = (tabOrder.length > 0 ? tabOrder : DEFAULT_TAB_ORDER)
    .filter(id => navTabsConfig[id])
    .map(id => ({ id, path: `/${id}`, ...navTabsConfig[id] }));

  // Add any missing tabs from config (in case new tabs are added)
  Object.keys(navTabsConfig).forEach(id => {
    if (!orderedTabs.find(t => t.id === id)) {
      orderedTabs.push({ id, path: `/${id}`, ...navTabsConfig[id] });
    }
  });

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, tabId: string) => {
    setDraggedTab(tabId);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
    // Add a small delay to allow the drag image to be captured
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTab && tabId !== draggedTab) {
      setDragOverTab(tabId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTab(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTabId) return;

    const newOrder = [...orderedTabs.map(t => t.id)];
    const draggedIndex = newOrder.indexOf(draggedTab);
    const targetIndex = newOrder.indexOf(targetTabId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged item and insert at new position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedTab);
      setTabOrder(newOrder);
    }

    setDraggedTab(null);
    setDragOverTab(null);
  };

  useEffect(() => {
    const handleTabShortcut = (e: KeyboardEvent) => {
      // App-level tab switch: Opt/Alt + 1~9
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      );
      if (isTypingTarget) return;

      const match = /^Digit([1-9])$/.exec(e.code);
      if (!match) return;

      const index = Number(match[1]) - 1;
      const targetTab = orderedTabs[index];
      if (!targetTab) return;

      e.preventDefault();
      preloadTabModule(targetTab.id);
      navigate(targetTab.path);
      onTabHover?.(targetTab.id);
    };

    window.addEventListener('keydown', handleTabShortcut);
    return () => window.removeEventListener('keydown', handleTabShortcut);
  }, [navigate, onTabHover, orderedTabs]);

  return (
    <NavContainer>
      {orderedTabs.map((tab) => (
        <NavTab
          key={tab.path}
          $active={location.pathname === tab.path}
          $dragging={draggedTab === tab.id}
          $dragOver={dragOverTab === tab.id}
          onClick={() => navigate(tab.path)}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, tab.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, tab.id)}
          onMouseEnter={() => onTabHover?.(tab.id)}
          onFocus={() => onTabHover?.(tab.id)}
        >
          <span>{tab.icon}</span>
          <span>{t(`nav.${tab.id.replace(/-/g, '_')}` as TranslationKey)}</span>
        </NavTab>
      ))}
    </NavContainer>
  );
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const effectiveTheme = useEffectiveTheme();
  // Get variant preferences from store
  const lightVariant = useUIStore((s) => s.lightThemeVariant);
  const darkVariant = useUIStore((s) => s.darkThemeVariant);

  // Select the correct theme object based on effective mode and variant
  // Fallback to solarized if something is weird
  const theme = effectiveTheme === 'dark'
    ? (themes.dark[darkVariant] || themes.dark.solarized)
    : (themes.light[lightVariant] || themes.light.solarized);

  const themeMode = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const checkDailyReset = useGameStore((s) => s.checkDailyReset);
  const { t, language } = useTranslation();
  const [showDataModal, setShowDataModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const currentIntervention = usePlannerStore(s => s.currentIntervention);
  const { isOpen: chatIsOpen, setIsOpen: setChatIsOpen } = useChatStore();

  // Sync theme with HTML data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [effectiveTheme]);

  const handleOpenChat = () => {
    setChatIsOpen(true);
  };

  const cycleTheme = () => {
    if (themeMode === 'light') setTheme('dark');
    else if (themeMode === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (themeMode === 'light') return '☀️';
    if (themeMode === 'dark') return '🌙';
    return '🖥️';
  };

  const getThemeLabel = () => {
    if (themeMode === 'light') return t('mode.light');
    if (themeMode === 'dark') return t('mode.dark');
    return t('mode.system');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  // Check for daily reset on mount
  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  // Preload high-frequency tabs when browser is idle to reduce first-switch delay.
  useEffect(() => {
    const highFrequencyTabs = ['daily', 'quest', 'season'];
    const allTabs = Object.keys(TAB_MODULE_PRELOADERS);
    const remainingTabs = allTabs.filter((tabId) => !highFrequencyTabs.includes(tabId));

    const runHighFrequencyPreload = () => {
      highFrequencyTabs.forEach(preloadTabModule);
    };
    const runRemainingPreload = () => {
      remainingTabs.forEach(preloadTabModule);
    };

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleApi.requestIdleCallback) {
      const highHandle = idleApi.requestIdleCallback(runHighFrequencyPreload, { timeout: 1000 });
      const remainingHandle = idleApi.requestIdleCallback(runRemainingPreload, { timeout: 3500 });
      return () => {
        idleApi.cancelIdleCallback?.(highHandle);
        idleApi.cancelIdleCallback?.(remainingHandle);
      };
    }

    const highTimer = window.setTimeout(runHighFrequencyPreload, 600);
    const remainingTimer = window.setTimeout(runRemainingPreload, 1800);
    return () => {
      window.clearTimeout(highTimer);
      window.clearTimeout(remainingTimer);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <div className="app">
        <header style={{
          padding: '1rem 2rem',
          background: theme.colors.bg.secondary,
          borderBottom: `1px solid ${theme.colors.border.primary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '48px', height: '48px', borderRadius: '8px' }}
            />
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>
                🎯 {t('app.title')}
              </h1>
              <p style={{ margin: '0.25rem 0 0', color: theme.colors.text.tertiary, fontSize: '0.75rem' }}>
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxWidth: '600px'
          }}>
            <p style={{
              margin: 0,
              fontSize: language === 'en' ? '0.9rem' : '0.8rem',
              color: theme.colors.accent.blue || '#3b82f6',
              fontWeight: 500,
              lineHeight: 1.4,
            }}>
              {t('app.quote1')}
            </p>
            <p style={{
              margin: 0,
              fontSize: language === 'en' ? '0.9rem' : '0.8rem',
              color: theme.colors.accent.gold || '#f59e0b',
              fontWeight: 500,
              lineHeight: 1.4,
            }}>
              {t('app.quote2')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Suspense fallback={null}>
              <StatusIndicator compact />
              <PlayerCard onClick={() => setShowProfileModal(true)} compact />
            </Suspense>
            <button
              onClick={toggleLanguage}
              title={language === 'zh' ? 'Switch to English' : '切换到中文'}
              style={{
                padding: '8px 12px',
                background: theme.colors.bg.tertiary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: theme.colors.text.primary,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              {language === 'zh' ? '中' : 'EN'}
            </button>
            <button
              onClick={cycleTheme}
              title={`当前: ${getThemeLabel()} 模式 (点击切换)`}
              style={{
                padding: '8px 12px',
                background: theme.colors.bg.tertiary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: theme.colors.text.primary,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {getThemeIcon()}
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              title={t('settings.appearance')}
              style={{
                padding: '8px 12px',
                background: theme.colors.bg.tertiary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: theme.colors.text.primary,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⚙️
            </button>
            <button
              onClick={handleOpenChat}
              title={t('ai.chat_title')}
              style={{
                padding: '8px 12px',
                background: currentIntervention ? theme.colors.status.warning.bg :
                  chatIsOpen ? theme.colors.accent.primary : theme.colors.bg.tertiary,
                border: `1px solid ${currentIntervention ? theme.colors.status.warning.border :
                  chatIsOpen ? theme.colors.accent.primary : theme.colors.border.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: currentIntervention ? theme.colors.status.warning.text :
                  chatIsOpen ? '#fff' : theme.colors.text.primary,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: currentIntervention ? 'pulse 2s infinite' : 'none',
              }}
            >
              🤖
            </button>
            <button
              onClick={() => setShowDataModal(true)}
              title={t('settings.data')}
              style={{
                padding: '8px 12px',
                background: theme.colors.bg.tertiary,
                border: `1px solid ${theme.colors.border.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: theme.colors.text.primary,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              💾
            </button>
          </div>
        </header>

        <Navigation onTabHover={preloadTabModule} />

        <main style={{ padding: '2rem' }}>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/daily" replace />} />
              <Route path="/daily" element={<DailyPage />} />
              <Route path="/quest" element={<QuestPage />} />
              <Route path="/season" element={<SeasonPage />} />
              <Route path="/weekly" element={<WeeklyPage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/rewards" element={<RewardBoardPage />} />
              <Route path="/spaced-repetition" element={<SpacedRepetitionTab />} />
              <Route path="/reflection" element={<SummaryDashboard />} />
              <Route path="/monitor" element={<PlaceholderPage name="进度监控" />} />
              <Route path="/logs" element={<PlaceholderPage name="活动日志" />} />
              <Route path="*" element={<Navigate to="/daily" replace />} />
            </Routes>
          </Suspense>
        </main>

        <footer style={{
          padding: '1rem 2rem',
          textAlign: 'center',
          color: theme.colors.text.tertiary,
          borderTop: `1px solid ${theme.colors.border.primary}`,
        }}>
          {t('app.title')} | {t('app.subtitle')}
        </footer>

        {/* Floating Pomodoro Widget */}
        <Suspense fallback={null}>
          <PomodoroWidget />
        </Suspense>

        {/* Settings Modal - Appearance */}
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
          />
        </Suspense>

        {/* Data Management Modal */}
        <Suspense fallback={null}>
          <DataManagementModal
            isOpen={showDataModal}
            onClose={() => setShowDataModal(false)}
          />
        </Suspense>

        {/* Profile Modal */}
        <Suspense fallback={null}>
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
        </Suspense>

        {/* Proactive Planner Components */}
        <Suspense fallback={null}>
          <InterventionPopup />
          <AIChatInterface isOpen={chatIsOpen} onClose={() => setChatIsOpen(false)} />
        </Suspense>
      </div>
    </ThemeProvider>
  );
}

function App() {
  // Start long-running services once on app mount.
  useEffect(() => {
    monitorEngine.start();
    systemMonitor.start();

    return () => {
      systemMonitor.stop();
      monitorEngine.stop();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
