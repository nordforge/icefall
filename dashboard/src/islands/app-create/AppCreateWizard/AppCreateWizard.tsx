import { useState } from 'preact/hooks';
import { api } from '@lib/api';
import Button from '@islands/shared/Button/Button';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-preact';
import styles from './app-create.module.css';
import formStyles from '@styles/form.module.css';

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

  return (
    <div class={styles.wrapper}>
      <h1 class={styles.pageTitle}>
        Create New App
      </h1>

      <div class={styles.progress}>
        {STEPS.map((s, i) => (
          <div key={s} class={styles.progressStep}>
            <div class={i <= step ? styles.progressBarActive : styles.progressBarInactive} />
            <span class={i === step ? styles.progressLabelCurrent : i < step ? styles.progressLabelActive : styles.progressLabelInactive}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <div class={styles.card}>
        {step === 0 && (
          <div class={formStyles.fieldGroup}>
            <div>
              <label htmlFor="create-app-name" class={formStyles.label}>App Name</label>
              <input id="create-app-name" class={formStyles.input} value={form.name} onInput={(e) => update('name', (e.target as HTMLInputElement).value)} placeholder="my-awesome-app" />
            </div>
            <div>
              <label htmlFor="create-repo-url" class={formStyles.label}>Repository URL</label>
              <input id="create-repo-url" class={formStyles.inputMono} value={form.git_repo} onInput={(e) => update('git_repo', (e.target as HTMLInputElement).value)} placeholder="https://github.com/user/repo" />
            </div>
            <div>
              <label htmlFor="create-branch" class={formStyles.label}>Branch</label>
              <input id="create-branch" class={formStyles.inputMono} value={form.git_branch} onInput={(e) => update('git_branch', (e.target as HTMLInputElement).value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div class={formStyles.fieldGroup}>
            <div>
              <label htmlFor="create-build-cmd" class={formStyles.label}>Build Command</label>
              <input id="create-build-cmd" class={formStyles.inputMono} value={form.build_command} onInput={(e) => update('build_command', (e.target as HTMLInputElement).value)} placeholder="bun run build" />
            </div>
            <div>
              <label htmlFor="create-output-dir" class={formStyles.label}>Output Directory</label>
              <input id="create-output-dir" class={formStyles.inputMono} value={form.output_dir} onInput={(e) => update('output_dir', (e.target as HTMLInputElement).value)} placeholder="dist" />
            </div>
            <div>
              <label htmlFor="create-start-cmd" class={formStyles.label}>Start Command</label>
              <input id="create-start-cmd" class={formStyles.inputMono} value={form.start_command} onInput={(e) => update('start_command', (e.target as HTMLInputElement).value)} placeholder="node server.js" />
            </div>
            <div>
              <label htmlFor="create-port" class={formStyles.label}>Port</label>
              <input id="create-port" class={formStyles.inputMono} value={form.port} onInput={(e) => update('port', (e.target as HTMLInputElement).value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label htmlFor="create-env-vars" class={formStyles.label}>Environment Variables</label>
            <p class={styles.envDescription}>
              Paste your .env file content below. One KEY=value pair per line.
            </p>
            <textarea
              id="create-env-vars"
              value={form.envContent}
              onInput={(e) => update('envContent', (e.target as HTMLTextAreaElement).value)}
              placeholder="DATABASE_URL=postgres://...&#10;API_KEY=secret123"
              rows={10}
              class={formStyles.textarea}
            />
          </div>
        )}

        {step === 3 && (
          <div class={formStyles.fieldGroup}>
            <h3 class={styles.reviewTitle}>Review</h3>
            <div class={styles.reviewGrid}>
              <span class={styles.reviewLabel}>Name</span>
              <span class={styles.reviewValue}>{form.name || '—'}</span>
              <span class={styles.reviewLabel}>Repository</span>
              <span class={styles.reviewMono}>{form.git_repo || '—'}</span>
              <span class={styles.reviewLabel}>Branch</span>
              <span class={styles.reviewMono}>{form.git_branch}</span>
              {form.build_command && <>
                <span class={styles.reviewLabel}>Build</span>
                <span class={styles.reviewMono}>{form.build_command}</span>
              </>}
              {form.envContent && <>
                <span class={styles.reviewLabel}>Env vars</span>
                <span>{form.envContent.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length} variable(s)</span>
              </>}
            </div>
          </div>
        )}
      </div>

      <div class={styles.navigation}>
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={14} /> Back
          </Button>
        ) : (
          <a href="/" class={styles.cancelLink}><Button variant="ghost">Cancel</Button></a>
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
