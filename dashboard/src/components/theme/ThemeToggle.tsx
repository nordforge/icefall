import { useStore } from '@nanostores/preact';
import { $theme, toggleTheme } from '@stores/theme';
import { Sun, Moon } from 'lucide-preact';
import styles from './theme-toggle.module.css';

export default function ThemeToggle() {
  const theme = useStore($theme);

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      class={styles.toggle}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      {theme === 'light' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
