import type { AppStatus, DeployStatus } from '@lib/types';
import styles from './status-dot.module.css';

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

type Props = {
  status: AppStatus | DeployStatus | string;
  showLabel?: boolean;
}

export default function StatusDot({ status, showLabel = true }: Props) {
  const label = STATUS_LABELS[status] || status;
  const dotClass = styles[status] || styles.pending;

  return (
    <span class={styles.wrapper}>
      <span
        class={`${styles.dot} ${dotClass}`}
        role="img"
        aria-label={showLabel ? undefined : label}
      />
      {showLabel && <span class={styles.label}>{label}</span>}
    </span>
  );
}
