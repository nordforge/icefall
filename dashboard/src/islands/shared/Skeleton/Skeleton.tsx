import styles from './skeleton.module.css';

type SkeletonProps = {
  width?: string;
  height?: string;
  variant?: 'text' | 'circle' | 'rect';
  lines?: number;
  className?: string;
};

export default function Skeleton({
  width = '100%',
  height = '1em',
  variant = 'text',
  lines,
  className,
}: SkeletonProps) {
  if (variant === 'text' && lines && lines > 1) {
    return (
      <div class={styles.stack} role="status" aria-label="Loading">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            class={[styles.bone, styles.text, className].filter(Boolean).join(' ')}
            style={{
              width: i === lines - 1 ? '70%' : width,
              height,
            }}
            aria-hidden="true"
          />
        ))}
        <span class={styles.srOnly}>Loading...</span>
      </div>
    );
  }

  const variantClass = variant === 'circle' ? styles.circle : styles.text;
  const classes = [styles.bone, variantClass, className].filter(Boolean).join(' ');

  return (
    <span
      class={classes}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    >
      <span class={styles.srOnly}>Loading...</span>
    </span>
  );
}

/* Pre-built layout: card placeholder */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div class={[styles.card, className].filter(Boolean).join(' ')} role="status" aria-label="Loading card">
      <Skeleton variant="rect" height="120px" />
      <div class={styles.cardBody}>
        <Skeleton width="60%" height="1.125em" />
        <Skeleton lines={2} height="0.875em" />
      </div>
      <span class={styles.srOnly}>Loading...</span>
    </div>
  );
}

/* Pre-built layout: table rows */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div class={[styles.table, className].filter(Boolean).join(' ')} role="status" aria-label="Loading table">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} class={styles.tableRow}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              width={c === 0 ? '40%' : '80%'}
              height="0.875em"
            />
          ))}
        </div>
      ))}
      <span class={styles.srOnly}>Loading...</span>
    </div>
  );
}
