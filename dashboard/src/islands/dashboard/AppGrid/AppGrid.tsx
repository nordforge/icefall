import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $apps, $appsLoading } from '@stores/apps';
import { api } from '@lib/api';
import { createSSEClient } from '@lib/sse';
import type { App, Deploy } from '@lib/types';
import AppCard from '@islands/dashboard/AppCard/AppCard';
import { Plus, X } from 'lucide-preact';
import styles from './app-grid.module.css';

function collectAllTags(apps: App[]): string[] {
  const tagSet = new Set<string>();
  for (const app of apps) {
    if (app.tags) {
      for (const t of app.tags.split(',')) {
        const trimmed = t.trim();
        if (trimmed) tagSet.add(trimmed);
      }
    }
  }
  return Array.from(tagSet).sort();
}

export default function AppGrid() {
  const apps = useStore($apps);
  const loading = useStore($appsLoading);
  const [deploys, setDeploys] = useState<Record<string, Deploy>>({});
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data } = await api.listApps();
        if (!active) return;
        $apps.set(data);
        $appsLoading.set(false);

        const deployMap: Record<string, Deploy> = {};
        if (data.length > 0) {
          const { data: latestDeploys } = await api.getLatestDeploys(data.map(a => a.id));
          for (const deploy of latestDeploys) {
            deployMap[deploy.app_id] = deploy;
          }
        }
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

  const allTags = useMemo(() => collectAllTags(apps), [apps]);

  const filteredApps = useMemo(() => {
    if (!activeTag) return apps;
    return apps.filter((app) =>
      app.tags
        ?.split(',')
        .map((t) => t.trim())
        .includes(activeTag),
    );
  }, [apps, activeTag]);

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
    <div>
      {allTags.length > 0 && (
        <div class={styles.tagFilters} role="group" aria-label="Filter apps by tag">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              class={`${styles.tagChip} ${activeTag === tag ? styles.tagChipActive : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              aria-pressed={activeTag === tag}
            >
              {tag}
              {activeTag === tag && <X size={12} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}

      <div class={styles.grid}>
        {filteredApps.map((app: App) => (
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
    </div>
  );
}
