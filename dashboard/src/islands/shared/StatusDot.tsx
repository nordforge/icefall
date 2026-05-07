import type { AppStatus, DeployStatus } from '../../lib/types';

const STATUS_COLORS: Record<string, string> = {
  online: 'var(--color-success)',
  running: 'var(--color-success)',
  building: 'var(--color-primary)',
  deploying: 'var(--color-primary)',
  pending: 'var(--color-text-muted)',
  failed: 'var(--color-error)',
  stopped: 'var(--color-text-muted)',
  cancelled: 'var(--color-text-muted)',
  success: 'var(--color-success)',
};

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  running: 'Running',
  building: 'Building',
  deploying: 'Deploying',
  pending: 'Pending',
  failed: 'Failed',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
  success: 'Success',
};

interface Props {
  status: AppStatus | DeployStatus | string;
  showLabel?: boolean;
}

export default function StatusDot({ status, showLabel = true }: Props) {
  const color = STATUS_COLORS[status] || 'var(--color-text-muted)';
  const label = STATUS_LABELS[status] || status;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
        role="presentation"
      />
      {showLabel && (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}
    </span>
  );
}
