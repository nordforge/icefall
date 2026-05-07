import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';
import type { Domain } from '../../lib/types';
import Button from '../shared/Button';
import { Plus, Trash2, Shield, Globe } from 'lucide-preact';

interface Props {
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

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading domains...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
            value={newDomain}
            onInput={(e) => setNewDomain((e.target as HTMLInputElement).value)}
            placeholder="example.com"
            style={{
              height: 'var(--input-height)',
              padding: '0 var(--space-3)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-sm)',
            }}
          />
          <Button variant="primary" onClick={handleAdd} loading={adding}>
            <Plus size={14} /> Add Domain
          </Button>
        </div>
      </div>

      {domains.length === 0 ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Globe size={32} style={{ marginBottom: 'var(--space-2)', opacity: 0.5 }} />
          <p>No custom domains configured.</p>
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Add a domain and point its DNS to your server.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Domain', 'SSL', 'DNS Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-medium)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Shield size={14} style={{ color: d.ssl_status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
                      {d.domain}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: d.ssl_status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {d.ssl_status === 'active' ? 'Valid' : d.ssl_status}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: d.verified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {d.verified ? 'Configured' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 'var(--space-1)' }}>
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
