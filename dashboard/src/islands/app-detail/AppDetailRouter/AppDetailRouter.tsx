import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { api } from '@lib/api';
import type { App, DeployStatus } from '@lib/types';
import type { ComponentType } from 'preact';
import AppHeader from '@islands/app-detail/AppHeader/AppHeader';
import AppTabs from '@islands/app-detail/AppTabs/AppTabs';
import styles from './app-detail-router.module.css';

function parseRoute() {
  const path = window.location.pathname.replace('/apps/', '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { appId: '', tab: 'overview', subId: '' };
  return { appId: segments[0], tab: segments[1] || 'overview', subId: segments[2] || '' };
}

const TAB_LOADERS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  overview: () => import('@islands/app-detail/OverviewTab/OverviewTab'),
  deploys: () => import('@islands/app-detail/DeploysTab/DeploysTab'),
  logs: () => import('@islands/logs/LogViewer/LogViewer'),
  env: () => import('@islands/env-vars/EnvVarEditor/EnvVarEditor'),
  databases: () => import('@islands/app-detail/DatabaseTab/DatabaseTab'),
  terminal: () => import('@islands/app-detail/TerminalTab/TerminalTab'),
  domains: () => import('@islands/app-detail/DomainsTab/DomainsTab'),
  settings: () => import('@islands/app-detail/SettingsTab/SettingsTab'),
};

export default function AppDetailRouter() {
  const initial = parseRoute();
  const [app, setApp] = useState<App | null>(null);
  const [appStatus, setAppStatus] = useState<DeployStatus | 'online'>('stopped');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initial.tab);
  const [subId] = useState(initial.subId);

  const componentCache = useRef<Record<string, ComponentType<any>>>({});
  const [loadedTabs, setLoadedTabs] = useState<Record<string, ComponentType<any>>>({});
  const [DeployDetail, setDeployDetail] = useState<ComponentType<any> | null>(null);

  const appId = initial.appId;

  const refreshStatus = useCallback(() => {
    if (!appId) return;
    api.listDeploys(appId).then(({ data }) => {
      const latest = data[0];
      setAppStatus(latest?.status === 'running' ? 'running' : latest?.status || 'stopped');
    }).catch(() => {});
  }, [appId]);

  useEffect(() => {
    if (!appId) return;
    api.getApp(appId)
      .then(({ data }) => { setApp(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
    refreshStatus();
  }, [appId, refreshStatus]);

  useEffect(() => {
    if (componentCache.current[activeTab]) {
      setLoadedTabs(prev => ({ ...prev, [activeTab]: componentCache.current[activeTab] }));
      return;
    }

    const loader = TAB_LOADERS[activeTab];
    if (loader) {
      loader().then((m) => {
        componentCache.current[activeTab] = m.default;
        setLoadedTabs(prev => ({ ...prev, [activeTab]: m.default }));
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'deploys' && subId) {
      import('@islands/deploy/DeployDetail/DeployDetail').then((m) => {
        setDeployDetail(() => m.default);
      });
    }
  }, [activeTab, subId]);

  if (loading) {
    return <div class={styles.loading}>Loading...</div>;
  }

  if (error || !app) {
    return <div class={styles.error} role="alert">{error || 'App not found'}</div>;
  }

  if (activeTab === 'deploys' && subId && DeployDetail) {
    return <DeployDetail appId={app.id} deployId={subId} appName={app.name} />;
  }

  const TabComponent = loadedTabs[activeTab] || null;
  const tabProps = activeTab === 'overview' || activeTab === 'settings' ? { app } : { appId: app.id };

  return (
    <div>
      <AppHeader app={app} status={appStatus} onStatusChange={refreshStatus} />
      <AppTabs appId={app.id} activeTab={activeTab} onTabChange={setActiveTab} />
      <div class={styles.tabContent}>
        {TabComponent ? (
          <TabComponent key={activeTab} {...tabProps} />
        ) : (
          <div class={styles.tabLoading}>Loading...</div>
        )}
      </div>
    </div>
  );
}
