/**
 * Theme System - Solarized High Contrast
 * Migrated from css/theme.css
 */

// Theme type definitions
interface ThemeColors {
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    cardHover: string;
    modal: string;
    modalOverlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    muted: string;
  };
  border: {
    primary: string;
    secondary: string;
    accent: string;
  };
  accent: {
    primary: string;
    secondary: string;
    purple: string;
    blue: string;
    gold: string;
    green: string;
    red: string;
    pink: string;
  };
  badge: {
    active: { bg: string; border: string; text: string };
    paused: { bg: string; border: string; text: string };
    completed: { bg: string; border: string; text: string };
    success: { bg: string; border: string; text: string };
    warning: { bg: string; border: string; text: string };
    danger: { bg: string; border: string; text: string };
    info: { bg: string; border: string; text: string };
  };
  button: {
    primary: { bg: string; shadow: string; text: string };
    secondary: { bg: string; text: string };
    danger: { bg: string; text: string };
    success: { bg: string; text: string };
    warning: { bg: string; text: string };
    info: { bg: string; text: string };
  };
  input: {
    bg: string;
    text: string;
    border: string;
    placeholder: string;
  };
  card: {
    purple: { bg: string; text: string };
    blue: { bg: string; text: string };
    green: { bg: string; text: string };
    gold: { bg: string; text: string };
    highlight: { bg: string; text: string; border: string };
  };
  status: {
    success: { bg: string; text: string; border: string };
    warning: { bg: string; text: string; border: string };
    danger: { bg: string; text: string; border: string };
    info: { bg: string; text: string; border: string };
  };
  section: {
    locked: { bg: string; border: string };
    paused: { bg: string; border: string };
    archived: { bg: string; border: string };
  };
  semantic: {
    success: string;
    info: string;
    warning: string;
    danger: string;
  };
  quote: { bg: string };
  label: { text: string };
}

interface ThemeShadows {
  color: string;
  glow: string;
  sm: string;
  md: string;
  lg: string;
}

interface ThemeGrid {
  lines: string;
}

export interface Theme {
  typography: {
    fontFamily: string;
    sizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    weights: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
  };
  zIndex: {
    dropdown: number;
    sticky: number;
    modal: number;
    popover: number;
    tooltip: number;
    notification: number;
  };
  colors: ThemeColors;
  shadows: ThemeShadows;
  grid: ThemeGrid;
}

const baseTheme = {
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '20px',
    full: '9999px',
  },
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
  breakpoints: {
    sm: '768px',
    md: '992px',
    lg: '1200px',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    notification: 1500,
  },
};

export const solarizedLight: Theme = {
  ...baseTheme,
  colors: {
    bg: {
      primary: 'linear-gradient(135deg, #fdf6e3 0%, #eee8d5 50%, #fdf6e3 100%)',
      secondary: 'rgba(238, 232, 213, 0.6)',
      tertiary: 'rgba(253, 246, 227, 0.95)',
      card: 'rgba(238, 232, 213, 0.95)',
      cardHover: 'rgba(238, 232, 213, 1)',
      modal: 'linear-gradient(135deg, rgba(253, 246, 227, 0.98) 0%, rgba(238, 232, 213, 0.98) 100%)',
      modalOverlay: 'rgba(0, 43, 54, 0.6)',
    },
    text: {
      primary: '#586e75',
      secondary: '#657b83',
      tertiary: '#93a1a1',
      inverse: '#fdf6e3',
      muted: '#93a1a1',
    },
    border: {
      primary: 'rgba(88, 110, 117, 0.3)',
      secondary: 'rgba(101, 123, 131, 0.25)',
      accent: 'rgba(38, 139, 210, 0.4)',
    },
    accent: {
      primary: '#268bd2',
      secondary: '#2aa198',
      purple: '#6c71c4',
      blue: '#268bd2',
      gold: '#b58900',
      green: '#859900',
      red: '#dc322f',
      pink: '#d33682',
    },
    badge: {
      active: { bg: 'rgba(133, 153, 0, 0.15)', border: '#859900', text: '#859900' },
      paused: { bg: 'rgba(181, 137, 0, 0.15)', border: '#b58900', text: '#b58900' },
      completed: { bg: 'rgba(38, 139, 210, 0.15)', border: '#268bd2', text: '#268bd2' },
      success: { bg: 'rgba(38, 139, 210, 0.15)', border: '#268bd2', text: '#268bd2' },
      warning: { bg: 'rgba(203, 75, 22, 0.15)', border: '#cb4b16', text: '#cb4b16' },
      danger: { bg: 'rgba(220, 50, 47, 0.15)', border: '#dc322f', text: '#dc322f' },
      info: { bg: 'rgba(108, 113, 196, 0.12)', border: '#6c71c4', text: '#6c71c4' },
    },
    button: {
      primary: { bg: 'linear-gradient(135deg, #268bd2 0%, #2aa198 100%)', shadow: 'rgba(38, 139, 210, 0.35)', text: '#fdf6e3' },
      secondary: { bg: 'rgba(38, 139, 210, 0.15)', text: '#268bd2' },
      danger: { bg: 'linear-gradient(135deg, #dc322f 0%, #cb4b16 100%)', text: '#fdf6e3' },
      success: { bg: 'linear-gradient(135deg, #268bd2 0%, #2aa198 100%)', text: '#fdf6e3' },
      warning: { bg: 'linear-gradient(135deg, #cb4b16 0%, #b58900 100%)', text: '#fdf6e3' },
      info: { bg: 'linear-gradient(135deg, #6c71c4 0%, #d33682 100%)', text: '#fdf6e3' },
    },
    input: {
      bg: 'rgba(253, 246, 227, 0.8)',
      text: '#586e75',
      border: 'rgba(88, 110, 117, 0.35)',
      placeholder: '#93a1a1',
    },
    card: {
      purple: { bg: 'rgba(108, 113, 196, 0.12)', text: '#6c71c4' },
      blue: { bg: 'rgba(38, 139, 210, 0.12)', text: '#268bd2' },
      green: { bg: 'rgba(133, 153, 0, 0.12)', text: '#859900' },
      gold: { bg: 'rgba(181, 137, 0, 0.12)', text: '#b58900' },
      highlight: { bg: 'rgba(42, 161, 152, 0.15)', text: '#586e75', border: '#2aa198' },
    },
    status: {
      success: { bg: 'rgba(38, 139, 210, 0.15)', text: '#268bd2', border: '#268bd2' },
      warning: { bg: 'rgba(203, 75, 22, 0.15)', text: '#cb4b16', border: '#cb4b16' },
      danger: { bg: 'rgba(220, 50, 47, 0.15)', text: '#dc322f', border: '#dc322f' },
      info: { bg: 'rgba(108, 113, 196, 0.12)', text: '#6c71c4', border: '#6c71c4' },
    },
    section: {
      locked: { bg: 'rgba(88, 110, 117, 0.1)', border: 'rgba(88, 110, 117, 0.3)' },
      paused: { bg: 'rgba(181, 137, 0, 0.1)', border: 'rgba(181, 137, 0, 0.3)' },
      archived: { bg: 'rgba(88, 110, 117, 0.08)', border: 'rgba(88, 110, 117, 0.25)' },
    },
    semantic: { success: '#859900', info: '#268bd2', warning: '#b58900', danger: '#dc322f' },
    quote: { bg: 'rgba(238, 232, 213, 0.5)' },
    label: { text: '#6c71c4' },
  },
  shadows: {
    color: 'rgba(0, 43, 54, 0.15)',
    glow: 'rgba(38, 139, 210, 0.3)',
    sm: '0 1px 2px rgba(0, 43, 54, 0.1)',
    md: '0 4px 6px rgba(0, 43, 54, 0.15)',
    lg: '0 10px 15px rgba(0, 43, 54, 0.2)',
  },
  grid: { lines: 'rgba(88, 110, 117, 0.1)' },
};

// Solarized Dark+
export const solarizedDark: Theme = {
  ...baseTheme,
  colors: {
    bg: {
      primary: 'linear-gradient(135deg, #002b36 0%, #073642 50%, #002b36 100%)',
      secondary: 'rgba(7, 54, 66, 0.7)',
      tertiary: 'rgba(0, 43, 54, 0.95)',
      card: 'rgba(7, 54, 66, 0.8)',
      cardHover: 'rgba(7, 54, 66, 0.95)',
      modal: 'linear-gradient(135deg, rgba(0, 43, 54, 0.98) 0%, rgba(7, 54, 66, 0.98) 100%)',
      modalOverlay: 'rgba(0, 0, 0, 0.8)',
    },
    text: {
      primary: '#fdf6e3',     // Base3 - highest contrast
      secondary: '#eee8d5',   // Base2
      tertiary: '#93a1a1',    // Base1
      inverse: '#002b36',
      muted: '#839496',       // Base0
    },
    border: {
      primary: 'rgba(131, 148, 150, 0.6)',
      secondary: 'rgba(147, 161, 161, 0.45)',
      accent: 'rgba(38, 139, 210, 0.6)',
    },
    accent: {
      primary: '#3a9fe5',
      secondary: '#35b5a9',
      purple: '#8287d9',
      blue: '#3a9fe5',
      gold: '#d4a017',
      green: '#9db62a',
      red: '#ef5753',
      pink: '#e268a3',
    },
    badge: {
      active: { bg: 'rgba(157, 182, 42, 0.25)', border: '#9db62a', text: '#9db62a' },
      paused: { bg: 'rgba(212, 160, 23, 0.25)', border: '#d4a017', text: '#d4a017' },
      completed: { bg: 'rgba(58, 159, 229, 0.25)', border: '#3a9fe5', text: '#3a9fe5' },
      success: { bg: 'rgba(58, 159, 229, 0.25)', border: '#3a9fe5', text: '#3a9fe5' },
      warning: { bg: 'rgba(224, 101, 66, 0.25)', border: '#e06542', text: '#e06542' },
      danger: { bg: 'rgba(239, 87, 83, 0.25)', border: '#ef5753', text: '#ef5753' },
      info: { bg: 'rgba(130, 135, 217, 0.2)', border: '#8287d9', text: '#8287d9' },
    },
    button: {
      primary: { bg: 'linear-gradient(135deg, #3a9fe5 0%, #35b5a9 100%)', shadow: 'rgba(58, 159, 229, 0.4)', text: '#fdf6e3' },
      secondary: { bg: 'rgba(58, 159, 229, 0.25)', text: '#3a9fe5' },
      danger: { bg: 'linear-gradient(135deg, #ef5753 0%, #e06542 100%)', text: '#fdf6e3' },
      success: { bg: 'linear-gradient(135deg, #3a9fe5 0%, #35b5a9 100%)', text: '#fdf6e3' },
      warning: { bg: 'linear-gradient(135deg, #e06542 0%, #d4a017 100%)', text: '#fdf6e3' },
      info: { bg: 'linear-gradient(135deg, #8287d9 0%, #e268a3 100%)', text: '#fdf6e3' },
    },
    input: {
      bg: 'rgba(0, 43, 54, 0.85)',
      text: '#d4d8d8',
      border: 'rgba(131, 148, 150, 0.55)',
      placeholder: '#7a8b91',
    },
    card: {
      purple: { bg: 'rgba(130, 135, 217, 0.2)', text: '#8287d9' },
      blue: { bg: 'rgba(58, 159, 229, 0.2)', text: '#3a9fe5' },
      green: { bg: 'rgba(157, 182, 42, 0.2)', text: '#9db62a' },
      gold: { bg: 'rgba(212, 160, 23, 0.2)', text: '#d4a017' },
      highlight: { bg: 'rgba(53, 181, 169, 0.25)', text: '#d4d8d8', border: '#35b5a9' },
    },
    status: {
      success: { bg: 'rgba(58, 159, 229, 0.25)', text: '#3a9fe5', border: '#3a9fe5' },
      warning: { bg: 'rgba(224, 101, 66, 0.25)', text: '#e06542', border: '#e06542' },
      danger: { bg: 'rgba(239, 87, 83, 0.25)', text: '#ef5753', border: '#ef5753' },
      info: { bg: 'rgba(130, 135, 217, 0.2)', text: '#8287d9', border: '#8287d9' },
    },
    section: {
      locked: { bg: 'rgba(131, 148, 150, 0.18)', border: 'rgba(131, 148, 150, 0.5)' },
      paused: { bg: 'rgba(212, 160, 23, 0.18)', border: 'rgba(212, 160, 23, 0.5)' },
      archived: { bg: 'rgba(131, 148, 150, 0.12)', border: 'rgba(131, 148, 150, 0.35)' },
    },
    semantic: { success: '#9db62a', info: '#3a9fe5', warning: '#d4a017', danger: '#ef5753' },
    quote: { bg: 'rgba(7, 54, 66, 0.6)' },
    label: { text: '#8287d9' },
  },
  shadows: {
    color: 'rgba(0, 0, 0, 0.5)',
    glow: 'rgba(38, 139, 210, 0.3)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
  grid: { lines: 'rgba(131, 148, 150, 0.08)' },
};

// Tomorrow Night Blue
export const tomorrowNightBlue: Theme = {
  ...baseTheme,
  colors: {
    bg: {
      primary: '#002451',
      secondary: '#00346e',     // Slightly lighter for headers/sidebars
      tertiary: '#001733',      // Darker for depth
      card: 'rgba(0, 40, 90, 0.8)',
      cardHover: 'rgba(0, 48, 110, 0.9)',
      modal: 'linear-gradient(135deg, rgba(0, 36, 81, 0.98) 0%, rgba(0, 40, 90, 0.98) 100%)',
      modalOverlay: 'rgba(0, 0, 0, 0.8)',
    },
    text: {
      primary: '#ffffff',       // White - Highest contrast
      secondary: '#bbdaff',     // Soft blue
      tertiary: '#7285b7',      // Muted blue
      inverse: '#002451',
      muted: '#546b99',
    },
    border: {
      primary: 'rgba(187, 218, 255, 0.4)',
      secondary: 'rgba(114, 133, 183, 0.3)',
      accent: 'rgba(187, 218, 255, 0.6)',
    },
    accent: {
      primary: '#bbdaff',       // Blue
      secondary: '#99ffff',     // Aqua
      purple: '#ebbbff',        // Purple
      blue: '#bbdaff',
      gold: '#ffeead',          // Yellow
      green: '#d1f1a9',         // Green
      red: '#ff9da4',           // Red
      pink: '#ffc58f',          // Orange-Pink
    },
    badge: {
      active: { bg: 'rgba(209, 241, 169, 0.2)', border: '#d1f1a9', text: '#d1f1a9' },
      paused: { bg: 'rgba(255, 238, 173, 0.2)', border: '#ffeead', text: '#ffeead' },
      completed: { bg: 'rgba(187, 218, 255, 0.2)', border: '#bbdaff', text: '#bbdaff' },
      success: { bg: 'rgba(187, 218, 255, 0.2)', border: '#bbdaff', text: '#bbdaff' },
      warning: { bg: 'rgba(255, 197, 143, 0.2)', border: '#ffc58f', text: '#ffc58f' },
      danger: { bg: 'rgba(255, 157, 164, 0.2)', border: '#ff9da4', text: '#ff9da4' },
      info: { bg: 'rgba(235, 187, 255, 0.2)', border: '#ebbbff', text: '#ebbbff' },
    },
    button: {
      primary: { bg: 'linear-gradient(135deg, #003f8e 0%, #004b9e 100%)', shadow: 'rgba(0, 63, 142, 0.5)', text: '#ffffff' },
      secondary: { bg: 'rgba(187, 218, 255, 0.15)', text: '#bbdaff' },
      danger: { bg: 'rgba(255, 157, 164, 0.8)', text: '#002451' },
      success: { bg: 'rgba(153, 255, 255, 0.8)', text: '#002451' },
      warning: { bg: 'rgba(255, 238, 173, 0.8)', text: '#002451' },
      info: { bg: 'rgba(187, 218, 255, 0.8)', text: '#002451' },
    },
    input: {
      bg: 'rgba(0, 23, 51, 0.8)',
      text: '#ffffff',
      border: 'rgba(187, 218, 255, 0.4)',
      placeholder: '#7285b7',
    },
    card: {
      purple: { bg: 'rgba(235, 187, 255, 0.15)', text: '#ebbbff' },
      blue: { bg: 'rgba(187, 218, 255, 0.15)', text: '#bbdaff' },
      green: { bg: 'rgba(209, 241, 169, 0.15)', text: '#d1f1a9' },
      gold: { bg: 'rgba(255, 238, 173, 0.15)', text: '#ffeead' },
      highlight: { bg: 'rgba(153, 255, 255, 0.15)', text: '#ffffff', border: '#99ffff' },
    },
    status: {
      success: { bg: 'rgba(209, 241, 169, 0.2)', text: '#d1f1a9', border: '#d1f1a9' },
      warning: { bg: 'rgba(255, 197, 143, 0.2)', text: '#ffc58f', border: '#ffc58f' },
      danger: { bg: 'rgba(255, 157, 164, 0.2)', text: '#ff9da4', border: '#ff9da4' },
      info: { bg: 'rgba(187, 218, 255, 0.2)', text: '#bbdaff', border: '#bbdaff' },
    },
    section: {
      locked: { bg: 'rgba(0, 0, 0, 0.2)', border: 'rgba(114, 133, 183, 0.3)' },
      paused: { bg: 'rgba(255, 238, 173, 0.05)', border: 'rgba(255, 238, 173, 0.2)' },
      archived: { bg: 'rgba(0, 0, 0, 0.4)', border: 'rgba(114, 133, 183, 0.2)' },
    },
    semantic: { success: '#d1f1a9', info: '#bbdaff', warning: '#ffeead', danger: '#ff9da4' },
    quote: { bg: 'rgba(0, 0, 0, 0.3)' },
    label: { text: '#ebbbff' },
  },
  shadows: {
    color: 'rgba(0, 0, 0, 0.6)',
    glow: 'rgba(187, 218, 255, 0.3)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.6)',
  },
  grid: { lines: 'rgba(187, 218, 255, 0.05)' },
};

// Visual Studio Dark
export const visualStudioDark: Theme = {
  ...baseTheme,
  colors: {
    bg: {
      primary: '#1e1e1e',
      secondary: '#252526',
      tertiary: '#2d2d30',
      card: '#252526',
      cardHover: '#2d2d30',
      modal: '#1e1e1e',
      modalOverlay: 'rgba(0, 0, 0, 0.75)',
    },
    text: {
      primary: '#d4d4d4',
      secondary: '#cccccc',
      tertiary: '#808080',
      inverse: '#1e1e1e',
      muted: '#606060',
    },
    border: {
      primary: '#3e3e42',
      secondary: '#2d2d30',
      accent: '#007acc',
    },
    accent: {
      primary: '#007acc',
      secondary: '#4ec9b0',
      purple: '#c586c0',
      blue: '#569cd6',
      gold: '#dcdcaa',
      green: '#6a9955',
      red: '#f44747',
      pink: '#ce9178',
    },
    badge: {
      active: { bg: 'rgba(106, 153, 85, 0.2)', border: '#6a9955', text: '#6a9955' },
      paused: { bg: 'rgba(220, 220, 170, 0.2)', border: '#dcdcaa', text: '#dcdcaa' },
      completed: { bg: 'rgba(0, 122, 204, 0.2)', border: '#007acc', text: '#007acc' },
      success: { bg: 'rgba(78, 201, 176, 0.2)', border: '#4ec9b0', text: '#4ec9b0' },
      warning: { bg: 'rgba(206, 145, 120, 0.2)', border: '#ce9178', text: '#ce9178' },
      danger: { bg: 'rgba(244, 71, 71, 0.2)', border: '#f44747', text: '#f44747' },
      info: { bg: 'rgba(86, 156, 214, 0.2)', border: '#569cd6', text: '#569cd6' },
    },
    button: {
      primary: { bg: '#0e639c', shadow: 'rgba(14, 99, 156, 0.4)', text: '#ffffff' },
      secondary: { bg: '#3e3e42', text: '#ffffff' },
      danger: { bg: '#f44747', text: '#ffffff' },
      success: { bg: '#4ec9b0', text: '#1e1e1e' },
      warning: { bg: '#cca700', text: '#1e1e1e' },
      info: { bg: '#569cd6', text: '#1e1e1e' },
    },
    input: {
      bg: '#3c3c3c',
      text: '#cccccc',
      border: '#3e3e42',
      placeholder: '#808080',
    },
    card: {
      purple: { bg: 'rgba(197, 134, 192, 0.1)', text: '#c586c0' },
      blue: { bg: 'rgba(86, 156, 214, 0.1)', text: '#569cd6' },
      green: { bg: 'rgba(106, 153, 85, 0.1)', text: '#6a9955' },
      gold: { bg: 'rgba(220, 220, 170, 0.1)', text: '#dcdcaa' },
      highlight: { bg: '#264f78', text: '#ffffff', border: '#007acc' },
    },
    status: {
      success: { bg: 'rgba(106, 153, 85, 0.2)', text: '#6a9955', border: '#6a9955' },
      warning: { bg: 'rgba(206, 145, 120, 0.2)', text: '#ce9178', border: '#ce9178' },
      danger: { bg: 'rgba(244, 71, 71, 0.2)', text: '#f44747', border: '#f44747' },
      info: { bg: 'rgba(86, 156, 214, 0.2)', text: '#569cd6', border: '#569cd6' },
    },
    section: {
      locked: { bg: '#2a2d2e', border: '#3e3e42' },
      paused: { bg: '#2d2d30', border: '#3e3e42' },
      archived: { bg: '#1e1e1e', border: '#3e3e42' },
    },
    semantic: { success: '#6a9955', info: '#569cd6', warning: '#dcdcaa', danger: '#f44747' },
    quote: { bg: '#2d2d30' },
    label: { text: '#c586c0' },
  },
  shadows: {
    color: 'rgba(0, 0, 0, 0.5)',
    glow: 'rgba(0, 122, 204, 0.3)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
  grid: { lines: '#2d2d30' },
};

// Backward compatibility alias
export const lightTheme = solarizedLight;
export const darkTheme = solarizedDark;

// Registry
export const themes = {
  light: {
    solarized: solarizedLight,
  },
  dark: {
    solarized: solarizedDark,
    tomorrow: tomorrowNightBlue,
    vscode: visualStudioDark,
  },
};

// Type augmentation for styled-components
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme { }
}
