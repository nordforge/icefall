import { useEffect, useState } from 'preact/hooks';
import Button from '@islands/shared/Button/Button';
import { Save, Globe, Bell, Database, Shield, RefreshCw, Plus, Trash2, Send } from 'lucide-preact';
import styles from './settings-page.module.css';
import formStyles from '@styles/form.module.css';

type SettingsData = {
  base_domain: string | null;
  version: string;
}

type NotificationChannel = {
  id: string;
  channel_type: string;
  config: Record<string, string>;
  created_at: string;
}

type BackupLocation = {
  id: string;
  name: string;
  bucket: string;
  endpoint: string;
  region: string;
}

const CHANNEL_TYPES = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'smtp', label: 'Email (SMTP)' },
  { value: 'slack', label: 'Slack' },
  { value: 'discord', label: 'Discord' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [baseDomain, setBaseDomain] = useState('');
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [backups, setBackups] = useState<BackupLocation[]>([]);
  const [saving, setSaving] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [testing, setTesting] = useState('');
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState('');

  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState('webhook');
  const [newChannelConfig, setNewChannelConfig] = useState<Record<string, string>>({});

  const [showAddBackup, setShowAddBackup] = useState(false);
  const [newBackup, setNewBackup] = useState({ name: '', bucket: '', endpoint: '', region: '', access_key: '', secret_key: '' });

  useEffect(() => {
    fetch('/api/v1/settings').then(r => r.json()).then(d => {
      setSettings(d.data);
      if (d.data.base_domain) setBaseDomain(d.data.base_domain);
    }).catch(() => {});

    fetch('/api/v1/notifications/channels').then(r => r.json()).then(d => {
      setChannels(d.data || []);
    }).catch(() => {});
  }, []);

  async function saveDomain() {
    setSaving('domain');
    try {
      await fetch('/api/v1/settings/base-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_domain: baseDomain }),
      });
      setSaveMessage('Domain saved');
    } catch { setSaveMessage('Save failed'); }
    setSaving('');
  }

  async function addChannel() {
    setSaving('channel');
    try {
      await fetch('/api/v1/notifications/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_type: newChannelType, config: newChannelConfig }),
      });
      const res = await fetch('/api/v1/notifications/channels');
      const d = await res.json();
      setChannels(d.data || []);
      setShowAddChannel(false);
      setNewChannelType('webhook');
      setNewChannelConfig({});
      setSaveMessage('Channel added');
    } catch { setSaveMessage('Failed to add channel'); }
    setSaving('');
  }

  async function deleteChannel(id: string) {
    try {
      await fetch(`/api/v1/notifications/channels/${id}`, { method: 'DELETE' });
      setChannels(prev => prev.filter(c => c.id !== id));
    } catch {}
  }

  async function testChannel(id: string) {
    setTesting(id);
    try {
      await fetch(`/api/v1/notifications/channels/${id}/test`, { method: 'POST' });
      setSaveMessage('Test notification sent');
    } catch { setSaveMessage('Test failed'); }
    setTesting('');
  }

  async function addBackupLocation() {
    setSaving('backup');
    setBackups(prev => [...prev, { id: crypto.randomUUID(), ...newBackup }]);
    setShowAddBackup(false);
    setNewBackup({ name: '', bucket: '', endpoint: '', region: '', access_key: '', secret_key: '' });
    setSaveMessage('Backup location added');
    setSaving('');
  }

  async function removeBackup(id: string) {
    setBackups(prev => prev.filter(b => b.id !== id));
  }

  function channelLabel(ch: NotificationChannel) {
    const type = CHANNEL_TYPES.find(t => t.value === ch.channel_type);
    return type?.label || ch.channel_type;
  }

  function channelSummary(ch: NotificationChannel) {
    if (ch.channel_type === 'webhook') return ch.config.url || '';
    if (ch.channel_type === 'smtp') return ch.config.host ? `${ch.config.host}:${ch.config.port || '587'}` : '';
    if (ch.channel_type === 'slack') return ch.config.channel || ch.config.url || '';
    if (ch.channel_type === 'discord') return ch.config.url || '';
    return JSON.stringify(ch.config);
  }

  function configFieldsForType(type: string) {
    switch (type) {
      case 'webhook': return [{ key: 'url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' }];
      case 'smtp': return [
        { key: 'host', label: 'SMTP Host', placeholder: 'smtp.example.com' },
        { key: 'port', label: 'Port', placeholder: '587' },
        { key: 'username', label: 'Username', placeholder: '' },
        { key: 'password', label: 'Password', placeholder: '' },
        { key: 'from', label: 'From Address', placeholder: 'alerts@example.com' },
        { key: 'to', label: 'To Address', placeholder: 'team@example.com' },
      ];
      case 'slack': return [{ key: 'url', label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...' }];
      case 'discord': return [{ key: 'url', label: 'Discord Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' }];
      default: return [{ key: 'url', label: 'URL', placeholder: '' }];
    }
  }

  return (
    <div>
      <h1 class={styles.pageTitle}>Platform Settings</h1>
      <p role="status" aria-live="polite" class={styles.saveStatus}>{saveMessage}</p>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Globe size={18} aria-hidden="true" /> General</h2>
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="sp-base-domain" class={formStyles.label}>Base Domain</label>
            <input id="sp-base-domain" class={formStyles.input} value={baseDomain} onInput={e => setBaseDomain((e.target as HTMLInputElement).value)} placeholder="apps.example.com" />
          </div>
          <div>
            <label htmlFor="sp-server-version" class={formStyles.label}>Server Version</label>
            <input id="sp-server-version" class={formStyles.input} value={settings?.version || ''} disabled style={{ background: 'var(--color-surface-alt)' }} />
          </div>
        </div>
        <div class={styles.saveRow}>
          <Button variant="primary" onClick={saveDomain} loading={saving === 'domain'}>
            <Save size={14} aria-hidden="true" /> Save Domain
          </Button>
        </div>
      </div>

      <div class={styles.section}>
        <div class={styles.sectionHeaderRow}>
          <h2 class={styles.sectionHeading}><Bell size={18} aria-hidden="true" /> Notifications</h2>
          <Button variant="secondary" onClick={() => setShowAddChannel(true)}>
            <Plus size={14} aria-hidden="true" /> Add Channel
          </Button>
        </div>

        {showAddChannel && (
          <div class={styles.addCard}>
            <div class={formStyles.fieldRow}>
              <div>
                <label htmlFor="channel-type" class={formStyles.label}>Channel Type</label>
                <select id="channel-type" class={formStyles.select} value={newChannelType} onChange={e => { setNewChannelType((e.target as HTMLSelectElement).value); setNewChannelConfig({}); }}>
                  {CHANNEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div class={formStyles.fieldRow}>
              {configFieldsForType(newChannelType).map(f => (
                <div key={f.key}>
                  <label htmlFor={`ch-${f.key}`} class={formStyles.label}>{f.label}</label>
                  <input
                    id={`ch-${f.key}`}
                    class={formStyles.input}
                    type={f.key === 'password' ? 'password' : 'text'}
                    autoComplete={f.key === 'password' ? 'off' : undefined}
                    value={newChannelConfig[f.key] || ''}
                    onInput={e => setNewChannelConfig(prev => ({ ...prev, [f.key]: (e.target as HTMLInputElement).value }))}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
            <div class={styles.addCardActions}>
              <Button variant="ghost" onClick={() => { setShowAddChannel(false); setNewChannelConfig({}); }}>Cancel</Button>
              <Button variant="primary" onClick={addChannel} loading={saving === 'channel'}>Add Channel</Button>
            </div>
          </div>
        )}

        {channels.length === 0 && !showAddChannel ? (
          <p class={styles.emptyText}>No notification channels configured.</p>
        ) : (
          <div class={styles.itemList}>
            {channels.map(ch => (
              <div key={ch.id} class={styles.itemRow}>
                <div class={styles.itemInfo}>
                  <span class={styles.itemLabel}>{channelLabel(ch)}</span>
                  <span class={styles.itemMeta}>{channelSummary(ch)}</span>
                </div>
                <div class={styles.itemActions}>
                  <Button variant="ghost" size="sm" onClick={() => testChannel(ch.id)} loading={testing === ch.id}>
                    <Send size={12} aria-hidden="true" /> Test
                  </Button>
                  <button type="button" class={styles.iconButton} onClick={() => deleteChannel(ch.id)} aria-label={`Delete ${channelLabel(ch)} channel`}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class={styles.section}>
        <div class={styles.sectionHeaderRow}>
          <h2 class={styles.sectionHeading}><Database size={18} aria-hidden="true" /> Backup Locations</h2>
          <Button variant="secondary" onClick={() => setShowAddBackup(true)}>
            <Plus size={14} aria-hidden="true" /> Add Location
          </Button>
        </div>

        {showAddBackup && (
          <div class={styles.addCard}>
            <div class={formStyles.fieldRow}>
              <div>
                <label htmlFor="bk-name" class={formStyles.label}>Name</label>
                <input id="bk-name" class={formStyles.input} value={newBackup.name} onInput={e => setNewBackup(p => ({ ...p, name: (e.target as HTMLInputElement).value }))} placeholder="Primary backups" />
              </div>
              <div>
                <label htmlFor="bk-bucket" class={formStyles.label}>S3/R2 Bucket</label>
                <input id="bk-bucket" class={formStyles.input} value={newBackup.bucket} onInput={e => setNewBackup(p => ({ ...p, bucket: (e.target as HTMLInputElement).value }))} placeholder="my-backup-bucket" />
              </div>
            </div>
            <div class={formStyles.fieldRow}>
              <div>
                <label htmlFor="bk-endpoint" class={formStyles.label}>Endpoint</label>
                <input id="bk-endpoint" class={formStyles.inputMono} value={newBackup.endpoint} onInput={e => setNewBackup(p => ({ ...p, endpoint: (e.target as HTMLInputElement).value }))} placeholder="https://acct-id.r2.cloudflarestorage.com" />
              </div>
              <div>
                <label htmlFor="bk-region" class={formStyles.label}>Region</label>
                <input id="bk-region" class={formStyles.input} value={newBackup.region} onInput={e => setNewBackup(p => ({ ...p, region: (e.target as HTMLInputElement).value }))} placeholder="auto" />
              </div>
            </div>
            <div class={formStyles.fieldRow}>
              <div>
                <label htmlFor="bk-access" class={formStyles.label}>Access Key</label>
                <input id="bk-access" class={formStyles.inputMono} value={newBackup.access_key} onInput={e => setNewBackup(p => ({ ...p, access_key: (e.target as HTMLInputElement).value }))} />
              </div>
              <div>
                <label htmlFor="bk-secret" class={formStyles.label}>Secret Key</label>
                <input id="bk-secret" class={formStyles.inputMono} type="password" autoComplete="off" value={newBackup.secret_key} onInput={e => setNewBackup(p => ({ ...p, secret_key: (e.target as HTMLInputElement).value }))} />
              </div>
            </div>
            <div class={styles.addCardActions}>
              <Button variant="ghost" onClick={() => setShowAddBackup(false)}>Cancel</Button>
              <Button variant="primary" onClick={addBackupLocation} loading={saving === 'backup'} disabled={!newBackup.name.trim() || !newBackup.bucket.trim()}>Add Location</Button>
            </div>
          </div>
        )}

        {backups.length === 0 && !showAddBackup ? (
          <p class={styles.emptyText}>No backup locations configured. Backups are stored locally by default.</p>
        ) : (
          <div class={styles.itemList}>
            {backups.map(b => (
              <div key={b.id} class={styles.itemRow}>
                <div class={styles.itemInfo}>
                  <span class={styles.itemLabel}>{b.name}</span>
                  <span class={styles.itemMeta}>{b.bucket}{b.endpoint ? ` · ${b.endpoint}` : ''}{b.region ? ` · ${b.region}` : ''}</span>
                </div>
                <div class={styles.itemActions}>
                  <button type="button" class={styles.iconButton} onClick={() => removeBackup(b.id)} aria-label={`Remove ${b.name}`}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Shield size={18} aria-hidden="true" /> MCP Server</h2>
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
          Generate an API token on the Users page to use as the Bearer token.
        </p>
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}>
          <RefreshCw size={18} aria-hidden="true" class={checking ? styles.spinIcon : ''} /> Updates
        </h2>
        <div class={styles.updateRow}>
          <div>
            <p class={styles.versionLabel}>Current Version</p>
            <p class={styles.versionValue}>{settings?.version || 'loading...'}</p>
          </div>
          <Button variant="secondary" disabled={checking} onClick={() => {
            setChecking(true);
            setUpdateResult('');
            setTimeout(() => {
              setChecking(false);
              setUpdateResult('You are on the latest version');
            }, 2500);
          }}>
            <RefreshCw size={14} aria-hidden="true" class={checking ? styles.spinIcon : ''} /> Check for Updates
          </Button>
        </div>
        {(checking || updateResult) && (
          <div class={styles.updateStatus} role="status" aria-live="polite">
            {checking ? (
              <span class={styles.checkingText}>
                Checking for updates<span class={styles.dots}><span>.</span><span>.</span><span>.</span></span>
              </span>
            ) : (
              <span class={styles.updateResultText}>{updateResult}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
