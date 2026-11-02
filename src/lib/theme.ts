'use client';
import { flushSync } from 'react-dom';
import { usePreference } from './use-preference';
import { useEffect } from 'react';

/** Contoh warnanya ada di token `--swatch-<id>` (globals.css). */
export const ACCENTS = [
  { id: 'lime', label: 'Bawaan' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'sky', label: 'Langit' },
  { id: 'mint', label: 'Mint' },
  { id: 'peach', label: 'Peach' },
  { id: 'rose', label: 'Mawar' },
] as const;
export type Accent = (typeof ACCENTS)[number]['id'];
export type Theme = 'light' | 'dark';

// Kunci baru (2 Nov 2026): semua perangkat mulai dari tema gelap dan sorotan tampilan baru, lalu bebas memilih.
export const THEME_KEY = 'kopdes-theme-v2';
export const ACCENT_KEY = 'kopdes-accent-v3';
const DEFAULT_ACCENT: Accent = 'lime';

export const validAccent = (value: string | null | undefined): Accent =>
  ACCENTS.some((accent) => accent.id === value) ? (value as Accent) : DEFAULT_ACCENT;
export const validTheme = (value: string | null | undefined): Theme =>
  value === 'light' ? 'light' : 'dark';

/** Dijalankan sebelum render pertama agar tema tidak berkedip; nilai rusak jatuh ke bawaan. */
export const themeBootScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}')==='light'?'light':'dark';var a=localStorage.getItem('${ACCENT_KEY}');if(['lime','lavender','sky','mint','peach','rose'].indexOf(a)<0)a='${DEFAULT_ACCENT}';d.dataset.theme=t;d.dataset.accent=a;d.style.colorScheme=t;}catch(e){}})();`;

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export function useTheme() {
  const [storedTheme, setStoredTheme] = usePreference(THEME_KEY, 'dark');
  const [storedAccent, setStoredAccent] = usePreference(ACCENT_KEY, DEFAULT_ACCENT);
  const theme = validTheme(storedTheme);
  const accent = validAccent(storedAccent);
  useEffect(() => {
    applyTheme(theme);
    document.documentElement.dataset.accent = accent;
  }, [theme, accent]);
  return {
    theme,
    accent,
    /** Mengganti tema; bila `from` diberikan, tema baru menyapu melingkar dari tombol itu. */
    setTheme: (value: Theme, from?: HTMLElement | null) => {
      const next = validTheme(value);
      const commit = () => {
        applyTheme(next);
        flushSync(() => setStoredTheme(next));
      };
      if (
        !from ||
        !document.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return commit();
      const box = from.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const transition = document.startViewTransition(commit);
      void transition.ready.then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 480,
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        ),
      );
    },
    setAccent: (value: Accent) => setStoredAccent(validAccent(value)),
  };
}
