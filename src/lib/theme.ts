'use client';
import { usePreference } from './use-preference';
import { useEffect } from 'react';

/** Contoh warnanya ada di token `--swatch-<id>` (globals.css). */
export const ACCENTS = [
  { id: 'sage', label: 'Sage' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'sky', label: 'Langit' },
  { id: 'mint', label: 'Mint' },
  { id: 'peach', label: 'Peach' },
  { id: 'rose', label: 'Mawar' },
] as const;
export type Accent = (typeof ACCENTS)[number]['id'];
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'kopdes-theme';
// Kunci baru (25 Okt 2026): semua perangkat mulai dari sorotan sage tampilan baru, lalu bebas memilih.
export const ACCENT_KEY = 'kopdes-accent-v2';
const DEFAULT_ACCENT: Accent = 'sage';

export const validAccent = (value: string | null | undefined): Accent =>
  ACCENTS.some((accent) => accent.id === value) ? (value as Accent) : DEFAULT_ACCENT;
export const validTheme = (value: string | null | undefined): Theme =>
  value === 'dark' ? 'dark' : 'light';

/** Dijalankan sebelum render pertama agar tema tidak berkedip; nilai rusak jatuh ke bawaan. */
export const themeBootScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}')==='dark'?'dark':'light';var a=localStorage.getItem('${ACCENT_KEY}');if(['sage','lavender','sky','mint','peach','rose'].indexOf(a)<0)a='${DEFAULT_ACCENT}';d.dataset.theme=t;d.dataset.accent=a;d.style.colorScheme=t;}catch(e){}})();`;

export function useTheme() {
  const [storedTheme, setStoredTheme] = usePreference(THEME_KEY, 'light');
  const [storedAccent, setStoredAccent] = usePreference(ACCENT_KEY, DEFAULT_ACCENT);
  const theme = validTheme(storedTheme);
  const accent = validAccent(storedAccent);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.accent = accent;
    root.style.colorScheme = theme;
  }, [theme, accent]);
  return {
    theme,
    accent,
    setTheme: (value: Theme) => setStoredTheme(validTheme(value)),
    setAccent: (value: Accent) => setStoredAccent(validAccent(value)),
  };
}
