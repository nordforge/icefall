import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import type { ServerStatus } from '@lib/types';
import { formatBytes, formatPercent } from '@lib/format';
import ProgressBar from '@islands/shared/ProgressBar/ProgressBar';
import Button from '@islands/shared/Button/Button';
import { Cpu, HardDrive, MemoryStick, Wifi, LayoutGrid, List, Server, Hash, Globe, Database } from 'lucide-preact';
import styles from './server-page.module.css';

type InfoItem = {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}

export default function ServerPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [serverIp, setServerIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await api.getServerStatus();
        if (active) setStatus(data);
      } catch {}
      try {
        const { ip } = await api.getServerIp();
        if (active) setServerIp(ip);
      } catch {}
      if (active) setLoading(false);
    }

    load();
    const interval = setInterval(async () => {
      try {
        const data = await api.getServerStatus();
        if (active) setStatus(data);
      } catch {}
    }, 10_000);

    return () => { active = false; clearInterval(interval); };
  }, []);

  if (loading) return (
    <div>
      <div class={styles.pageHeader}><h1 class={styles.pageTitle}>Server</h1></div>
      <p class={styles.loadingText}>Loading server info...</p>
    </div>
  );

  if (!status) return (
    <div>
      <div class={styles.pageHeader}><h1 class={styles.pageTitle}>Server</h1></div>
      <div class={styles.emptyState}>
        <p class={styles.emptyTitle}>Unable to reach server</p>
        <p class={styles.emptyHint}>Make sure the Icefall daemon is running.</p>
      </div>
    </div>
  );

  const infoItems: InfoItem[] = [
    { icon: Hash, label: 'Version', value: status.version },
    { icon: Server, label: 'Status', value: status.status },
    ...(serverIp ? [{ icon: Globe, label: 'Server IP', value: serverIp, mono: true }] : []),
    { icon: MemoryStick, label: 'Total Memory', value: formatBytes(status.memory_total_bytes) },
    { icon: HardDrive, label: 'Total Disk', value: formatBytes(status.disk_total_bytes) },
    { icon: Cpu, label: 'CPU Usage', value: formatPercent(status.cpu_percent) },
  ];

  return (
    <div>
      <div class={styles.pageHeader}>
        <h1 class={styles.pageTitle}>Server</h1>
      </div>

      <div class={styles.metricsGrid}>
        <div class={styles.metricCard}>
          <div class={styles.metricIcon}><Cpu size={20} aria-hidden="true" /></div>
          <div class={styles.metricContent}>
            <ProgressBar
              label="CPU"
              value={status.cpu_percent}
              max={100}
              formatValue={(v) => formatPercent(v)}
            />
          </div>
        </div>
        <div class={styles.metricCard}>
          <div class={styles.metricIcon}><MemoryStick size={20} aria-hidden="true" /></div>
          <div class={styles.metricContent}>
            <ProgressBar
              label="Memory"
              value={status.memory_used_bytes}
              max={status.memory_total_bytes}
              formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
            />
          </div>
        </div>
        <div class={styles.metricCard}>
          <div class={styles.metricIcon}><HardDrive size={20} aria-hidden="true" /></div>
          <div class={styles.metricContent}>
            <ProgressBar
              label="Disk"
              value={status.disk_used_bytes}
              max={status.disk_total_bytes}
              formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
            />
          </div>
        </div>
      </div>

      <div class={styles.sectionHeader}>
        <h2 class={styles.sectionTitle}>System Info</h2>
        <div class={styles.viewToggle}>
          <button
            type="button"
            class={`${styles.toggleButton} ${viewMode === 'cards' ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('cards')}
            aria-pressed={viewMode === 'cards'}
            aria-label="Card view"
          >
            <LayoutGrid size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${viewMode === 'table' ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            aria-label="Table view"
          >
            <List size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div class={styles.infoGrid}>
          {infoItems.map(item => (
            <div key={item.label} class={styles.infoCard}>
              <div class={styles.infoCardIcon}>
                <item.icon size={18} aria-hidden="true" />
              </div>
              <div class={styles.infoCardContent}>
                <span class={styles.infoCardLabel}>{item.label}</span>
                <span class={item.mono ? styles.infoCardValueMono : styles.infoCardValue}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div class={styles.detailCard}>
          <dl class={styles.detailList}>
            {infoItems.map(item => (
              <div key={item.label} class={styles.detailRow}>
                <dt class={styles.detailLabel}>{item.label}</dt>
                <dd class={item.mono ? styles.detailValueMono : styles.detailValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
