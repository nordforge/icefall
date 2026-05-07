import { useStore } from '@nanostores/preact';
import { $theme, toggleTheme } from '@stores/theme';
import { Sun, Moon } from 'lucide-preact';
import styles from './theme-toggle.module.css';

export default function ThemeToggle() {
  const theme = useStore($theme);

  return (
    <button
      onClick={toggleTheme}
      class={styles.toggle}
      type="button"
    >
      {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      {theme === 'light' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
