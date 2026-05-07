import { useStore } from '@nanostores/preact';
import { $theme, toggleTheme } from '@stores/theme';
import styles from './theme-toggle.module.css';

export default function ThemeToggle() {
  const theme = useStore($theme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      class={`${styles.toggle} ${isDark ? styles.isDark : ''}`}
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <svg class={styles.sunIcon} aria-hidden="true" width="1.25em" height="1.25em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <svg class={styles.moonIcon} aria-hidden="true" width="1.25em" height="1.25em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
