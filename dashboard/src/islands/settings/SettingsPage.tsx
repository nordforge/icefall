import { useEffect, useState } from 'preact/hooks';
import Button from '../shared/Button';
import { Save, Globe, Server, Bell, Database, Shield, RefreshCw } from 'lucide-preact';

interface SettingsData {
  base_domain: string | null;
  version: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [baseDomain, setBaseDomain] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    fetch('/api/v1/settings')
      .then((r) => r.json())
      .then((d) => {
        const data = d.data;
        setSettings(data);
        if (data.base_domain) setBaseDomain(data.base_domain);
      })
      .catch(() => {});
  }, []);

  async function saveSection(section: string) {
    setSaving(section);
    try {
      if (section === 'domain') {
        await fetch('/api/v1/settings/base-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_domain: baseDomain }),
        });
      } else if (section === 'notifications') {
        if (webhookUrl.trim()) {
          await fetch('/api/v1/notifications/channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_type: 'webhook', config: { url: webhookUrl } }),
          });
        }
      }
    } catch {}
    setSaving('');
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

  const sectionStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-5)',
  };

  const headingStyle = {
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-semibold)' as const,
    marginBottom: 'var(--space-4)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 'var(--space-2)',
  };

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-6)' }}>
        Platform Settings
      </h1>

      <div style={sectionStyle}>
        <h3 style={headingStyle}><Globe size={18} /> General</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>Base Domain</label>
            <input style={inputStyle} value={baseDomain} onInput={(e) => setBaseDomain((e.target as HTMLInputElement).value)} placeholder="apps.example.com" />
          </div>
          <div>
            <label style={labelStyle}>Server Version</label>
            <input style={{ ...inputStyle, background: 'var(--color-surface-alt)' }} value={settings?.version || ''} disabled />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => saveSection('domain')} loading={saving === 'domain'}>
            <Save size={14} /> Save Domain
          </Button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}><Bell size={18} /> Notifications</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>SMTP Host</label>
            <input style={inputStyle} value={smtpHost} onInput={(e) => setSmtpHost((e.target as HTMLInputElement).value)} placeholder="smtp.example.com" />
          </div>
          <div>
            <label style={labelStyle}>SMTP Port</label>
            <input style={inputStyle} value={smtpPort} onInput={(e) => setSmtpPort((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <label style={labelStyle}>Webhook URL</label>
          <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={webhookUrl} onInput={(e) => setWebhookUrl((e.target as HTMLInputElement).value)} placeholder="https://hooks.slack.com/..." />
        </div>
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => saveSection('notifications')} loading={saving === 'notifications'}>
            <Save size={14} /> Save Notifications
          </Button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}><Database size={18} /> Backups</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>S3/R2 Bucket</label>
            <input style={inputStyle} value={s3Bucket} onInput={(e) => setS3Bucket((e.target as HTMLInputElement).value)} placeholder="my-backup-bucket" />
          </div>
          <div>
            <label style={labelStyle}>S3 Endpoint (for R2)</label>
            <input style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }} value={s3Endpoint} onInput={(e) => setS3Endpoint((e.target as HTMLInputElement).value)} placeholder="https://acct-id.r2.cloudflarestorage.com" />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => saveSection('backups')} loading={saving === 'backups'}>
            <Save size={14} /> Save Backup Config
          </Button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}><Shield size={18} /> MCP Server</h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
          Connect AI agents to manage your apps. Add this to your Claude Code settings:
        </p>
        <div style={{
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
        }}>
{`{
  "mcpServers": {
    "icefall": {
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}`}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          Generate an API token in your profile settings to use as the Bearer token.
        </p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}><RefreshCw size={18} /> Updates</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>Current Version</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{settings?.version || 'loading...'}</p>
          </div>
          <Button variant="secondary">Check for Updates</Button>
        </div>
      </div>
    </div>
  );
}
