import { useEffect, useState } from 'preact/hooks';
import Button from '../shared/Button';
import StatusDot from '../shared/StatusDot';
import { formatRelativeTime, formatBytes } from '../../lib/format';
import { Plus, Database, Trash2, Link, Copy, Eye, EyeOff, Download, RefreshCw } from 'lucide-preact';

interface ManagedDb {
  id: string;
  name: string;
  db_type: string;
  container_id: string | null;
  credentials: string;
  backup_schedule: string | null;
  app_id: string | null;
  created_at: string;
}

interface BackupInfo {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
  status: string;
}

const DB_ICONS: Record<string, string> = {
  postgres: 'PG',
  mysql: 'MY',
  redis: 'RD',
  mongo: 'MG',
};

const DB_COLORS: Record<string, string> = {
  postgres: 'oklch(0.55 0.15 250)',
  mysql: 'oklch(0.55 0.15 40)',
  redis: 'oklch(0.55 0.20 25)',
  mongo: 'oklch(0.55 0.15 140)',
};

export default function DatabasesPage() {
  const [dbs, setDbs] = useState<ManagedDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDb, setSelectedDb] = useState<ManagedDb | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDb, setNewDb] = useState({ name: '', db_type: 'postgres', memory_mb: '' });

  useEffect(() => {
    fetch('/api/v1/databases').then(r => r.json()).then(d => { setDbs(d.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDb) {
      fetch(`/api/v1/databases/${selectedDb.id}/backups`).then(r => r.json()).then(d => setBackups(d.data || [])).catch(() => {});
    }
  }, [selectedDb?.id]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/v1/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDb.name,
          db_type: newDb.db_type,
          memory_mb: newDb.memory_mb ? parseInt(newDb.memory_mb) : undefined,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setDbs(prev => [...prev, data]);
        setShowCreate(false);
        setNewDb({ name: '', db_type: 'postgres', memory_mb: '' });
      }
    } catch {}
    setCreating(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/v1/databases/${id}`, { method: 'DELETE' });
    setDbs(prev => prev.filter(d => d.id !== id));
    if (selectedDb?.id === id) setSelectedDb(null);
  }

  async function handleBackup(id: string) {
    await fetch(`/api/v1/databases/${id}/backup`, { method: 'POST' });
    const res = await fetch(`/api/v1/databases/${id}/backups`);
    const d = await res.json();
    setBackups(d.data || []);
  }

  function getConnectionString(db: ManagedDb): string {
    try {
      const creds = JSON.parse(db.credentials);
      return creds.connection_string || '';
    } catch { return ''; }
  }

  const inputStyle = {
    width: '100%',
    height: 'var(--input-height)',
    padding: '0 var(--space-3)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--text-sm)',
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>Loading databases...</p>;

  if (selectedDb) {
    const connStr = getConnectionString(selectedDb);
    return (
      <div>
        <button onClick={() => setSelectedDb(null)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
          ← Back to databases
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: DB_COLORS[selectedDb.db_type] || 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
            {DB_ICONS[selectedDb.db_type] || 'DB'}
          </span>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>{selectedDb.name}</h1>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{selectedDb.db_type}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)' }}>Connection</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: showCredentials ? 'var(--color-text)' : 'var(--color-text-muted)', background: 'var(--color-surface-alt)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {showCredentials ? connStr : '••••••••••••••••••••••••'}
              </code>
              <button onClick={() => setShowCredentials(!showCredentials)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                {showCredentials ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={() => navigator.clipboard.writeText(connStr)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>Backups</h3>
              <Button variant="secondary" size="sm" onClick={() => handleBackup(selectedDb.id)}>
                <RefreshCw size={12} /> Backup Now
              </Button>
            </div>
            {backups.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>No backups yet.</p>
            ) : (
              <table style={{ fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Filename', 'Size', 'Created', 'Status'].map(h => (
                      <th key={h} style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-medium)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{b.filename}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{formatBytes(b.size_bytes)}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{b.created_at ? formatRelativeTime(b.created_at) : '—'}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-3)' }}><StatusDot status={b.status === 'completed' ? 'success' : 'failed'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>Delete Database</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>This will permanently delete the database and all its data.</p>
              </div>
              <Button variant="danger" onClick={() => handleDelete(selectedDb.id)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>Databases</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Add Database
        </Button>
      </div>

      {showCreate && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-4)' }}>Create Database</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-1)' }}>Name</label>
              <input style={inputStyle} value={newDb.name} onInput={(e) => setNewDb({ ...newDb, name: (e.target as HTMLInputElement).value })} placeholder="my-database" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-1)' }}>Type</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={newDb.db_type} onChange={(e) => setNewDb({ ...newDb, db_type: (e.target as HTMLSelectElement).value })}>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="redis">Redis</option>
                <option value="mongo">MongoDB</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={creating} disabled={!newDb.name.trim()}>
              <Database size={14} /> Create
            </Button>
          </div>
        </div>
      )}

      {dbs.length === 0 && !showCreate ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Database size={40} style={{ marginBottom: 'var(--space-3)', opacity: 0.3 }} />
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text)' }}>No databases yet</p>
          <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>Provision a database with one click.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {dbs.map(db => (
            <div
              key={db.id}
              onClick={() => setSelectedDb(db)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)',
                cursor: 'pointer',
                transition: 'border-color var(--duration-fast) var(--ease-out)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: DB_COLORS[db.db_type] || 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10px' }}>
                  {DB_ICONS[db.db_type] || 'DB'}
                </span>
                <div>
                  <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)' }}>{db.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{db.db_type}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusDot status={db.container_id ? 'online' : 'stopped'} showLabel={false} />
                </div>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Created {formatRelativeTime(db.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
