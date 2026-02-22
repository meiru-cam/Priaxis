/**
 * UI Store - UI state management
 */

import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';
type LightThemeVariant = 'solarized';
type DarkThemeVariant = 'solarized' | 'tomorrow' | 'vscode';
type TaskViewMode = 'list' | 'matrix';
export type Language = 'zh' | 'en';

interface UIState {
  // Theme
  theme: ThemeMode;
  lightThemeVariant: LightThemeVariant;
  darkThemeVariant: DarkThemeVariant;
  language: Language;

  // Navigation
  activeTab: string;
  previousTab: string | null;

  // Player info
  playerInfoExpanded: boolean;

  // Task view
  taskViewMode: TaskViewMode;

  // Tab configuration
  tabVisibility: Record<string, boolean>;
  tabOrder: string[];

  // Modal state
  openModals: string[];

  // Sidebar
  sidebarCollapsed: boolean;

  // Notifications
  notificationsEnabled: boolean;
}

interface UIActions {
  // Theme
  setTheme: (theme: ThemeMode) => void;
  setLightThemeVariant: (variant: LightThemeVariant) => void;
  setDarkThemeVariant: (variant: DarkThemeVariant) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;

  // Navigation
  setActiveTab: (tab: string) => void;

  // Player info
  setPlayerInfoExpanded: (expanded: boolean) => void;
  togglePlayerInfo: () => void;

  // Task view
  setTaskViewMode: (mode: TaskViewMode) => void;
  toggleTaskViewMode: () => void;

  // Tab configuration
  setTabVisibility: (tab: string, visible: boolean) => void;
  setTabOrder: (order: string[]) => void;

  // Modals
  openModal: (modalId: string) => void;
  closeModal: (modalId?: string) => void;
  closeAllModals: () => void;
  isModalOpen: (modalId: string) => boolean;

  // Sidebar
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Notifications
  setNotificationsEnabled: (enabled: boolean) => void;
}

type UIStore = UIState & UIActions;

// Default tab configuration
const DEFAULT_TAB_VISIBILITY: Record<string, boolean> = {
  season: true,
  quest: true,
  daily: true,
  weekly: true,
  'command-center': true,
  recurring: true,
  reflection: true,
  social: true,
  boundary: true,
  'self-diagnosis': true,
  core: true,
  growth: true,
  beliefs: true,
  monitor: true,
  research: true,
  logs: true,
  // Hidden by default
  wisdom: false,
  practice: false,
  skills: false,
};

const DEFAULT_TAB_ORDER = [
  'season',
  'quest',
  'daily',
  'weekly',
  'command-center',
  'recurring',
  'reflection',
  'social',
  'boundary',
  'self-diagnosis',
  'core',
  'growth',
  'beliefs',
  'monitor',
  'research',
  'logs',
];

const initialState: UIState = {
  theme: 'system',
  lightThemeVariant: 'solarized',
  darkThemeVariant: 'solarized',
  language: 'zh',
  activeTab: 'daily',
  previousTab: null,
  playerInfoExpanded: true,
  taskViewMode: 'matrix',
  tabVisibility: DEFAULT_TAB_VISIBILITY,
  tabOrder: DEFAULT_TAB_ORDER,
  openModals: [],
  sidebarCollapsed: false,
  notificationsEnabled: true,
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Theme
      setTheme: (theme) => set({ theme }),
      setLightThemeVariant: (variant) => set({ lightThemeVariant: variant }),
      setDarkThemeVariant: (variant) => set({ darkThemeVariant: variant }),
      setLanguage: (lang) => set({ language: lang }),

      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        set({ theme: next });
      },

      // Navigation
      setActiveTab: (tab) => {
        const current = get().activeTab;
        if (current !== tab) {
          set({
            activeTab: tab,
            previousTab: current,
          });
        }
      },

      // Player info
      setPlayerInfoExpanded: (expanded) => set({ playerInfoExpanded: expanded }),

      togglePlayerInfo: () => {
        set((state) => ({ playerInfoExpanded: !state.playerInfoExpanded }));
      },

      // Task view
      setTaskViewMode: (mode) => set({ taskViewMode: mode }),

      toggleTaskViewMode: () => {
        set((state) => ({
          taskViewMode: state.taskViewMode === 'list' ? 'matrix' : 'list',
        }));
      },

      // Tab configuration
      setTabVisibility: (tab, visible) => {
        set((state) => ({
          tabVisibility: { ...state.tabVisibility, [tab]: visible },
        }));
      },

      setTabOrder: (order) => set({ tabOrder: order }),

      // Modals
      openModal: (modalId) => {
        set((state) => {
          if (state.openModals.includes(modalId)) {
            return state;
          }
          return { openModals: [...state.openModals, modalId] };
        });
      },

      closeModal: (modalId) => {
        set((state) => {
          if (modalId) {
            return { openModals: state.openModals.filter((id) => id !== modalId) };
          }
          // Close topmost modal
          return { openModals: state.openModals.slice(0, -1) };
        });
      },

      closeAllModals: () => set({ openModals: [] }),

      isModalOpen: (modalId) => get().openModals.includes(modalId),

      // Sidebar
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      // Notifications
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
    }),
    {
      name: 'uiSettings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        lightThemeVariant: state.lightThemeVariant,
        darkThemeVariant: state.darkThemeVariant,
        activeTab: state.activeTab,
        playerInfoExpanded: state.playerInfoExpanded,
        taskViewMode: state.taskViewMode,
        tabVisibility: state.tabVisibility,
        tabOrder: state.tabOrder,
        sidebarCollapsed: state.sidebarCollapsed,
        notificationsEnabled: state.notificationsEnabled,
        language: state.language,
      }),
    }
  )
);

// Get system theme preference synchronously
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// Compute effective theme directly (no hooks, for use outside React)
export const getEffectiveTheme = (): 'light' | 'dark' => {
  const theme = useUIStore.getState().theme;
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

// Utility hook for effective theme with system preference listener
export const useEffectiveTheme = (): 'light' | 'dark' => {
  const theme = useUIStore((s) => s.theme);
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>(getSystemTheme);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial value
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Return explicit theme if set, otherwise use system theme
  if (theme === 'system') {
    return systemTheme;
  }

  return theme;
};

// Utility hook for visible tabs
export const useVisibleTabs = () => {
  const tabVisibility = useUIStore((s) => s.tabVisibility);
  const tabOrder = useUIStore((s) => s.tabOrder);

  return tabOrder.filter((tab) => tabVisibility[tab]);
};
