import type { App } from '../../lib/types';
import StatusDot from '../shared/StatusDot';
import Button from '../shared/Button';
import { api } from '../../lib/api';
import { useState } from 'preact/hooks';
import { Settings, Rocket, GitBranch } from 'lucide-preact';

interface Props {
  app: App;
}

export default function AppHeader({ app }: Props) {
  const [deploying, setDeploying] = useState(false);

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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Apps / {app.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>{app.name}</h1>
          <StatusDot status="online" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {app.git_repo && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <GitBranch size={14} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{app.git_branch}</span>
            </span>
          )}
          {app.git_repo && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {app.git_repo.replace(/^https?:\/\//, '')}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <a href={`/apps/${app.id}/settings`} style={{ textDecoration: 'none' }}>
          <Button variant="secondary">
            <Settings size={14} /> Settings
          </Button>
        </a>
        <Button variant="primary" onClick={handleDeploy} loading={deploying}>
          <Rocket size={14} /> Deploy
        </Button>
      </div>
    </div>
  );
}
