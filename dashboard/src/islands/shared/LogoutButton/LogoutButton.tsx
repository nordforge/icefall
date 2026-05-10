import { api } from '@lib/api';

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => api.logout()}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        padding: 'var(--space-1) var(--space-2)',
        fontSize: 'var(--text-xs)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
      }}
      aria-label="Sign out"
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Sign out
    </button>
  );
}
