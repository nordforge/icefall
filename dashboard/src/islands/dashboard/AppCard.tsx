import type { App } from '../../lib/types';
import { formatRelativeTime } from '../../lib/format';
import StatusDot from '../shared/StatusDot';
import Button from '../shared/Button';
import { api } from '../../lib/api';
import { Rocket, RotateCcw, Play } from 'lucide-preact';
import { useState } from 'preact/hooks';

interface Props {
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
    <a
      href={`/apps/${app.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-5)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        color: 'inherit',
        gap: 'var(--space-3)',
        transition: `border-color var(--duration-fast) var(--ease-out)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)', color: 'var(--color-text)' }}>
          {app.name}
        </span>
        <StatusDot status={isOnline ? 'online' : status} />
      </div>

      {app.git_repo && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {app.git_repo.replace(/^https?:\/\//, '').replace(/\.git$/, '')}
        </span>
      )}

      {latestDeployTime && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {formatRelativeTime(latestDeployTime)}
        </span>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
        {isOnline && (
          <Button variant="primary" size="md" style={{ width: '100%' }} onClick={(e: Event) => { e.preventDefault(); handleDeploy(); }} loading={deploying}>
            <Rocket size={14} /> Deploy
          </Button>
        )}
        {isFailed && (
          <Button variant="secondary" size="md" style={{ width: '100%' }} onClick={(e: Event) => { e.preventDefault(); handleDeploy(); }} loading={deploying}>
            <RotateCcw size={14} /> Redeploy
          </Button>
        )}
        {isStopped && (
          <Button variant="secondary" size="md" style={{ width: '100%' }} onClick={(e: Event) => { e.preventDefault(); handleDeploy(); }} loading={deploying}>
            <Play size={14} /> Start
          </Button>
        )}
        {isBuilding && (
          <Button variant="secondary" size="md" style={{ width: '100%' }} disabled>
            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
            Deploying...
          </Button>
        )}
      </div>
    </a>
  );
}
