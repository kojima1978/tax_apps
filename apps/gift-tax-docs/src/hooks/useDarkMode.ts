import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '@/constants';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.darkMode) === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem(STORAGE_KEYS.darkMode, String(isDark)); } catch { /* ignore */ }
  }, [isDark]);

  const toggleDark = useCallback(() => setIsDark(prev => !prev), []);

  return { isDark, toggleDark };
};
