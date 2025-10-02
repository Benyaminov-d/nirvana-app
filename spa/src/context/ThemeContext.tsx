import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'nirvana_theme';
const BODY_DARK_CLASS = 'nv-dark';
const HTML_DARK_COLOR_SCHEME = 'dark';
const HTML_LIGHT_COLOR_SCHEME = 'light';

function readInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved as ThemeMode;
  } catch {}
  // Default to light as requested
  return 'light';
}

function applyThemeToDom(mode: ThemeMode) {
  try {
    const doc = document.documentElement; // <html>
    const body = document.body;
    // Update colour-scheme for UA form controls and media queries
    doc.style.colorScheme = mode === 'dark' ? HTML_DARK_COLOR_SCHEME : HTML_LIGHT_COLOR_SCHEME;
    // Toggle body class used by our tokens/styles
    if (mode === 'dark') body.classList.add(BODY_DARK_CLASS);
    else body.classList.remove(BODY_DARK_CLASS);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readInitialTheme());

  useEffect(() => {
    applyThemeToDom(theme);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}


