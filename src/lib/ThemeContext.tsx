'use client';
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { usePreference } from './usePreference';
export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorStyle = 'lime' | 'peach' | 'lavender' | 'sage' | 'sky' | 'sand';
type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  preference: ThemePreference;
  setTheme: (value: ThemePreference) => void;
  toggleTheme: () => void;
  colorStyle: ColorStyle;
  setColorStyle: (style: ColorStyle) => void;
}>({
  theme: 'light',
  preference: 'system',
  setTheme: () => {},
  toggleTheme: () => {},
  colorStyle: 'sky',
  setColorStyle: () => {},
});

function subscribe(callback: () => void) {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [density] = usePreference('hub-density', 'comfortable');
  const [motion] = usePreference('hub-motion', 'system');
  const [navStyle] = usePreference('hub-nav-style', 'soft');
  useEffect(() => {
    document.documentElement.dataset.density = density === 'compact' ? 'compact' : 'comfortable';
    document.documentElement.dataset.motion = motion === 'minimal' ? 'minimal' : 'system';
    document.documentElement.dataset.navStyle = navStyle === 'ink' ? 'ink' : 'soft';
  }, [density, motion, navStyle]);
  const [stored, setStored] = usePreference('hub-theme', 'system');
  const [storedColor, setStoredColor] = usePreference('hub-color-style', 'sky');
  const preference: ThemePreference = stored === 'light' || stored === 'dark' ? stored : 'system';
  const colorStyle: ColorStyle = ['lime', 'peach', 'lavender', 'sage', 'sky', 'sand'].includes(
    storedColor,
  )
    ? (storedColor as ColorStyle)
    : 'sky';

  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
  const theme: Theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-color', colorStyle);
  }, [colorStyle]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        preference,
        setTheme: setStored,
        toggleTheme: () => setStored(theme === 'dark' ? 'light' : 'dark'),
        colorStyle,
        setColorStyle: (style: ColorStyle) => setStoredColor(style),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
