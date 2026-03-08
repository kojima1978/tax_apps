import { useState, useCallback, useEffect } from 'react';

const DARK_STORAGE_KEY = 'gift_tax_dark_mode';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(DARK_STORAGE_KEY) === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem(DARK_STORAGE_KEY, String(isDark)); } catch { /* ignore */ }
  }, [isDark]);

  const toggleDark = useCallback(() => setIsDark(prev => !prev), []);

  return { isDark, toggleDark };
};
