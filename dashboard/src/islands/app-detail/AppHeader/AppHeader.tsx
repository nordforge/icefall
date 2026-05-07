import type { App } from '@lib/types';
import StatusDot from '@islands/shared/StatusDot/StatusDot';
import Button from '@islands/shared/Button/Button';
import { api } from '@lib/api';
import { useState } from 'preact/hooks';
import { Settings, Rocket, GitBranch } from 'lucide-preact';
import styles from './app-header.module.css';

type Props = {
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
    <div class={styles.header}>
      <div>
        {/* a11y [WCAG 2.4.8]: proper breadcrumb navigation */}
        <nav aria-label="Breadcrumb" class={styles.breadcrumb}>
          <a href="/">Apps</a> / <span aria-current="page">{app.name}</span>
        </nav>
        <div class={styles.titleRow}>
          <h1 class={styles.title}>{app.name}</h1>
          <StatusDot status="online" />
        </div>
        <div class={styles.meta}>
          {app.git_repo && (
            <span class={styles.branchInfo}>
              <GitBranch size={14} />
              <span class={styles.mono}>{app.git_branch}</span>
            </span>
          )}
          {app.git_repo && (
            <span class={styles.repoUrl}>
              {app.git_repo.replace(/^https?:\/\//, '')}
            </span>
          )}
        </div>
      </div>
      <div class={styles.actions}>
        <a href={`/apps/${app.id}/settings`} class={styles.settingsLink}>
          {/* a11y [4.1.2]: button label provided by visible text content */}
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
