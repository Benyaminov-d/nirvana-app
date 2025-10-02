import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 px-3 py-1 rounded-md border text-sm transition-colors shadow-md"
      style={{
        background: 'var(--colour-surface)',
        color: 'var(--colour-text-primary)',
        borderColor: 'var(--colour-glass-border)'
      }}
      aria-label="Toggle color theme"
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}


