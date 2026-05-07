import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $serverStatus } from '@stores/server';
import { api } from '@lib/api';
import { formatBytes, formatPercent } from '@lib/format';
import ProgressBar from '@islands/shared/ProgressBar/ProgressBar';
import styles from './server-stats.module.css';

export default function ServerStats() {
  const status = useStore($serverStatus);

  useEffect(() => {
    let active = true;

    async function fetch() {
      try {
        const data = await api.getServerStatus();
        if (active) $serverStatus.set(data);
      } catch {
        // silently retry
      }
    }

    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!status) {
    return (
      <div class={styles.grid}>
        {[0, 1, 2].map((i) => (
          <div key={i} class={styles.skeleton} />
        ))}
      </div>
    );
  }

  return (
    <div class={styles.grid}>
      <div class={styles.card}>
        <ProgressBar
          label="CPU"
          value={status.cpu_percent}
          max={100}
          formatValue={(v) => formatPercent(v)}
        />
      </div>
      <div class={styles.card}>
        <ProgressBar
          label="Memory"
          value={status.memory_used_bytes}
          max={status.memory_total_bytes}
          formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
        />
      </div>
      <div class={styles.card}>
        <ProgressBar
          label="Disk"
          value={status.disk_used_bytes}
          max={status.disk_total_bytes}
          formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
        />
      </div>
    </div>
  );
}
