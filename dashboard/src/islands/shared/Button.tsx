import type { JSX } from 'preact';

interface Props extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
}

const VARIANT_STYLES: Record<string, Record<string, string>> = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    border: 'none',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  danger: {
    background: 'var(--color-error)',
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: 'none',
  },
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  children,
  disabled,
  style,
  ...props
}: Props) {
  const vs = VARIANT_STYLES[variant];
  const height = size === 'sm' ? '28px' : 'var(--button-height)';
  const padding = size === 'sm' ? '0 var(--space-3)' : '0 var(--space-4)';
  const fontSize = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        height,
        padding,
        fontSize,
        fontWeight: 'var(--weight-medium)',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        whiteSpace: 'nowrap',
        ...vs,
        ...(typeof style === 'object' ? style : {}),
      }}
      {...props}
    >
      {loading && <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />}
      {children}
    </button>
  );
}
