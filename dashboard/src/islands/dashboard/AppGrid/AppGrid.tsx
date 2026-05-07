import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $apps, $appsLoading } from '@stores/apps';
import { api } from '@lib/api';
import { createSSEClient } from '@lib/sse';
import type { App, Deploy } from '@lib/types';
import AppCard from '@islands/dashboard/AppCard/AppCard';
import { Plus } from 'lucide-preact';
import styles from './app-grid.module.css';

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
      <div class={styles.grid}>
        {[0, 1, 2].map((i) => (
          <div key={i} class={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div class={styles.empty}>
        <p class={styles.emptyTitle}>
          No applications yet
        </p>
        <p class={styles.emptyDescription}>
          Deploy your first app to get started.
        </p>
        <a href="/apps/new" class={styles.emptyAction}>
          <Plus size={16} /> Create your first app
        </a>
      </div>
    );
  }

  return (
    <div class={styles.grid}>
      {apps.map((app: App) => (
        <AppCard
          key={app.id}
          app={app}
          latestDeployStatus={deploys[app.id]?.status}
          latestDeployTime={deploys[app.id]?.created_at}
        />
      ))}

      <a href="/apps/new" class={styles.newAppCard}>
        <Plus size={24} />
        New App
      </a>
    </div>
  );
}
