import type { JSX } from 'preact';
import styles from '@styles/button.module.css';

type Props = {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  style?: Record<string, string | number>;
  children?: preact.ComponentChildren;
  onClick?: (e: Event) => void;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  fullWidth,
  children,
  disabled,
  className,
  style,
  type = 'button',
  ...props
}: Props) {
  const classes = [
    styles.button,
    styles[size],
    styles[variant],
    fullWidth && styles.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} disabled={disabled || loading} class={classes} style={style} {...props}>
      {loading && <span class={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
