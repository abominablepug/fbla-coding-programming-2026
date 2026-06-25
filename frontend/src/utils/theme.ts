export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'bizmatch_theme_mode';
export const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

export const isThemeMode = (value: unknown): value is ThemeMode => value === 'dark' || value === 'light';

export const getStoredThemeMode = (): ThemeMode | null => {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const getSystemThemeMode = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const applyThemeMode = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
};

export const getInitialThemeMode = (): ThemeMode => getStoredThemeMode() || getSystemThemeMode();

export const fetchAccountThemeMode = async (): Promise<ThemeMode | null> => {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/auth/profile/settings`, { credentials: 'include' });
    if (!response.ok) return null;
    const data = await response.json();
    return isThemeMode(data?.theme_mode) ? data.theme_mode : null;
  } catch {
    return null;
  }
};

export const saveAccountThemeMode = async (mode: ThemeMode) => {
  const response = await fetch(`${AUTH_BASE_URL}/auth/profile/theme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ theme_mode: mode }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Unable to save theme preference.');
  }

  return response.json();
};
