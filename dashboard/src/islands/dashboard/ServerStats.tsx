import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $serverStatus } from '../../stores/server';
import { api } from '../../lib/api';
import { formatBytes, formatPercent } from '../../lib/format';
import ProgressBar from '../shared/ProgressBar';

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
        <ProgressBar
          label="CPU"
          value={status.cpu_percent}
          max={100}
          formatValue={(v) => formatPercent(v)}
        />
      </div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
        <ProgressBar
          label="Memory"
          value={status.memory_used_bytes}
          max={status.memory_total_bytes}
          formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
        />
      </div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
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
