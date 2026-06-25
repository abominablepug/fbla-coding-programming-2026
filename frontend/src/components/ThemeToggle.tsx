import { useEffect, useState } from 'react';
import {
  applyThemeMode,
  fetchAccountThemeMode,
  getInitialThemeMode,
  type ThemeMode,
} from '../utils/theme';


export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialThemeMode());

  useEffect(() => {
    applyThemeMode(mode);

    let cancelled = false;
    const syncAccountTheme = async () => {
      const accountMode = await fetchAccountThemeMode();
      if (cancelled || !accountMode) return;
      setMode(accountMode);
      applyThemeMode(accountMode);
    };
    void syncAccountTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
