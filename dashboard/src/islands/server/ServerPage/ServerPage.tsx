import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import type { ServerStatus } from '@lib/types';
import { formatBytes, formatPercent } from '@lib/format';
import ProgressBar from '@islands/shared/ProgressBar/ProgressBar';
import { Cpu, HardDrive, MemoryStick, Wifi } from 'lucide-preact';
import styles from './server-page.module.css';

export default function ServerPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [serverIp, setServerIp] = useState('');
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div class={styles.pageHeader}>
        <h1 class={styles.pageTitle}>Server</h1>
      </div>

      {loading ? (
        <p class={styles.loadingText}>Loading server info...</p>
      ) : !status ? (
        <div class={styles.emptyState}>
          <p class={styles.emptyTitle}>Unable to reach server</p>
          <p class={styles.emptyHint}>Make sure the Icefall daemon is running.</p>
        </div>
      ) : (
        <>
          <div class={styles.grid}>
            <div class={styles.card}>
              <div class={styles.cardIcon}><Cpu size={18} aria-hidden="true" /></div>
              <ProgressBar
                label="CPU"
                value={status.cpu_percent}
                max={100}
                formatValue={(v) => formatPercent(v)}
              />
            </div>
            <div class={styles.card}>
              <div class={styles.cardIcon}><MemoryStick size={18} aria-hidden="true" /></div>
              <ProgressBar
                label="Memory"
                value={status.memory_used_bytes}
                max={status.memory_total_bytes}
                formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
              />
            </div>
            <div class={styles.card}>
              <div class={styles.cardIcon}><HardDrive size={18} aria-hidden="true" /></div>
              <ProgressBar
                label="Disk"
                value={status.disk_used_bytes}
                max={status.disk_total_bytes}
                formatValue={(v, m) => `${formatBytes(v)} / ${formatBytes(m)}`}
              />
            </div>
          </div>

          <div class={styles.detailGrid}>
            <div class={styles.detailCard}>
              <h2 class={styles.sectionTitle}>System Info</h2>
              <dl class={styles.detailList}>
                <div class={styles.detailRow}>
                  <dt class={styles.detailLabel}>Version</dt>
                  <dd class={styles.detailValue}>{status.version}</dd>
                </div>
                <div class={styles.detailRow}>
                  <dt class={styles.detailLabel}>Status</dt>
                  <dd class={styles.detailValue}>{status.status}</dd>
                </div>
                {serverIp && (
                  <div class={styles.detailRow}>
                    <dt class={styles.detailLabel}>Server IP</dt>
                    <dd class={styles.detailValueMono}>{serverIp}</dd>
                  </div>
                )}
                <div class={styles.detailRow}>
                  <dt class={styles.detailLabel}>Total Memory</dt>
                  <dd class={styles.detailValue}>{formatBytes(status.memory_total_bytes)}</dd>
                </div>
                <div class={styles.detailRow}>
                  <dt class={styles.detailLabel}>Total Disk</dt>
                  <dd class={styles.detailValue}>{formatBytes(status.disk_total_bytes)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
