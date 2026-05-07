interface Props {
  value: number;
  max: number;
  label: string;
  formatValue?: (value: number, max: number) => string;
  color?: string;
}

export default function ProgressBar({
  value,
  max,
  label,
  formatValue,
  color,
}: Props) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const displayValue = formatValue ? formatValue(value, max) : `${Math.round(percent)}%`;

  const barColor =
    color || (percent > 90 ? 'var(--color-error)' : percent > 70 ? 'var(--color-warning)' : 'var(--color-primary)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
        <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-text)' }}>{label}</span>
        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {displayValue}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface-alt)',
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${displayValue}`}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 'var(--radius-full)',
            background: barColor,
            transition: `width var(--duration-normal) var(--ease-out)`,
          }}
        />
      </div>
    </div>
  );
}
