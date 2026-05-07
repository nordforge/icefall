import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';
import type { App } from '../../lib/types';
import type { ComponentType } from 'preact';
import AppHeader from './AppHeader';
import AppTabs from './AppTabs';

function parseRoute() {
  const path = window.location.pathname.replace('/apps/', '');
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return { appId: '', tab: 'overview', subId: '' };

  const appId = segments[0];
  const tab = segments[1] || 'overview';
  const subId = segments[2] || '';

  return { appId, tab, subId };
}

const TAB_LOADERS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  overview: () => import('./OverviewTab'),
  deploys: () => import('./DeploysTab'),
  logs: () => import('./LogsTab'),
  env: () => import('./EnvVarsTab'),
  domains: () => import('./DomainsTab'),
  settings: () => import('./SettingsTab'),
};

export default function AppDetailRouter() {
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [TabComponent, setTabComponent] = useState<ComponentType<any> | null>(null);
  const [DeployDetailComponent, setDeployDetailComponent] = useState<ComponentType<any> | null>(null);
  const { appId, tab, subId } = parseRoute();

  useEffect(() => {
    if (!appId) return;
    api
      .getApp(appId)
      .then(({ data }) => {
        setApp(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [appId]);

  useEffect(() => {
    if (tab === 'deploys' && subId) {
      import('../deploy/DeployDetail').then((m) => setDeployDetailComponent(() => m.default));
      return;
    }

    const loader = TAB_LOADERS[tab];
    if (loader) {
      loader().then((m) => setTabComponent(() => m.default));
    }
  }, [tab, subId]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (error || !app) {
    return (
      <div style={{ padding: 'var(--space-8)', color: 'var(--color-error)' }}>
        {error || 'App not found'}
      </div>
    );
  }

  if (tab === 'deploys' && subId && DeployDetailComponent) {
    return <DeployDetailComponent appId={app.id} deployId={subId} appName={app.name} />;
  }

  const tabProps = tab === 'overview' || tab === 'settings' ? { app } : { appId: app.id };

  return (
    <div>
      <AppHeader app={app} />
      <AppTabs appId={app.id} activeTab={tab} />
      <div style={{ marginTop: 'var(--space-5)' }}>
        {TabComponent ? (
          <TabComponent {...tabProps} />
        ) : (
          <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>Loading...</div>
        )}
      </div>
    </div>
  );
}
