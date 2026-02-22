import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  /* Reset */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    background: ${({ theme }) => theme.colors.bg.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    line-height: 1.6;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }

  /* Links */
  a {
    color: ${({ theme }) => theme.colors.accent.primary};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.colors.accent.secondary};
    }
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.colors.text.primary};
    line-height: 1.3;
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  h1 { font-size: ${({ theme }) => theme.typography.sizes['3xl']}; }
  h2 { font-size: ${({ theme }) => theme.typography.sizes['2xl']}; }
  h3 { font-size: ${({ theme }) => theme.typography.sizes.xl}; }
  h4 { font-size: ${({ theme }) => theme.typography.sizes.lg}; }

  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.bg.secondary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.accent.primary};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.colors.accent.secondary};
    }
  }

  /* Selection */
  ::selection {
    background: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.inverse};
  }

  /* Focus outline */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 2px;
  }

  /* Remove default button styles */
  button {
    font-family: inherit;
    cursor: pointer;
  }

  /* Remove default input styles */
  input, textarea, select {
    font-family: inherit;
  }

  /* Utility classes */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
