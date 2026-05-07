import { useCallback } from 'preact/hooks';

interface Props {
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
  overview: () => { import('./OverviewTab'); },
  deploys: () => { import('./DeploysTab'); },
  logs: () => { import('./LogsTab'); },
  env: () => { import('./EnvVarsTab'); },
  domains: () => { import('./DomainsTab'); },
  settings: () => { import('./SettingsTab'); },
};

const preloaded = new Set<string>();

function preloadTab(key: string) {
  if (preloaded.has(key)) return;
  preloaded.add(key);
  TAB_PRELOADERS[key]?.();
}

export default function AppTabs({ appId, activeTab }: Props) {
  const handlePreload = useCallback((key: string) => () => preloadTab(key), []);

  return (
    <nav
      role="tablist"
      style={{
        display: 'flex',
        gap: 'var(--space-1)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <a
            key={tab.key}
            href={`/apps/${appId}${tab.path}`}
            role="tab"
            aria-selected={isActive}
            onMouseEnter={handlePreload(tab.key)}
            onFocus={handlePreload(tab.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 'var(--weight-medium)' : 'var(--weight-normal)',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
              textDecoration: 'none',
              marginBottom: -1,
              transition: `color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)`,
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
