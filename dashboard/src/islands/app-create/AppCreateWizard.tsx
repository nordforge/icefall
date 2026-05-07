import { useState } from 'preact/hooks';
import { api } from '../../lib/api';
import Button from '../shared/Button';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-preact';

const STEPS = ['Repository', 'Build Settings', 'Environment', 'Review'];

export default function AppCreateWizard() {
  const [step, setStep] = useState(0);
  const [deploying, setDeploying] = useState(false);
  const [form, setForm] = useState({
    name: '',
    git_repo: '',
    git_branch: 'main',
    token: '',
    build_command: '',
    output_dir: '',
    start_command: '',
    port: '3000',
    envContent: '',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'git_repo' && !form.name) {
      const name = value.split('/').pop()?.replace('.git', '') || '';
      setForm((prev) => ({ ...prev, name }));
    }
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const { data: app } = await api.createApp({
        name: form.name,
        git_repo: form.git_repo || undefined,
        git_branch: form.git_branch,
      });

      if (form.envContent.trim()) {
        await api.importEnv(app.id, form.envContent, 'shared');
      }

      const { data: deploy } = await api.triggerDeploy(app.id);
      window.location.href = `/apps/${app.id}/deploys/${deploy.id}`;
    } catch {
      setDeploying(false);
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
  };

  const labelStyle = {
    display: 'block' as const,
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)' as const,
    color: 'var(--color-text)',
    marginBottom: 'var(--space-1)',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-6)' }}>
        Create New App
      </h1>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 4,
              borderRadius: 'var(--radius-full)',
              background: i <= step ? 'var(--color-primary)' : 'var(--color-border)',
              marginBottom: 'var(--space-2)',
              transition: 'background var(--duration-normal) var(--ease-out)',
            }} />
            <span style={{ fontSize: 'var(--text-xs)', color: i <= step ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: i === step ? 'var(--weight-medium)' : 'var(--weight-normal)' }}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)' }}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={labelStyle}>App Name</label>
              <input style={inputStyle} value={form.name} onInput={(e) => update('name', (e.target as HTMLInputElement).value)} placeholder="my-awesome-app" />
            </div>
            <div>
              <label style={labelStyle}>Repository URL</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.git_repo} onInput={(e) => update('git_repo', (e.target as HTMLInputElement).value)} placeholder="https://github.com/user/repo" />
            </div>
            <div>
              <label style={labelStyle}>Branch</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.git_branch} onInput={(e) => update('git_branch', (e.target as HTMLInputElement).value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={labelStyle}>Build Command</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.build_command} onInput={(e) => update('build_command', (e.target as HTMLInputElement).value)} placeholder="bun run build" />
            </div>
            <div>
              <label style={labelStyle}>Output Directory</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.output_dir} onInput={(e) => update('output_dir', (e.target as HTMLInputElement).value)} placeholder="dist" />
            </div>
            <div>
              <label style={labelStyle}>Start Command</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.start_command} onInput={(e) => update('start_command', (e.target as HTMLInputElement).value)} placeholder="node server.js" />
            </div>
            <div>
              <label style={labelStyle}>Port</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={form.port} onInput={(e) => update('port', (e.target as HTMLInputElement).value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label style={labelStyle}>Environment Variables</label>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Paste your .env file content below. One KEY=value pair per line.
            </p>
            <textarea
              value={form.envContent}
              onInput={(e) => update('envContent', (e.target as HTMLTextAreaElement).value)}
              placeholder="DATABASE_URL=postgres://...&#10;API_KEY=secret123"
              rows={10}
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
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontWeight: 'var(--weight-semibold)' }}>Review</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Name</span>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{form.name || '—'}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>Repository</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{form.git_repo || '—'}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>Branch</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{form.git_branch}</span>
              {form.build_command && <>
                <span style={{ color: 'var(--color-text-muted)' }}>Build</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{form.build_command}</span>
              </>}
              {form.envContent && <>
                <span style={{ color: 'var(--color-text-muted)' }}>Env vars</span>
                <span>{form.envContent.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length} variable(s)</span>
              </>}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={14} /> Back
          </Button>
        ) : (
          <a href="/" style={{ textDecoration: 'none' }}><Button variant="ghost">Cancel</Button></a>
        )}
        {step < 3 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)} disabled={step === 0 && !form.name.trim()}>
            Next <ArrowRight size={14} />
          </Button>
        ) : (
          <Button variant="primary" onClick={handleDeploy} loading={deploying} disabled={!form.name.trim()}>
            <Rocket size={14} /> Deploy
          </Button>
        )}
      </div>
    </div>
  );
}
