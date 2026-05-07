import { useState } from 'preact/hooks';
import type { App } from '../../lib/types';
import { api } from '../../lib/api';
import Button from '../shared/Button';
import { Save, AlertTriangle, Square, Trash2 } from 'lucide-preact';

interface Props {
  app: App;
}

export default function SettingsTab({ app }: Props) {
  const [form, setForm] = useState({
    name: app.name,
    git_repo: app.git_repo || '',
    git_branch: app.git_branch,
    build_command: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const buildConfig = app.build_config ? JSON.parse(app.build_config) : {};
  if (!form.build_command && buildConfig.build_command) {
    form.build_command = buildConfig.build_command;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateApp(app.id, {
        name: form.name,
        git_repo: form.git_repo || undefined,
        git_branch: form.git_branch,
      } as any);
    } catch { /* show error */ }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteApp(app.id);
      window.location.href = '/';
    } catch {
      setDeleting(false);
    }
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
    fontFamily: 'var(--font-sans)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)' as const,
    color: 'var(--color-text)',
    marginBottom: 'var(--space-1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-5)' }}>
          General Settings
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>App Name</label>
            <input style={inputStyle} value={form.name} onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label style={labelStyle}>Git Repository</label>
            <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.git_repo} onInput={(e) => setForm({ ...form, git_repo: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label style={labelStyle}>Branch</label>
            <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.git_branch} onInput={(e) => setForm({ ...form, git_branch: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label style={labelStyle}>Build Command</label>
            <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.build_command} onInput={(e) => setForm({ ...form, build_command: (e.target as HTMLInputElement).value })} placeholder="bun run build" />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-error)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <AlertTriangle size={18} /> Danger Zone
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>Stop Application</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Temporarily halt all traffic and instances of this application.</p>
          </div>
          <Button variant="secondary"><Square size={14} /> Stop App</Button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>Delete Application</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Deleting this app will remove all deploys, domains, and environment variables. This action cannot be undone.</p>
          </div>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                <Trash2 size={14} /> Confirm Delete
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
