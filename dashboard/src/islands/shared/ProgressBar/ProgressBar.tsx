import styles from './progress-bar.module.css';

type Props = {
  value: number;
  max: number;
  label: string;
  formatValue?: (value: number, max: number) => string;
  color?: string;
}

export default function ProgressBar({ value, max, label, formatValue, color }: Props) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const displayValue = formatValue ? formatValue(value, max) : `${Math.round(percent)}%`;
  const barColor = color || (percent > 90 ? 'var(--color-error)' : percent > 70 ? 'var(--color-warning)' : 'var(--color-primary)');

  return (
    <div class={styles.wrapper}>
      <div class={styles.header}>
        <span class={styles.headerLabel}>{label}</span>
        <span class={styles.headerValue}>{displayValue}</span>
      </div>
      <div
        class={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${displayValue}`}
      >
        <div
          class={styles.fill}
          style={{ transform: `scaleX(${percent / 100})`, background: barColor }}
        />
      </div>
    </div>
  );
}
