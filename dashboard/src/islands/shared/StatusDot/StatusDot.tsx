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
  offline: 'Offline',
  enrolling: 'Enrolling',
  draining: 'Draining',
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
      {/* a11y [WCAG 4.1.2]: decorative when label visible, named when label hidden */}
      <span
        class={`${styles.dot} ${dotClass}`}
        {...(showLabel ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': label })}
      />
      {showLabel && <span class={styles.label}>{label}</span>}
    </span>
  );
}
