import { useState } from 'preact/hooks';
import type { App } from '@lib/types';
import { api } from '@lib/api';
import Button from '@islands/shared/Button/Button';
import { Save, AlertTriangle, Square, Trash2 } from 'lucide-preact';
import styles from './settings-tab.module.css';
import formStyles from '@styles/form.module.css';

type Props = {
  app: App;
}

export default function SettingsTab({ app }: Props) {
  const [form, setForm] = useState(() => {
    let buildCommand = '';
    try {
      const parsed = app.build_config ? JSON.parse(app.build_config) : {};
      buildCommand = parsed.build_command || '';
    } catch { /* malformed build_config JSON */ }
    return {
      name: app.name,
      git_repo: app.git_repo || '',
      git_branch: app.git_branch,
      build_command: buildCommand,
    };
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  return (
    <div class={styles.container}>
      <div class={styles.card}>
        <h3 class={styles.sectionTitle}>
          General Settings
        </h3>

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
        </div>

        <div class={styles.saveRow}>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>

      <div class={styles.dangerCard}>
        <h3 class={styles.dangerTitle}>
          <AlertTriangle size={18} /> Danger Zone
        </h3>

        <div class={styles.dangerRowBorder}>
          <div>
            <p class={styles.dangerLabel}>Stop Application</p>
            <p class={styles.dangerDescription}>Temporarily halt all traffic and instances of this application.</p>
          </div>
          <Button variant="secondary"><Square size={14} /> Stop App</Button>
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
    </div>
  );
}
