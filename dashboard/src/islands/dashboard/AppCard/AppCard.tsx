import type { App } from '@lib/types';
import { formatRelativeTime } from '@lib/format';
import StatusDot from '@islands/shared/StatusDot/StatusDot';
import Button from '@islands/shared/Button/Button';
import { api } from '@lib/api';
import { Rocket, RotateCcw, Play } from 'lucide-preact';
import { useState } from 'preact/hooks';
import styles from './app-card.module.css';

type Props = {
  app: App;
  latestDeployStatus?: string;
  latestDeployTime?: string;
}

export default function AppCard({ app, latestDeployStatus, latestDeployTime }: Props) {
  const [deploying, setDeploying] = useState(false);
  const status = latestDeployStatus || 'stopped';
  const isOnline = status === 'running';
  const isFailed = status === 'failed';
  const isBuilding = status === 'building' || status === 'deploying';
  const isStopped = status === 'stopped';

  async function handleDeploy() {
    setDeploying(true);
    try {
      await api.triggerDeploy(app.id);
      window.location.href = `/apps/${app.id}/deploys`;
    } catch {
      setDeploying(false);
    }
  }

  return (
    <a href={`/apps/${app.id}`} class={styles.card}>
      <div class={styles.header}>
        <span class={styles.name}>
          {app.name}
        </span>
        <StatusDot status={isOnline ? 'online' : status} />
      </div>

      {app.git_repo && (
        <span class={styles.repo}>
          {app.git_repo.replace(/^https?:\/\//, '').replace(/\.git$/, '')}
        </span>
      )}

      {latestDeployTime && (
        <span class={styles.time}>
          {formatRelativeTime(latestDeployTime)}
        </span>
      )}

      <div class={styles.actions}>
        {isOnline && (
          <Button variant="primary" size="md" fullWidth onClick={(e: Event) => { e.preventDefault(); handleDeploy(); }} loading={deploying}>
            <Rocket size={14} /> Deploy
          </Button>
        )}
        {isFailed && (
          <Button variant="secondary" size="md" fullWidth onClick={(e: Event) => { e.preventDefault(); handleDeploy(); }} loading={deploying}>
            <RotateCcw size={14} /> Redeploy
          </Button>
        )}
        {isStopped && (
          <Button variant="secondary" size="md" fullWidth onClick={(e: Event) => { e.preventDefault(); handleDeploy(); }} loading={deploying}>
            <Play size={14} /> Start
          </Button>
        )}
        {isBuilding && (
          <Button variant="secondary" size="md" fullWidth disabled>
            {/* a11y [4.1.2]: spinner is decorative, hidden from assistive tech */}
            <span class={styles.spinner} aria-hidden="true" />
            Deploying...
          </Button>
        )}
      </div>
    </a>
  );
}
