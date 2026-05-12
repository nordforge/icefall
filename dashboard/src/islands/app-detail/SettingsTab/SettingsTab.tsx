import { useEffect, useState, useRef } from 'preact/hooks';
import type { App, Project, Server, DeployMode } from '@lib/types';
import { api } from '@lib/api';
import { addToast } from '@stores/toast';
import Button from '@islands/shared/Button/Button';
import Select from '@islands/shared/Select/Select';
import ConfirmDialog from '@islands/shared/ConfirmDialog/ConfirmDialog';
import { Save, AlertTriangle, Square, Play, RotateCw, Trash2, Webhook, Copy, Check, X, Plus, HardDrive, FolderOpen, Cloud, Search, Zap, ArrowRightLeft } from 'lucide-preact';
import VolumeBrowser from '@islands/app-detail/VolumeBrowser/VolumeBrowser';
import styles from './settings-tab.module.css';
import formStyles from '@styles/form.module.css';

type Props = {
  app: App;
  servers?: Server[];
}

const TAG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const TAG_MAX_LENGTH = 30;

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

type LocalVolume = {
  type: 'local';
  source: string;
  target: string;
  read_only: boolean;
};

type S3Volume = {
  type: 's3';
  bucket: string;
  endpoint: string;
  access_key: string;
  secret_key: string;
  region: string;
  target: string;
  read_only: boolean;
};

type VolumeEntry = LocalVolume | S3Volume;

function parseVolumes(raw: string | null): VolumeEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v: any): VolumeEntry => {
      if (v.type === 's3') {
        return {
          type: 's3',
          bucket: v.bucket || '',
          endpoint: v.endpoint || '',
          access_key: v.access_key || '',
          secret_key: v.secret_key || '',
          region: v.region || 'auto',
          target: v.target || '',
          read_only: !!v.read_only,
        };
      }
      // Legacy entries without a type field are treated as local.
      return {
        type: 'local',
        source: v.source || '',
        target: v.target || '',
        read_only: !!v.read_only,
      };
    });
  } catch { return []; }
}

function parseResourceLimits(raw: string | null): { memoryMb: string; cpuShares: string } {
  if (!raw) return { memoryMb: '', cpuShares: '' };
  try {
    const parsed = JSON.parse(raw);
    const memoryMb = parsed.memory_bytes ? String(Math.round(parsed.memory_bytes / (1024 * 1024))) : '';
    const cpuShares = parsed.cpu_shares ? String(parsed.cpu_shares) : '';
    return { memoryMb, cpuShares };
  } catch { return { memoryMb: '', cpuShares: '' }; }
}

export default function SettingsTab({ app, servers = [] }: Props) {
  const [form, setForm] = useState(() => {
    let buildCommand = '';
    try {
      const parsed = app.build_config ? JSON.parse(app.build_config) : {};
      buildCommand = parsed.build_command || '';
    } catch { /* malformed build_config JSON */ }
    const limits = parseResourceLimits(app.resource_limits);
    return {
      name: app.name,
      git_repo: app.git_repo || '',
      git_branch: app.git_branch,
      build_command: buildCommand,
      memory_mb: limits.memoryMb,
      cpu_shares: limits.cpuShares,
      preview_enabled: app.preview_enabled,
      preview_branch_pattern: app.preview_branch_pattern || '*',
    };
  });
  const [deployMode, setDeployMode] = useState<DeployMode>(
    (app.deploy_mode as DeployMode) || 'auto'
  );
  const [tags, setTags] = useState<string[]>(() => parseTags(app.tags));
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [volumes, setVolumes] = useState<VolumeEntry[]>(() => parseVolumes(app.volumes));
  const [volumeErrors, setVolumeErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [starting, setStarting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [copied, setCopied] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(app.project_id || '');
  const [browsingVolume, setBrowsingVolume] = useState<number | null>(null);
  const [migrateTarget, setMigrateTarget] = useState('');
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [migrateAck, setMigrateAck] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const copiedTimeoutRef = useRef<number>();

  const multiServer = servers.length >= 2;
  const currentServer = servers.find((s) => s.id === app.server_id);
  const availableTargets = servers.filter((s) => s.id !== app.server_id && s.status === 'online');

  useEffect(() => {
    api.listProjects().then(({ data }) => setProjects(data)).catch(() => {});

    return () => clearTimeout(copiedTimeoutRef.current);
  }, []);

  const webhookBaseUrl = window.location.origin + '/api/v1/webhooks/' + app.id;
  const hasWebhookSecret = !!app.webhook_secret;

  async function handleSave() {
    setSaving(true);
    try {
      const resourceLimits: Record<string, number> = {};
      if (form.memory_mb) resourceLimits.memory_bytes = parseInt(form.memory_mb, 10) * 1024 * 1024;
      if (form.cpu_shares) resourceLimits.cpu_shares = parseInt(form.cpu_shares, 10);

      const validVolumes = volumes.filter((v) => {
        if (v.type === 's3') return v.bucket && v.target;
        return v.source && v.target;
      });

      await api.updateApp(app.id, {
        name: form.name,
        git_repo: form.git_repo || undefined,
        git_branch: form.git_branch,
        resource_limits: Object.keys(resourceLimits).length > 0 ? JSON.stringify(resourceLimits) : undefined,
        preview_enabled: form.preview_enabled,
        preview_branch_pattern: form.preview_enabled ? form.preview_branch_pattern : undefined,
        tags: tags.join(','),
        volumes: validVolumes.length > 0 ? JSON.stringify(validVolumes) : null,
        project_id: selectedProjectId || null,
        deploy_mode: deployMode,
      } as any);
      setSaveMessage('Saved');
    } catch {
      setSaveMessage('Save failed');
    }
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

  async function handleMigrate() {
    if (!migrateTarget || !migrateAck) return;
    setMigrating(true);
    try {
      await api.migrateApp(app.id, migrateTarget, migrateAck);
      addToast('success', `Migration to ${availableTargets.find(s => s.id === migrateTarget)?.name || 'server'} started`);
      setShowMigrateDialog(false);
      window.location.href = `/apps/${app.id}/deploys`;
    } catch (err: any) {
      addToast('error', err.message || 'Migration failed');
    }
    setMigrating(false);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = window.setTimeout(() => setCopied(''), 2000);
  }

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    setTagError('');
    if (!value) return;
    if (value.length > TAG_MAX_LENGTH) {
      setTagError(`Tag must be ${TAG_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (!TAG_PATTERN.test(value)) {
      setTagError('Tags can only contain lowercase letters, numbers, and hyphens.');
      return;
    }
    if (tags.includes(value)) {
      setTagInput('');
      return;
    }
    setTags([...tags, value]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function addVolume(volumeType: 'local' | 's3' = 'local') {
    if (volumeType === 's3') {
      setVolumes([...volumes, {
        type: 's3',
        bucket: '',
        endpoint: '',
        access_key: '',
        secret_key: '',
        region: 'auto',
        target: '',
        read_only: false,
      }]);
    } else {
      setVolumes([...volumes, { type: 'local', source: '', target: '', read_only: false }]);
    }
  }

  function removeVolume(index: number) {
    setVolumes(volumes.filter((_, i) => i !== index));
    setVolumeErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function updateVolume(index: number, field: string, value: string | boolean) {
    const updated = volumes.map((v, i) => {
      if (i !== index) return v;
      return { ...v, [field]: value } as VolumeEntry;
    });
    setVolumes(updated);

    if (field === 'target') {
      const target = value as string;
      if (target && !target.startsWith('/')) {
        setVolumeErrors((prev) => ({ ...prev, [index]: 'Container path must start with /' }));
      } else {
        setVolumeErrors((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    }
  }

  function switchVolumeType(index: number, newType: 'local' | 's3') {
    const updated = volumes.map((v, i): VolumeEntry => {
      if (i !== index) return v;
      if (newType === 's3') {
        return {
          type: 's3',
          bucket: '',
          endpoint: '',
          access_key: '',
          secret_key: '',
          region: 'auto',
          target: v.target,
          read_only: v.read_only,
        };
      }
      return {
        type: 'local',
        source: '',
        target: v.target,
        read_only: v.read_only,
      };
    });
    setVolumes(updated);
  }

  return (
    <div class={styles.container}>
      {/* General Settings */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>General Settings</h2>
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="settings-app-name" class={formStyles.label}>App Name</label>
            <input id="settings-app-name" class={formStyles.input} value={form.name} onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label htmlFor="settings-git-repo" class={formStyles.label}>Git Repository</label>
            <input id="settings-git-repo" class={formStyles.inputMono} value={form.git_repo} onInput={(e) => setForm({ ...form, git_repo: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label htmlFor="settings-branch" class={formStyles.label}>Branch</label>
            <input id="settings-branch" class={formStyles.inputMono} value={form.git_branch} onInput={(e) => setForm({ ...form, git_branch: (e.target as HTMLInputElement).value })} />
          </div>
          <div>
            <label htmlFor="settings-build-cmd" class={formStyles.label}>Build Command</label>
            <input id="settings-build-cmd" class={formStyles.inputMono} value={form.build_command} onInput={(e) => setForm({ ...form, build_command: (e.target as HTMLInputElement).value })} placeholder="bun run build" />
          </div>
          <div>
            <label htmlFor="settings-project" class={formStyles.label}>
              <FolderOpen size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
              Project
            </label>
            {/* a11y [WCAG 4.1.2]: select has associated label via htmlFor/id */}
            <Select
              id="settings-project"
              options={[{ value: '', label: 'Unassigned' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              fullWidth
            />
            <span class={styles.fieldHint}>Group this app with others in a project.</span>
          </div>
        </div>
      </div>

      {/* Deploy Mode */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>
          <Zap size={18} /> Deploy Mode
        </h2>
        <p class={styles.settingsDescription}>
          Controls how this app is built and served. Native mode builds on the host and serves static files directly through Caddy — no container overhead. Container mode uses Docker for apps that need a running server.
        </p>
        <div class={formStyles.fieldRow}>
          <div>
            {/* a11y [WCAG 4.1.2]: select has associated label via htmlFor/id */}
            <label htmlFor="settings-deploy-mode" class={formStyles.label}>Deploy Mode</label>
            <Select
              id="settings-deploy-mode"
              options={[
                { value: 'auto', label: 'Auto (recommended)' },
                { value: 'native', label: 'Native (static)' },
                { value: 'container', label: 'Container' },
              ]}
              value={deployMode}
              onChange={(v) => setDeployMode(v as DeployMode)}
              fullWidth
            />
            <span class={styles.fieldHint}>
              {deployMode === 'auto' && 'Icefall detects whether your app is static or needs a server, then picks the fastest deploy method.'}
              {deployMode === 'native' && 'Build output is served directly by Caddy. Best for static sites (React, Vue, Astro static, plain HTML). No container overhead.'}
              {deployMode === 'container' && 'App runs in a Docker container. Required for SSR frameworks (Next.js, Nuxt, Astro SSR) and Node.js servers.'}
            </span>
          </div>
        </div>
        <p class={styles.settingsNote}>Changes take effect on next deployment.</p>
      </div>

      {/* Tags */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>Tags</h2>
        <p class={styles.settingsDescription}>
          Organize apps with freeform tags. Tags are lowercase, alphanumeric with hyphens, max {TAG_MAX_LENGTH} characters.
        </p>
        <div class={styles.tagInputWrap}>
          {tags.map((tag) => (
            <span key={tag} class={styles.tagChip}>
              {tag}
              {/* a11y [WCAG 4.1.2]: button has accessible name via aria-label */}
              <button
                type="button"
                class={styles.tagRemove}
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            id="settings-tags"
            class={styles.tagInputField}
            type="text"
            value={tagInput}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              if (val.includes(',')) {
                addTag(val.replace(',', ''));
              } else {
                setTagInput(val);
              }
            }}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? 'Add a tag...' : ''}
            aria-label="Add tag"
            maxLength={TAG_MAX_LENGTH}
          />
        </div>
        {tagError && (
          <p class={styles.tagError} role="alert">{tagError}</p>
        )}
        <span class={styles.fieldHint}>Press Enter or comma to add a tag.</span>
      </div>

      {/* Resource Limits */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>Resource Limits</h2>
        {!form.memory_mb && !form.cpu_shares && (
          <div class={styles.warningBanner} role="alert">
            No resource limits configured. A runaway process could consume all server resources.
          </div>
        )}
        <div class={formStyles.fieldRow}>
          <div>
            <label htmlFor="settings-memory" class={formStyles.label}>Memory Limit (MB)</label>
            <input
              id="settings-memory"
              class={formStyles.input}
              type="number"
              min="64"
              placeholder="No limit"
              value={form.memory_mb}
              onInput={(e) => setForm({ ...form, memory_mb: (e.target as HTMLInputElement).value })}
            />
            <span class={styles.fieldHint}>Minimum 64 MB. Leave empty for no limit.</span>
          </div>
          <div>
            <label htmlFor="settings-cpu" class={formStyles.label}>CPU Shares</label>
            <input
              id="settings-cpu"
              class={formStyles.input}
              type="number"
              min="1"
              placeholder="1024 (default)"
              value={form.cpu_shares}
              onInput={(e) => setForm({ ...form, cpu_shares: (e.target as HTMLInputElement).value })}
            />
            <span class={styles.fieldHint}>Relative weight. Default is 1024. Higher = more CPU time.</span>
          </div>
        </div>
        <p class={styles.settingsNote}>Changes take effect on next deployment.</p>
      </div>

      {/* Auto-Deploy */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>
          <Webhook size={18} /> Auto-Deploy
        </h2>
        <p class={styles.settingsDescription}>
          Automatically deploy when you push to the configured branch. Configure the webhook URL in your Git provider's <a href="/settings" data-astro-prefetch="hover">settings</a>.
        </p>

        {hasWebhookSecret ? (
          <div class={styles.webhookInfo}>
            <div class={styles.webhookRow}>
              <label class={formStyles.label}>GitHub Webhook URL</label>
              <div class={styles.copyRow}>
                <code class={styles.codeBlock}>{webhookBaseUrl}/github</code>
                <button type="button" class={styles.copyButton} onClick={() => copyToClipboard(webhookBaseUrl + '/github', 'github')} aria-label="Copy GitHub webhook URL">
                  {copied === 'github' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div class={styles.webhookRow}>
              <label class={formStyles.label}>GitLab Webhook URL</label>
              <div class={styles.copyRow}>
                <code class={styles.codeBlock}>{webhookBaseUrl}/gitlab</code>
                <button type="button" class={styles.copyButton} onClick={() => copyToClipboard(webhookBaseUrl + '/gitlab', 'gitlab')} aria-label="Copy GitLab webhook URL">
                  {copied === 'gitlab' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div class={styles.webhookRow}>
              <label class={formStyles.label}>Webhook Secret</label>
              <div class={styles.copyRow}>
                <code class={styles.codeBlock}>{app.webhook_secret}</code>
                <button type="button" class={styles.copyButton} onClick={() => copyToClipboard(app.webhook_secret || '', 'secret')} aria-label="Copy webhook secret">
                  {copied === 'secret' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <p class={styles.fieldHint}>
              Deploys on push to: <code>{app.git_branch}</code>
            </p>
          </div>
        ) : (
          <p class={styles.settingsNote}>
            Auto-deploy is not configured. A webhook secret will be generated when the app is deployed for the first time.
          </p>
        )}
      </div>

      {/* Preview Deployments */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>Preview Deployments</h2>
        <p class={styles.settingsDescription}>
          Automatically deploy branches matching a pattern and assign a preview subdomain. Previews are cleaned up when the branch is deleted.
        </p>
        <div class={styles.toggleRow}>
          <label class={styles.toggleLabel}>
            <input
              type="checkbox"
              class={formStyles.checkbox}
              checked={form.preview_enabled}
              onChange={(e) => setForm({ ...form, preview_enabled: (e.target as HTMLInputElement).checked })}
            />
            Enable preview deployments
          </label>
        </div>
        {form.preview_enabled && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <label htmlFor="settings-preview-pattern" class={formStyles.label}>Branch Pattern</label>
            <input
              id="settings-preview-pattern"
              class={formStyles.inputMono}
              value={form.preview_branch_pattern}
              onInput={(e) => setForm({ ...form, preview_branch_pattern: (e.target as HTMLInputElement).value })}
              placeholder="feature/*"
            />
            <span class={styles.fieldHint}>Glob pattern. Use * to match all branches except the main deploy branch.</span>
          </div>
        )}
      </div>

      {/* Persistent Storage */}
      <div class={styles.card}>
        <h2 class={styles.sectionTitle}>
          <HardDrive size={18} /> Persistent Storage
        </h2>
        <p class={styles.settingsDescription}>
          Mount named volumes, host paths, or S3-compatible object storage into your container. Data in these mounts persists across deployments.
        </p>

        {volumes.length > 0 && (
          <div class={styles.volumeList} role="list" aria-label="Volume mounts">
            {volumes.map((vol, index) => (
              <div key={index} class={styles.volumeRow} role="listitem">
                <div class={styles.volumeFields}>
                  {/* a11y [WCAG 4.1.2]: select has associated label via htmlFor/id */}
                  <div class={styles.volumeTypeRow}>
                    <label htmlFor={`vol-type-${index}`} class={formStyles.label}>Type</label>
                    <Select
                      id={`vol-type-${index}`}
                      options={[
                        { value: 'local', label: 'Local Volume' },
                        { value: 's3', label: 'S3 Mount' },
                      ]}
                      value={vol.type}
                      onChange={(v) => switchVolumeType(index, v as 'local' | 's3')}
                      fullWidth
                    />
                  </div>

                  {vol.type === 'local' ? (
                    <>
                      <div>
                        <label htmlFor={`vol-source-${index}`} class={formStyles.label}>Source</label>
                        <input
                          id={`vol-source-${index}`}
                          class={formStyles.inputMono}
                          value={vol.source}
                          onInput={(e) => updateVolume(index, 'source', (e.target as HTMLInputElement).value)}
                          placeholder="myapp-data"
                        />
                        <span class={styles.fieldHint}>Volume name or host path</span>
                      </div>
                      <div>
                        <label htmlFor={`vol-target-${index}`} class={formStyles.label}>Container Path</label>
                        <input
                          id={`vol-target-${index}`}
                          class={formStyles.inputMono}
                          value={vol.target}
                          onInput={(e) => updateVolume(index, 'target', (e.target as HTMLInputElement).value)}
                          placeholder="/app/data"
                          aria-invalid={!!volumeErrors[index]}
                          aria-describedby={volumeErrors[index] ? `vol-error-${index}` : undefined}
                        />
                        {volumeErrors[index] ? (
                          <span id={`vol-error-${index}`} class={styles.volumeError} role="alert">{volumeErrors[index]}</span>
                        ) : (
                          <span class={styles.fieldHint}>Must start with /</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor={`vol-bucket-${index}`} class={formStyles.label}>
                          <Cloud size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                          Bucket Name
                        </label>
                        <input
                          id={`vol-bucket-${index}`}
                          class={formStyles.inputMono}
                          value={vol.bucket}
                          onInput={(e) => updateVolume(index, 'bucket', (e.target as HTMLInputElement).value)}
                          placeholder="my-bucket"
                        />
                      </div>
                      <div>
                        <label htmlFor={`vol-endpoint-${index}`} class={formStyles.label}>Endpoint URL</label>
                        <input
                          id={`vol-endpoint-${index}`}
                          class={formStyles.inputMono}
                          value={vol.endpoint}
                          onInput={(e) => updateVolume(index, 'endpoint', (e.target as HTMLInputElement).value)}
                          placeholder="https://s3.amazonaws.com"
                        />
                        <span class={styles.fieldHint}>S3-compatible endpoint (R2, MinIO, etc.)</span>
                      </div>
                      <div>
                        <label htmlFor={`vol-accesskey-${index}`} class={formStyles.label}>Access Key</label>
                        <input
                          id={`vol-accesskey-${index}`}
                          class={formStyles.inputMono}
                          value={vol.access_key}
                          onInput={(e) => updateVolume(index, 'access_key', (e.target as HTMLInputElement).value)}
                          placeholder="AKIA..."
                        />
                      </div>
                      <div>
                        <label htmlFor={`vol-secretkey-${index}`} class={formStyles.label}>Secret Key</label>
                        <input
                          id={`vol-secretkey-${index}`}
                          class={formStyles.inputMono}
                          type="password"
                          value={vol.secret_key}
                          onInput={(e) => updateVolume(index, 'secret_key', (e.target as HTMLInputElement).value)}
                          placeholder="Secret key"
                          autocomplete="off"
                        />
                      </div>
                      <div>
                        <label htmlFor={`vol-region-${index}`} class={formStyles.label}>Region</label>
                        <input
                          id={`vol-region-${index}`}
                          class={formStyles.inputMono}
                          value={vol.region}
                          onInput={(e) => updateVolume(index, 'region', (e.target as HTMLInputElement).value)}
                          placeholder="auto"
                        />
                        <span class={styles.fieldHint}>Use "auto" for most S3-compatible providers.</span>
                      </div>
                      <div>
                        <label htmlFor={`vol-target-${index}`} class={formStyles.label}>Container Path</label>
                        <input
                          id={`vol-target-${index}`}
                          class={formStyles.inputMono}
                          value={vol.target}
                          onInput={(e) => updateVolume(index, 'target', (e.target as HTMLInputElement).value)}
                          placeholder="/app/s3"
                          aria-invalid={!!volumeErrors[index]}
                          aria-describedby={volumeErrors[index] ? `vol-error-${index}` : undefined}
                        />
                        {volumeErrors[index] ? (
                          <span id={`vol-error-${index}`} class={styles.volumeError} role="alert">{volumeErrors[index]}</span>
                        ) : (
                          <span class={styles.fieldHint}>Must start with /</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div class={styles.volumeActions}>
                  <label class={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      class={formStyles.checkbox}
                      checked={vol.read_only}
                      onChange={(e) => updateVolume(index, 'read_only', (e.target as HTMLInputElement).checked)}
                    />
                    Read-only
                  </label>
                  {vol.type !== 's3' && vol.target && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setBrowsingVolume(index)}
                      aria-label={`Browse volume ${vol.type === 'local' ? vol.source : ''} mounted at ${vol.target}`}
                    >
                      <Search size={14} /> Browse
                    </Button>
                  )}
                  {/* a11y [WCAG 4.1.2]: button has accessible name via aria-label */}
                  <button
                    type="button"
                    class={styles.volumeRemove}
                    onClick={() => removeVolume(index)}
                    aria-label={`Remove volume mount ${vol.type === 'local' ? (vol.source || 'unnamed') : (vol.bucket || 'unnamed bucket')} to ${vol.target || 'unset'}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div class={styles.volumeAddRow} style={{ marginTop: volumes.length > 0 ? 'var(--space-3)' : '0' }}>
          <Button variant="secondary" onClick={() => addVolume('local')}>
            <Plus size={14} /> Add Volume
          </Button>
          <Button variant="secondary" onClick={() => addVolume('s3')}>
            <Cloud size={14} /> Add S3 Mount
          </Button>
        </div>
        <p class={styles.settingsNote}>Changes take effect on next deployment. S3 mounts use an rclone sidecar container with FUSE.</p>
      </div>

      {/* Save Button */}
      <div class={styles.saveRow}>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          <Save size={14} /> Save All Settings
        </Button>
        {/* a11y [WCAG 4.1.3]: announce save result to AT */}
        <span role="status" aria-live="polite">{saveMessage}</span>
      </div>

      {/* Server Placement — only in multi-server mode */}
      {multiServer && (
        <div class={styles.card}>
          <h2 class={styles.sectionTitle}>
            <ArrowRightLeft size={18} aria-hidden="true" /> Server placement
          </h2>
          <div class={styles.serverPlacement}>
            <div class={styles.currentServer}>
              <span class={styles.serverLabel}>Current server</span>
              <a href={`/servers/${app.server_id}`} class={styles.serverValue}>
                {currentServer?.name || app.server_id || 'Control plane'}
              </a>
            </div>
            {availableTargets.length > 0 && (
              <div class={styles.migrateRow}>
                <div>
                  <label htmlFor="migrate-target" class={formStyles.label}>Migrate to</label>
                  <Select
                    id="migrate-target"
                    options={availableTargets.map((s) => ({ value: s.id, label: `${s.name} (${s.host})` }))}
                    value={migrateTarget}
                    onChange={setMigrateTarget}
                    placeholder="Select a server..."
                    fullWidth
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowMigrateDialog(true)}
                  disabled={!migrateTarget}
                >
                  <ArrowRightLeft size={14} /> Migrate app
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {showMigrateDialog && (
        <div class={styles.migrateDialogBackdrop} onClick={() => setShowMigrateDialog(false)}>
          <div
            class={styles.migrateDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="migrate-title"
            aria-describedby="migrate-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="migrate-title" class={styles.migrateDialogTitle}>Migrate app?</h2>
            <p id="migrate-desc" class={styles.migrateDialogDesc}>
              This will redeploy "{app.name}" from <strong>{currentServer?.name || 'current server'}</strong> to <strong>{availableTargets.find(s => s.id === migrateTarget)?.name}</strong>.
            </p>
            <label class={styles.migrateCheckbox}>
              <input
                type="checkbox"
                checked={migrateAck}
                onChange={(e) => setMigrateAck((e.target as HTMLInputElement).checked)}
              />
              I understand that volume data will not be migrated
            </label>
            <div class={styles.migrateDialogActions}>
              <Button variant="ghost" onClick={() => { setShowMigrateDialog(false); setMigrateAck(false); }}>Cancel</Button>
              <Button variant="primary" onClick={handleMigrate} loading={migrating} disabled={!migrateAck}>
                Migrate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div class={styles.dangerCard}>
        <h2 class={styles.dangerTitle}>
          <AlertTriangle size={18} /> Danger Zone
        </h2>

        <div class={styles.dangerRowBorder}>
          <div>
            <p class={styles.dangerLabel}>Application Controls</p>
            <p class={styles.dangerDescription}>Start, stop, or restart all containers for this application.</p>
          </div>
          <div class={styles.confirmActions}>
            <Button variant="secondary" onClick={async () => { setStarting(true); try { await api.startApp(app.id); } catch {} setStarting(false); }} loading={starting}>
              <Play size={14} /> Start
            </Button>
            <Button variant="secondary" onClick={async () => { setRestarting(true); try { await api.restartApp(app.id); } catch {} setRestarting(false); }} loading={restarting}>
              <RotateCw size={14} /> Restart
            </Button>
            <Button variant="danger" onClick={async () => { setStopping(true); try { await api.stopApp(app.id); } catch {} setStopping(false); }} loading={stopping}>
              <Square size={14} /> Stop
            </Button>
          </div>
        </div>

        <div class={styles.dangerRow}>
          <div>
            <p class={styles.dangerLabel}>Delete Application</p>
            <p class={styles.dangerDescription}>Deleting this app will remove all deploys, domains, and environment variables. This action cannot be undone.</p>
          </div>
          {confirmDelete ? (
            <div class={styles.confirmActions}>
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

      {/* Volume Browser Drawer */}
      {browsingVolume !== null && volumes[browsingVolume] && volumes[browsingVolume].type !== 's3' && (
        <VolumeBrowser
          appId={app.id}
          mountIndex={browsingVolume}
          volume={{
            source: (volumes[browsingVolume] as LocalVolume).source,
            target: volumes[browsingVolume].target,
            read_only: volumes[browsingVolume].read_only,
          }}
          onClose={() => setBrowsingVolume(null)}
        />
      )}
    </div>
  );
}
