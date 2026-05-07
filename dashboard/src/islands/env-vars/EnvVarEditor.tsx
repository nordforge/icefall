import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';
import type { EnvVar } from '../../lib/types';
import Button from '../shared/Button';
import { Plus, Eye, EyeOff, Trash2, Upload, Save } from 'lucide-preact';

interface Props {
  appId: string;
}

export default function EnvVarEditor({ appId }: Props) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newScope, setNewScope] = useState('shared');
  const [showImport, setShowImport] = useState(false);
  const [importContent, setImportContent] = useState('');

  useEffect(() => {
    api.listEnvVars(appId).then(({ data }) => { setVars(data); setLoading(false); }).catch(() => setLoading(false));
  }, [appId]);

  async function handleReveal(varId: string) {
    if (revealed.has(varId)) {
      setRevealed((prev) => { const s = new Set(prev); s.delete(varId); return s; });
      return;
    }
    const { data } = await api.listEnvVars(appId, true);
    const found = data.find((v) => v.id === varId);
    if (found) {
      setRevealedValues((prev) => ({ ...prev, [varId]: found.value }));
      setRevealed((prev) => new Set(prev).add(varId));
    }
  }

  async function handleAdd() {
    if (!newKey.trim()) return;
    try {
      await api.setEnvVar(appId, { key: newKey.trim(), value: newValue, scope: newScope });
      const { data } = await api.listEnvVars(appId);
      setVars(data);
      setNewKey('');
      setNewValue('');
      setAdding(false);
    } catch { /* show error */ }
  }

  async function handleDelete(varId: string) {
    await api.deleteEnvVar(appId, varId);
    setVars((prev) => prev.filter((v) => v.id !== varId));
  }

  async function handleImport() {
    if (!importContent.trim()) return;
    await api.importEnv(appId, importContent, 'shared');
    const { data } = await api.listEnvVars(appId);
    setVars(data);
    setShowImport(false);
    setImportContent('');
  }

  const inputStyle = {
    height: 'var(--input-height)',
    padding: '0 var(--space-3)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-mono)',
  };

  const scopeColor = (scope: string) => scope === 'production' ? 'var(--color-primary)' : 'var(--color-text-muted)';

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading environment variables...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Manage environment variables for this application.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import .env
          </Button>
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add Variable
          </Button>
        </div>
      </div>

      {showImport && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-3)' }}>Import .env file</h4>
          <textarea
            value={importContent}
            onInput={(e) => setImportContent((e.target as HTMLTextAreaElement).value)}
            placeholder="KEY=value&#10;ANOTHER_KEY=another_value"
            rows={8}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleImport}>Import</Button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Key', 'Value', 'Scope', 'Actions'].map((h) => (
                <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vars.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                  {v.key}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  {revealed.has(v.id) ? revealedValues[v.id] || v.value : '••••••••••••••••'}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-medium)',
                    background: v.scope === 'production' ? 'var(--color-primary-subtle)' : 'var(--color-surface-alt)',
                    color: scopeColor(v.scope),
                  }}>
                    {v.scope === 'shared' ? 'All' : v.scope.charAt(0).toUpperCase() + v.scope.slice(1)}
                  </span>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                  <button onClick={() => handleReveal(v.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 'var(--space-1)' }}>
                    {revealed.has(v.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => handleDelete(v.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 'var(--space-1)' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {adding && (
              <tr>
                <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                  <input style={inputStyle} placeholder="KEY" value={newKey} onInput={(e) => setNewKey((e.target as HTMLInputElement).value)} />
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                  <input style={inputStyle} placeholder="Value" value={newValue} onInput={(e) => setNewValue((e.target as HTMLInputElement).value)} />
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope((e.target as HTMLSelectElement).value)}
                    style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }}
                  >
                    <option value="shared">All</option>
                    <option value="production">Production</option>
                    <option value="preview">Preview</option>
                  </select>
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleAdd}>Add</Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {vars.length === 0 && !adding && (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No environment variables yet.
          </div>
        )}
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
        Variables marked as secret are encrypted at rest.
      </p>
    </div>
  );
}
