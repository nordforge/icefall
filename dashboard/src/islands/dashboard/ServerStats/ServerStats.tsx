import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $serverStatus } from '@stores/server';
import { api } from '@lib/api';
import type { ServerMetricsSnapshot } from '@lib/types';
import { formatBytes, formatPercent } from '@lib/format';
import ProgressBar from '@islands/shared/ProgressBar/ProgressBar';
import Sparkline from '@islands/shared/Sparkline/Sparkline';
import styles from './server-stats.module.css';

export default function ServerStats() {
  const status = useStore($serverStatus);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState<ServerMetricsSnapshot[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      try {
        const data = await api.getServerStatus();
        if (active) $serverStatus.set(data);
      } catch {}
      try {
        const { data } = await api.getServerMetricsHistory(60);
        if (active) setHistory(data);
      } catch {}
      if (active) setLoaded(true);
    }

    fetchAll();
    const interval = setInterval(fetchAll, 5_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!status) {
    if (loaded) return null;
    return (
      <div class={styles.grid}>
        {[0, 1, 2].map((i) => (
          <div key={i} class={styles.skeleton} />
        ))}
      </div>
    );
  }

  const cpuData = history.map(s => s.cpu_percent);
  const memData = history.map(s => s.memory_total_bytes > 0 ? (s.memory_used_bytes / s.memory_total_bytes) * 100 : 0);
  const diskData = history.map(s => s.disk_total_bytes > 0 ? (s.disk_used_bytes / s.disk_total_bytes) * 100 : 0);

  return (
    <div class={styles.grid}>
      <div class={styles.card}>
        <ProgressBar
          label="CPU"
          value={status.cpu_percent}
          max={100}
          formatValue={(v) => formatPercent(v)}
        />
        {cpuData.length > 1 && (
          <div class={styles.sparklineWrap}>
            <Sparkline data={cpuData} max={100} color="var(--color-primary)" />
          </div>
        )}
      </div>
      <div class={styles.card}>
        <ProgressBar
          label="Memory"
          value={status.memory_used_bytes}
          max={status.memory_total_bytes}
          formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
        />
        {memData.length > 1 && (
          <div class={styles.sparklineWrap}>
            <Sparkline data={memData} max={100} color="var(--color-info)" />
          </div>
        )}
      </div>
      <div class={styles.card}>
        <ProgressBar
          label="Disk"
          value={status.disk_used_bytes}
          max={status.disk_total_bytes}
          formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
        />
        {diskData.length > 1 && (
          <div class={styles.sparklineWrap}>
            <Sparkline data={diskData} max={100} color="var(--color-warning)" />
          </div>
        )}
      </div>
      <a href="/server/metrics" class={styles.detailLink}>View details &rarr;</a>
    </div>
  );
}
