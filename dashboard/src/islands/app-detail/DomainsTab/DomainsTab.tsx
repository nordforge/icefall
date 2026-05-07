import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import type { Domain } from '@lib/types';
import Button from '@islands/shared/Button/Button';
import { Plus, Trash2, Shield, Globe } from 'lucide-preact';
import styles from './domains-tab.module.css';
import formStyles from '@styles/form.module.css';

type Props = {
  appId: string;
}

export default function DomainsTab({ appId }: Props) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.listDomains(appId).then(({ data }) => { setDomains(data); setLoading(false); }).catch(() => setLoading(false));
  }, [appId]);

  async function handleAdd() {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.addDomain(appId, newDomain.trim());
      setDomains((prev) => [...prev, data]);
      setNewDomain('');
    } catch { /* show error */ }
    setAdding(false);
  }

  if (loading) return <p class={styles.loadingText}>Loading domains...</p>;

  return (
    <div>
      <div class={styles.headerActions}>
        <div class={styles.inputGroup}>
          <label htmlFor="new-domain-input" class="sr-only">New domain</label>
          <input
            id="new-domain-input"
            type="text"
            value={newDomain}
            onInput={(e) => setNewDomain((e.target as HTMLInputElement).value)}
            placeholder="example.com"
            class={formStyles.input}
          />
          <Button variant="primary" onClick={handleAdd} loading={adding}>
            <Plus size={14} /> Add Domain
          </Button>
        </div>
      </div>

      {domains.length === 0 ? (
        <div class={styles.emptyState}>
          <Globe size={32} class={styles.emptyIcon} />
          <p>No custom domains configured.</p>
          <p class={styles.emptyHint}>
            Add a domain and point its DNS to your server.
          </p>
        </div>
      ) : (
        <div class={styles.tableCard}>
          <table class={styles.table}>
            <thead>
              <tr class={styles.tableRow}>
                {['Domain', 'SSL', 'DNS Status', 'Actions'].map((h) => (
                  <th key={h} class={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} class={styles.tableRow}>
                  <td class={styles.domainCell}>
                    <div class={styles.domainName}>
                      <Shield size={14} class={d.ssl_status === 'active' ? styles.sslActive : styles.sslInactive} />
                      {d.domain}
                    </div>
                  </td>
                  <td class={`${styles.td} ${d.ssl_status === 'active' ? styles.sslActive : styles.sslInactive}`}>
                    {d.ssl_status === 'active' ? 'Valid' : d.ssl_status}
                  </td>
                  <td class={styles.td}>
                    <span class={d.verified ? styles.dnsConfigured : styles.dnsPending}>
                      <span class={styles.dnsDot} />
                      {d.verified ? 'Configured' : 'Pending'}
                    </span>
                  </td>
                  <td class={styles.td}>
                    {/* a11y [4.1.2]: aria-label on icon-only button */}
                    <button class={styles.iconButton} aria-label="Delete domain">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
