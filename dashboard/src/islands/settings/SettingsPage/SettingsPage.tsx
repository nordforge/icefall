import { useEffect, useState } from 'preact/hooks';
import Button from '@islands/shared/Button/Button';
import { Save, Globe, Bell, Database, Shield, RefreshCw } from 'lucide-preact';
import styles from './settings-page.module.css';
import formStyles from '@styles/form.module.css';

type SettingsData = {
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
  const [saveMessage, setSaveMessage] = useState('');

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
      setSaveMessage('Saved');
    } catch {
      setSaveMessage('Save failed');
    }
    setSaving('');
  }

  return (
    <div>
      <h1 class={styles.pageTitle}>
        Platform Settings
      </h1>
      {/* a11y [WCAG 4.1.3]: announce save result to AT */}
      <p role="status" aria-live="polite" class={styles.saveStatus}>{saveMessage}</p>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Globe size={18} /> General</h2>
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="sp-base-domain" class={formStyles.label}>Base Domain</label>
            <input id="sp-base-domain" class={formStyles.input} value={baseDomain} onInput={(e) => setBaseDomain((e.target as HTMLInputElement).value)} placeholder="apps.example.com" />
          </div>
          <div>
            <label htmlFor="sp-server-version" class={formStyles.label}>Server Version</label>
            <input id="sp-server-version" class={formStyles.input} value={settings?.version || ''} disabled style={{ background: 'var(--color-surface-alt)' }} />
          </div>
        </div>
        <div class={styles.saveRow}>
          <Button variant="primary" onClick={() => saveSection('domain')} loading={saving === 'domain'}>
            <Save size={14} /> Save Domain
          </Button>
        </div>
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Bell size={18} /> Notifications</h2>
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="sp-smtp-host" class={formStyles.label}>SMTP Host</label>
            <input id="sp-smtp-host" class={formStyles.input} value={smtpHost} onInput={(e) => setSmtpHost((e.target as HTMLInputElement).value)} placeholder="smtp.example.com" />
          </div>
          <div>
            <label htmlFor="sp-smtp-port" class={formStyles.label}>SMTP Port</label>
            <input id="sp-smtp-port" class={formStyles.input} value={smtpPort} onInput={(e) => setSmtpPort((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div class={styles.fieldRow}>
          <label htmlFor="sp-webhook-url" class={formStyles.label}>Webhook URL</label>
          <input id="sp-webhook-url" class={formStyles.inputMono} value={webhookUrl} onInput={(e) => setWebhookUrl((e.target as HTMLInputElement).value)} placeholder="https://hooks.slack.com/..." />
        </div>
        <div class={styles.saveRow}>
          <Button variant="primary" onClick={() => saveSection('notifications')} loading={saving === 'notifications'}>
            <Save size={14} /> Save Notifications
          </Button>
        </div>
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Database size={18} /> Backups</h2>
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="sp-s3-bucket" class={formStyles.label}>S3/R2 Bucket</label>
            <input id="sp-s3-bucket" class={formStyles.input} value={s3Bucket} onInput={(e) => setS3Bucket((e.target as HTMLInputElement).value)} placeholder="my-backup-bucket" />
          </div>
          <div>
            <label htmlFor="sp-s3-endpoint" class={formStyles.label}>S3 Endpoint (for R2)</label>
            <input id="sp-s3-endpoint" class={formStyles.inputMono} value={s3Endpoint} onInput={(e) => setS3Endpoint((e.target as HTMLInputElement).value)} placeholder="https://acct-id.r2.cloudflarestorage.com" />
          </div>
        </div>
        <div class={styles.saveRow}>
          <Button variant="primary" onClick={() => saveSection('backups')} loading={saving === 'backups'}>
            <Save size={14} /> Save Backup Config
          </Button>
        </div>
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Shield size={18} /> MCP Server</h2>
        <p class={styles.mcpDescription}>
          Connect AI agents to manage your apps. Add this to your Claude Code settings:
        </p>
        <div class={styles.codeBlock}>
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
        <p class={styles.hint}>
          Generate an API token in your profile settings to use as the Bearer token.
        </p>
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><RefreshCw size={18} /> Updates</h2>
        <div class={styles.updateRow}>
          <div>
            <p class={styles.versionLabel}>Current Version</p>
            <p class={styles.versionValue}>{settings?.version || 'loading...'}</p>
          </div>
          <Button variant="secondary">Check for Updates</Button>
        </div>
      </div>
    </div>
  );
}
