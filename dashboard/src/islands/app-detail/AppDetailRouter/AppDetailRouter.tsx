import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import type { App } from '@lib/types';
import type { ComponentType } from 'preact';
import AppHeader from '@islands/app-detail/AppHeader/AppHeader';
import AppTabs from '@islands/app-detail/AppTabs/AppTabs';
import styles from './app-detail-router.module.css';

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
  overview: () => import('@islands/app-detail/OverviewTab/OverviewTab'),
  deploys: () => import('@islands/app-detail/DeploysTab/DeploysTab'),
  logs: () => import('@islands/logs/LogViewer/LogViewer'),
  env: () => import('@islands/env-vars/EnvVarEditor/EnvVarEditor'),
  domains: () => import('@islands/app-detail/DomainsTab/DomainsTab'),
  settings: () => import('@islands/app-detail/SettingsTab/SettingsTab'),
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
      import('@islands/deploy/DeployDetail/DeployDetail').then((m) => setDeployDetailComponent(() => m.default));
      return;
    }

    const loader = TAB_LOADERS[tab];
    if (loader) {
      loader().then((m) => setTabComponent(() => m.default));
    }
  }, [tab, subId]);

  if (loading) {
    return (
      <div class={styles.loading}>
        Loading...
      </div>
    );
  }

  if (error || !app) {
    return (
      <div class={styles.error} role="alert">
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
      <div class={styles.tabContent}>
        {TabComponent ? (
          <TabComponent {...tabProps} />
        ) : (
          <div class={styles.tabLoading}>Loading...</div>
        )}
      </div>
    </div>
  );
}
