import { useStore } from '@nanostores/preact';
import { $theme, toggleTheme } from '../../stores/theme';
import { Sun, Moon } from 'lucide-preact';

export default function ThemeToggle() {
  const theme = useStore($theme);

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      {theme === 'light' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
