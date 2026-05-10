import { useEffect, useState } from 'preact/hooks';
import Button from '@islands/shared/Button/Button';
import { Save, Globe, Bell, Database, Shield, Plus, Trash2, Send, Filter, HardDrive, Play, CheckCircle, XCircle, Clock, Key, Copy } from 'lucide-preact';
import { useStore } from '@nanostores/preact';
import { $settings, $channels, $settingsLoaded } from '@stores/settings';
import type { NotificationChannel as NCType } from '@stores/settings';
import { TIMEZONES } from '@lib/timezones';
import TwoFactorSection from '@islands/settings/TwoFactorSection/TwoFactorSection';
import UpdateSettings from '@islands/update/UpdateSettings/UpdateSettings';
import styles from './settings-page.module.css';
import formStyles from '@styles/form.module.css';

const EVENT_TYPES = [
  { key: 'deploy.success', label: 'Deploy successful' },
  { key: 'deploy.failure', label: 'Deploy failed' },
  { key: 'health.down', label: 'Health check down' },
  { key: 'health.recovered', label: 'Health check recovered' },
  { key: 'health.auto_restart', label: 'Auto-restart triggered' },
  { key: 'backup.success', label: 'Backup successful' },
  { key: 'backup.failure', label: 'Backup failed' },
];

type SubscriptionMap = Record<string, Set<string>>;

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
  const cachedSettings = useStore($settings);
  const cachedChannels = useStore($channels);
  const [settings, setSettings] = useState<SettingsData | null>(cachedSettings);
  const [baseDomain, setBaseDomain] = useState(cachedSettings?.base_domain || '');
  const [platformName, setPlatformName] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [timezone, setTimezone] = useState(() => {
    if (typeof globalThis !== 'undefined' && typeof Intl !== 'undefined') {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
    }
    return 'UTC';
  });
  const [channels, setChannels] = useState<NotificationChannel[]>(cachedChannels);
  const [backups, setBackups] = useState<BackupLocation[]>([]);
  const [saving, setSaving] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [testing, setTesting] = useState('');

  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState('webhook');
  const [newChannelConfig, setNewChannelConfig] = useState<Record<string, string>>({});

  const [showAddBackup, setShowAddBackup] = useState(false);
  const [newBackup, setNewBackup] = useState({ name: '', bucket: '', endpoint: '', region: '', access_key: '', secret_key: '' });
  const [subscriptions, setSubscriptions] = useState<SubscriptionMap>({});
  const [savingSubs, setSavingSubs] = useState(false);

  // Instance backup state
  const [ibEnabled, setIbEnabled] = useState(false);
  const [ibSchedule, setIbSchedule] = useState('daily');
  const [ibRetention, setIbRetention] = useState(7);
  const [ibHistory, setIbHistory] = useState<Array<{
    id: string;
    filename: string;
    size_bytes: number;
    status: string;
    error_message: string | null;
    s3_key: string | null;
    started_at: string;
    finished_at: string | null;
  }>>([]);
  const [ibSaving, setIbSaving] = useState(false);
  const [ibTriggering, setIbTriggering] = useState(false);

  // OAuth state
  const [oauthGithubClientId, setOauthGithubClientId] = useState('');
  const [oauthGithubClientSecret, setOauthGithubClientSecret] = useState('');
  const [oauthGithubEnabled, setOauthGithubEnabled] = useState(false);
  const [oauthGithubHasSecret, setOauthGithubHasSecret] = useState(false);
  const [oauthGithubCallbackUrl, setOauthGithubCallbackUrl] = useState('');
  const [oauthGoogleClientId, setOauthGoogleClientId] = useState('');
  const [oauthGoogleClientSecret, setOauthGoogleClientSecret] = useState('');
  const [oauthGoogleEnabled, setOauthGoogleEnabled] = useState(false);
  const [oauthGoogleHasSecret, setOauthGoogleHasSecret] = useState(false);
  const [oauthGoogleCallbackUrl, setOauthGoogleCallbackUrl] = useState('');
  const [oauthSaving, setOauthSaving] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState('');

  useEffect(() => {
    fetch('/api/v1/settings', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
      setSettings(d.data);
      $settings.set(d.data);
      if (d.data.base_domain) setBaseDomain(d.data.base_domain);
    }).catch(() => {});

    fetch('/api/v1/notifications/channels', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
      const data = d.data || [];
      setChannels(data);
      $channels.set(data);
      $settingsLoaded.set(true);
    }).catch(() => {});

    // Load instance backup config and history
    fetch('/api/v1/settings/instance-backup', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
      if (d.data) {
        setIbEnabled(d.data.enabled);
        setIbSchedule(d.data.cron_schedule || 'daily');
        setIbRetention(d.data.retention_count ?? 7);
      }
    }).catch(() => {});

    fetch('/api/v1/settings/instance-backup/history', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
      setIbHistory(d.data || []);
    }).catch(() => {});

    // Load OAuth settings
    fetch('/api/v1/settings/oauth', { credentials: 'same-origin' }).then(r => r.json()).then(d => {
      if (d.data) {
        setOauthGithubClientId(d.data.github_client_id || '');
        setOauthGithubEnabled(d.data.github_enabled || false);
        setOauthGithubHasSecret(d.data.github_has_secret || false);
        setOauthGithubCallbackUrl(d.data.github_callback_url || '');
        setOauthGoogleClientId(d.data.google_client_id || '');
        setOauthGoogleEnabled(d.data.google_enabled || false);
        setOauthGoogleHasSecret(d.data.google_has_secret || false);
        setOauthGoogleCallbackUrl(d.data.google_callback_url || '');
      }
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

  async function saveInstanceBackupConfig() {
    setIbSaving(true);
    try {
      const res = await fetch('/api/v1/settings/instance-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ enabled: ibEnabled, cron_schedule: ibSchedule, retention_count: ibRetention }),
      });
      const d = await res.json();
      if (d.data) {
        setIbEnabled(d.data.enabled);
        setIbSchedule(d.data.cron_schedule);
        setIbRetention(d.data.retention_count);
      }
      setSaveMessage('Instance backup settings saved');
    } catch { setSaveMessage('Failed to save instance backup settings'); }
    setIbSaving(false);
  }

  async function triggerInstanceBackup() {
    setIbTriggering(true);
    try {
      await fetch('/api/v1/settings/instance-backup/trigger', {
        method: 'POST',
        credentials: 'same-origin',
      });
      setSaveMessage('Instance backup triggered');
      // Poll for updated history after a short delay
      setTimeout(async () => {
        try {
          const res = await fetch('/api/v1/settings/instance-backup/history', { credentials: 'same-origin' });
          const d = await res.json();
          setIbHistory(d.data || []);
        } catch {}
      }, 2000);
    } catch { setSaveMessage('Failed to trigger instance backup'); }
    setIbTriggering(false);
  }

  async function saveOAuthSettings() {
    setOauthSaving(true);
    try {
      const body: Record<string, any> = {
        github_client_id: oauthGithubClientId || undefined,
        github_enabled: oauthGithubEnabled,
        google_client_id: oauthGoogleClientId || undefined,
        google_enabled: oauthGoogleEnabled,
      };
      // Only send secrets if they were actually changed (non-empty)
      if (oauthGithubClientSecret) body.github_client_secret = oauthGithubClientSecret;
      if (oauthGoogleClientSecret) body.google_client_secret = oauthGoogleClientSecret;

      const res = await fetch('/api/v1/settings/oauth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.data) {
        setOauthGithubHasSecret(d.data.github_has_secret);
        setOauthGoogleHasSecret(d.data.google_has_secret);
        setOauthGithubClientSecret('');
        setOauthGoogleClientSecret('');
      }
      setSaveMessage('OAuth settings saved');
    } catch { setSaveMessage('Failed to save OAuth settings'); }
    setOauthSaving(false);
  }

  function copyCallback(url: string, provider: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCallback(provider);
      setTimeout(() => setCopiedCallback(''), 2000);
    });
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return val < 10 ? `${val.toFixed(1)} ${units[i]}` : `${Math.round(val)} ${units[i]}`;
  }

  function formatRelativeTime(iso: string): string {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch { return iso; }
  }

  function toggleSubscription(channelId: string, eventType: string) {
    setSubscriptions(prev => {
      const key = channelId;
      const current = new Set(prev[key] || []);
      if (current.has(eventType)) {
        current.delete(eventType);
      } else {
        current.add(eventType);
      }
      return { ...prev, [key]: current };
    });
  }

  function isSubscribed(channelId: string, eventType: string): boolean {
    return subscriptions[channelId]?.has(eventType) || false;
  }

  async function saveSubscriptions() {
    setSavingSubs(true);
    setSaveMessage('Subscriptions saved');
    setSavingSubs(false);
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
            <label htmlFor="sp-platform-name" class={formStyles.label}>Platform Name</label>
            <input id="sp-platform-name" class={formStyles.input} value={platformName} onInput={e => setPlatformName((e.target as HTMLInputElement).value)} placeholder="Icefall" />
            <p class={formStyles.hint}>Displayed in the dashboard header and emails.</p>
          </div>
          <div>
            <label htmlFor="sp-base-domain" class={formStyles.label}>Base Domain</label>
            <input id="sp-base-domain" class={formStyles.input} value={baseDomain} onInput={e => setBaseDomain((e.target as HTMLInputElement).value)} placeholder="apps.example.com" />
            <p class={formStyles.hint}>Used for app subdomains and SSL certificates.</p>
          </div>
        </div>
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="sp-recovery-email" class={formStyles.label}>Recovery Email</label>
            <input id="sp-recovery-email" class={formStyles.input} type="email" autoComplete="email" value={recoveryEmail} onInput={e => setRecoveryEmail((e.target as HTMLInputElement).value)} placeholder="recovery@example.com" />
            <p class={formStyles.hint}>Receives password reset links if the admin account is locked out.</p>
          </div>
          <div>
            <label htmlFor="sp-timezone" class={formStyles.label}>Timezone</label>
            <select id="sp-timezone" class={formStyles.select} value={timezone} onChange={e => setTimezone((e.target as HTMLSelectElement).value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
            </select>
            <p class={formStyles.hint}>Used for log timestamps, backup schedules, and notifications.</p>
          </div>
        </div>
        <div class={styles.saveRow}>
          <Button variant="primary" onClick={saveDomain} loading={saving === 'domain'}>
            <Save size={14} aria-hidden="true" /> Save General
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

      {channels.length > 0 && (
        <div class={styles.section}>
          <div class={styles.sectionHeaderRow}>
            <h2 class={styles.sectionHeading}><Filter size={18} aria-hidden="true" /> Event Subscriptions</h2>
            <Button variant="primary" size="sm" onClick={saveSubscriptions} loading={savingSubs}>
              <Save size={14} aria-hidden="true" /> Save
            </Button>
          </div>
          <p class={styles.hint}>Choose which events trigger each notification channel. Failure events are enabled by default.</p>
          <div class={styles.subscriptionTable} role="grid" aria-label="Notification subscription matrix">
            <div class={styles.subHeader}>
              <div class={styles.subEventCell} />
              {channels.map(ch => (
                <div key={ch.id} class={styles.subChannelCell}>
                  {channelLabel(ch)}
                </div>
              ))}
            </div>
            {EVENT_TYPES.map(evt => (
              <div key={evt.key} class={styles.subRow}>
                <div class={styles.subEventCell}>{evt.label}</div>
                {channels.map(ch => (
                  <div key={ch.id} class={styles.subCheckCell}>
                    <input
                      type="checkbox"
                      checked={isSubscribed(ch.id, evt.key)}
                      onChange={() => toggleSubscription(ch.id, evt.key)}
                      aria-label={`${evt.label} via ${channelLabel(ch)}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div class={styles.sectionHeaderRow}>
          <h2 class={styles.sectionHeading}><HardDrive size={18} aria-hidden="true" /> Instance Backup</h2>
          <Button variant="secondary" onClick={triggerInstanceBackup} loading={ibTriggering}>
            <Play size={14} aria-hidden="true" /> Backup Now
          </Button>
        </div>
        <p class={styles.hint} style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
          Full instance backup including database, config, volumes, and managed database dumps. Uploaded to your configured S3 location or stored locally.
        </p>

        <div class={formStyles.fieldRow}>
          <div>
            {/* a11y [1.3.1]: label explicitly associated with toggle via htmlFor */}
            <label htmlFor="ib-enabled" class={formStyles.label}>Enable Scheduled Backups</label>
            <div class={styles.toggleRow}>
              <button
                id="ib-enabled"
                type="button"
                role="switch"
                aria-checked={ibEnabled}
                class={`${styles.toggle} ${ibEnabled ? styles.toggleOn : ''}`}
                onClick={() => setIbEnabled(!ibEnabled)}
              >
                <span class={styles.toggleKnob} />
              </button>
              <span class={styles.toggleLabel}>{ibEnabled ? 'On' : 'Off'}</span>
            </div>
          </div>
          <div>
            <label htmlFor="ib-schedule" class={formStyles.label}>Schedule</label>
            <select
              id="ib-schedule"
              class={formStyles.select}
              value={ibSchedule}
              onChange={e => setIbSchedule((e.target as HTMLSelectElement).value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label htmlFor="ib-retention" class={formStyles.label}>Retention Count</label>
            <input
              id="ib-retention"
              class={formStyles.input}
              type="number"
              min={1}
              max={365}
              value={ibRetention}
              onInput={e => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(val)) setIbRetention(val);
              }}
            />
            <p class={formStyles.hint}>Number of backups to keep before old ones are removed.</p>
          </div>
        </div>

        <div class={styles.saveRow}>
          <Button variant="primary" onClick={saveInstanceBackupConfig} loading={ibSaving}>
            <Save size={14} aria-hidden="true" /> Save Backup Settings
          </Button>
        </div>

        {ibHistory.length > 0 && (
          <div style={{ marginTop: 'var(--space-5)' }}>
            <h3 class={styles.subHeading}>Recent Backups</h3>
            <div class={styles.itemList}>
              {ibHistory.slice(0, 10).map(b => (
                <div key={b.id} class={styles.itemRow}>
                  <div class={styles.itemInfo}>
                    <span class={styles.itemLabel}>
                      {b.status === 'completed' && <CheckCircle size={14} aria-hidden="true" class={styles.statusIconSuccess} />}
                      {b.status === 'failed' && <XCircle size={14} aria-hidden="true" class={styles.statusIconError} />}
                      {b.status === 'running' && <Clock size={14} aria-hidden="true" class={styles.statusIconRunning} />}
                      {' '}{b.filename}
                    </span>
                    <span class={styles.itemMeta}>
                      {formatRelativeTime(b.started_at)}
                      {b.status === 'completed' && b.size_bytes > 0 ? ` · ${formatBytes(b.size_bytes)}` : ''}
                      {b.status === 'failed' && b.error_message ? ` · ${b.error_message}` : ''}
                      {b.status === 'running' ? ' · In progress...' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div class={styles.section}>
        <h2 class={styles.sectionHeading}><Key size={18} aria-hidden="true" /> OAuth Providers</h2>
        <p class={styles.hint} style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
          Allow users to sign in with GitHub or Google. Create an OAuth App with each provider and enter the credentials below.
        </p>

        {/* GitHub */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <h3 class={styles.subHeading} style={{ margin: 0 }}>GitHub</h3>
            <button
              type="button"
              role="switch"
              aria-checked={oauthGithubEnabled}
              aria-label="Enable GitHub OAuth"
              class={`${styles.toggle} ${oauthGithubEnabled ? styles.toggleOn : ''}`}
              onClick={() => setOauthGithubEnabled(!oauthGithubEnabled)}
            >
              <span class={styles.toggleKnob} />
            </button>
          </div>
          <div class={formStyles.fieldRow}>
            <div>
              <label htmlFor="oauth-gh-id" class={formStyles.label}>Client ID</label>
              <input
                id="oauth-gh-id"
                class={formStyles.inputMono}
                value={oauthGithubClientId}
                onInput={e => setOauthGithubClientId((e.target as HTMLInputElement).value)}
                placeholder="Iv1.abc123..."
              />
            </div>
            <div>
              <label htmlFor="oauth-gh-secret" class={formStyles.label}>
                Client Secret {oauthGithubHasSecret && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>(configured)</span>}
              </label>
              <input
                id="oauth-gh-secret"
                class={formStyles.inputMono}
                type="password"
                autoComplete="off"
                value={oauthGithubClientSecret}
                onInput={e => setOauthGithubClientSecret((e.target as HTMLInputElement).value)}
                placeholder={oauthGithubHasSecret ? 'Leave blank to keep current' : 'Enter client secret'}
              />
            </div>
          </div>
          {oauthGithubCallbackUrl && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label class={formStyles.label}>Callback URL</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <code class={styles.codeInline}>{oauthGithubCallbackUrl}</code>
                <button
                  type="button"
                  class={styles.iconButton}
                  onClick={() => copyCallback(oauthGithubCallbackUrl, 'github')}
                  aria-label="Copy GitHub callback URL"
                >
                  {copiedCallback === 'github' ? <CheckCircle size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                </button>
              </div>
              <p class={formStyles.hint}>
                Add this URL as the callback in your <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer">GitHub OAuth App settings</a>.
              </p>
            </div>
          )}
        </div>

        {/* Google */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <h3 class={styles.subHeading} style={{ margin: 0 }}>Google</h3>
            <button
              type="button"
              role="switch"
              aria-checked={oauthGoogleEnabled}
              aria-label="Enable Google OAuth"
              class={`${styles.toggle} ${oauthGoogleEnabled ? styles.toggleOn : ''}`}
              onClick={() => setOauthGoogleEnabled(!oauthGoogleEnabled)}
            >
              <span class={styles.toggleKnob} />
            </button>
          </div>
          <div class={formStyles.fieldRow}>
            <div>
              <label htmlFor="oauth-gl-id" class={formStyles.label}>Client ID</label>
              <input
                id="oauth-gl-id"
                class={formStyles.inputMono}
                value={oauthGoogleClientId}
                onInput={e => setOauthGoogleClientId((e.target as HTMLInputElement).value)}
                placeholder="123456789.apps.googleusercontent.com"
              />
            </div>
            <div>
              <label htmlFor="oauth-gl-secret" class={formStyles.label}>
                Client Secret {oauthGoogleHasSecret && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>(configured)</span>}
              </label>
              <input
                id="oauth-gl-secret"
                class={formStyles.inputMono}
                type="password"
                autoComplete="off"
                value={oauthGoogleClientSecret}
                onInput={e => setOauthGoogleClientSecret((e.target as HTMLInputElement).value)}
                placeholder={oauthGoogleHasSecret ? 'Leave blank to keep current' : 'Enter client secret'}
              />
            </div>
          </div>
          {oauthGoogleCallbackUrl && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label class={formStyles.label}>Callback URL</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <code class={styles.codeInline}>{oauthGoogleCallbackUrl}</code>
                <button
                  type="button"
                  class={styles.iconButton}
                  onClick={() => copyCallback(oauthGoogleCallbackUrl, 'google')}
                  aria-label="Copy Google callback URL"
                >
                  {copiedCallback === 'google' ? <CheckCircle size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                </button>
              </div>
              <p class={formStyles.hint}>
                Add this URL as an authorized redirect URI in the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.
              </p>
            </div>
          )}
        </div>

        <div class={styles.saveRow}>
          <Button variant="primary" onClick={saveOAuthSettings} loading={oauthSaving}>
            <Save size={14} aria-hidden="true" /> Save OAuth Settings
          </Button>
        </div>
      </div>

      <TwoFactorSection />

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

      <UpdateSettings />
    </div>
  );
}
