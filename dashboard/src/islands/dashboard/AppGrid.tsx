import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $apps, $appsLoading } from '../../stores/apps';
import { api } from '../../lib/api';
import { createSSEClient } from '../../lib/sse';
import type { App, Deploy } from '../../lib/types';
import AppCard from './AppCard';
import { Plus } from 'lucide-preact';

export default function AppGrid() {
  const apps = useStore($apps);
  const loading = useStore($appsLoading);
  const [deploys, setDeploys] = useState<Record<string, Deploy>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data } = await api.listApps();
        if (!active) return;
        $apps.set(data);
        $appsLoading.set(false);

        const deployMap: Record<string, Deploy> = {};
        const results = await Promise.allSettled(
          data.map((app) => api.listDeploys(app.id)),
        );
        results.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value.data.length > 0) {
            deployMap[data[i].id] = result.value.data[0];
          }
        });
        if (active) setDeploys(deployMap);
      } catch {
        if (active) $appsLoading.set(false);
      }
    }

    load();

    const sse = createSSEClient('/api/v1/events', {
      'deploy.status': (data: any) => {
        if (data.status && data.app_id) {
          setDeploys((prev) => ({
            ...prev,
            [data.app_id]: { ...prev[data.app_id], status: data.status },
          }));
        }
      },
    });

    return () => {
      active = false;
      sse.close();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 180,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          />
        ))}
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-12) var(--space-4)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          No applications yet
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          Deploy your first app to get started.
        </p>
        <a
          href="/apps/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            height: 'var(--button-height)',
            padding: '0 var(--space-5)',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-text)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 'var(--weight-medium)',
            fontSize: 'var(--text-sm)',
            textDecoration: 'none',
          }}
        >
          <Plus size={16} /> Create your first app
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--space-4)',
      }}
    >
      {apps.map((app: App) => (
        <AppCard
          key={app.id}
          app={app}
          latestDeployStatus={deploys[app.id]?.status}
          latestDeployTime={deploys[app.id]?.created_at}
        />
      ))}

      <a
        href="/apps/new"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-8)',
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          minHeight: 180,
          transition: `border-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)`,
        }}
      >
        <Plus size={24} />
        New App
      </a>
    </div>
  );
}
