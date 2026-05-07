import { atom } from 'nanostores';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('icefall-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const $theme = atom<Theme>(getInitialTheme());

export function toggleTheme() {
  const next = $theme.get() === 'light' ? 'dark' : 'light';
  $theme.set(next);
  applyTheme(next);
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('icefall-theme', theme);
}

if (typeof window !== 'undefined') {
  applyTheme($theme.get());
}
