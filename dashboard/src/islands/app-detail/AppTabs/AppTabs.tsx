import { useCallback } from 'preact/hooks';
import styles from './app-tabs.module.css';

type Props = {
  appId: string;
  activeTab: string;
}

const TABS = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'deploys', label: 'Deploys', path: '/deploys' },
  { key: 'logs', label: 'Logs', path: '/logs' },
  { key: 'env', label: 'Env Vars', path: '/env' },
  { key: 'domains', label: 'Domains', path: '/domains' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];

const TAB_PRELOADERS: Record<string, () => void> = {
  overview: () => { import('@islands/app-detail/OverviewTab/OverviewTab'); },
  deploys: () => { import('@islands/app-detail/DeploysTab/DeploysTab'); },
  logs: () => { import('@islands/logs/LogViewer/LogViewer'); },
  env: () => { import('@islands/env-vars/EnvVarEditor/EnvVarEditor'); },
  domains: () => { import('@islands/app-detail/DomainsTab/DomainsTab'); },
  settings: () => { import('@islands/app-detail/SettingsTab/SettingsTab'); },
};

const preloaded = new Set<string>();

function preloadTab(key: string) {
  if (preloaded.has(key)) return;
  preloaded.add(key);
  TAB_PRELOADERS[key]?.();
}

export default function AppTabs({ appId, activeTab }: Props) {
  const handlePreload = useCallback((key: string) => () => preloadTab(key), []);

  {/* a11y [WCAG 4.1.2]: these are navigation links, not JS tabs — use aria-current instead of tab roles */}
  return (
    <nav
      aria-label="App sections"
      class={styles.nav}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <a
            key={tab.key}
            href={`/apps/${appId}${tab.path}`}
            aria-current={isActive ? 'page' : undefined}
            onMouseEnter={handlePreload(tab.key)}
            onFocus={handlePreload(tab.key)}
            class={isActive ? styles.tabActive : styles.tab}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
