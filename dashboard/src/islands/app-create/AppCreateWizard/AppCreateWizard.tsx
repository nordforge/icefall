import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import { api } from '@lib/api';
import Button from '@islands/shared/Button/Button';
import { ArrowLeft, ArrowRight, Rocket, GitBranch, Container, Layers } from 'lucide-preact';
import styles from './app-create.module.css';
import formStyles from '@styles/form.module.css';

type DeploySource = 'git' | 'image' | 'compose';

const GIT_STEPS = ['Source', 'Repository', 'Build Settings', 'Environment', 'Review'];
const IMAGE_STEPS = ['Source', 'Docker Image', 'Environment', 'Review'];
const COMPOSE_STEPS = ['Source', 'Compose File', 'Environment', 'Review'];

export default function AppCreateWizard() {
  const [step, setStep] = useState(0);
  const [deploySource, setDeploySource] = useState<DeploySource | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [composeError, setComposeError] = useState('');
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
    image_ref: '',
    compose_content: '',
  });

  const steps = useMemo(() => {
    if (!deploySource) return ['Source'];
    if (deploySource === 'git') return GIT_STEPS;
    if (deploySource === 'compose') return COMPOSE_STEPS;
    return IMAGE_STEPS;
  }, [deploySource]);

  const lastStep = steps.length - 1;
  const isReviewStep = step === lastStep;

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'git_repo' && !form.name) {
      const name = value.split('/').pop()?.replace('.git', '') || '';
      setForm((prev) => ({ ...prev, name }));
    }
    if (field === 'image_ref' && !form.name) {
      // Derive app name from image ref: "ghost:5-alpine" -> "ghost", "plausible/analytics:v2" -> "analytics"
      const name = value.split(':')[0]?.split('/').pop() || '';
      setForm((prev) => ({ ...prev, name }));
    }
    if (field === 'compose_content') {
      setComposeError('');
    }
  }

  function handleSourceSelect(source: DeploySource) {
    setDeploySource(source);
    setStep(1);
  }

  // a11y [WCAG 2.4.3]: move focus to step card on step change
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cardRef.current?.focus();
  }, [step]);

  /** Parse service names from a compose YAML string (client-side preview). */
  function parseComposeServices(yaml: string): string[] {
    try {
      // Simple YAML service name extraction — look for top-level keys under "services:"
      const lines = yaml.split('\n');
      let inServices = false;
      const names: string[] = [];
      for (const line of lines) {
        if (/^services:\s*$/.test(line)) {
          inServices = true;
          continue;
        }
        if (inServices) {
          // A service name is indented exactly 2 spaces (standard compose indent)
          const match = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
          if (match) {
            names.push(match[1]);
          }
          // Stop when we hit another top-level key
          if (/^[a-zA-Z]/.test(line) && !line.startsWith(' ')) {
            inServices = false;
          }
        }
      }
      return names;
    } catch {
      return [];
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return false; // Must pick a source
    if (deploySource === 'git') {
      if (step === 1) return !!form.name.trim(); // Repository step needs a name
    }
    if (deploySource === 'image') {
      if (step === 1) return !!form.name.trim() && !!form.image_ref.trim() && !!form.port.trim();
    }
    if (deploySource === 'compose') {
      if (step === 1) return !!form.name.trim() && !!form.compose_content.trim();
    }
    return true;
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const isImage = deploySource === 'image';
      const isCompose = deploySource === 'compose';

      const createBody: Parameters<typeof api.createApp>[0] = {
        name: form.name,
      };

      if (isCompose) {
        createBody.compose_content = form.compose_content;
      } else if (isImage) {
        createBody.image_ref = form.image_ref;
        createBody.port = parseInt(form.port, 10) || 3000;
      } else {
        createBody.git_repo = form.git_repo || undefined;
        createBody.git_branch = form.git_branch;
      }

      const { data: app } = await api.createApp(createBody);

      if (form.envContent.trim()) {
        await api.importEnv(app.id, form.envContent, 'shared');
      }

      const { data: deploy } = await api.triggerDeploy(app.id);
      window.location.href = `/apps/${app.id}/deploys/${deploy.id}`;
    } catch (err: any) {
      if (err?.message?.includes('Compose YAML')) {
        setComposeError(err.message);
      }
      setDeploying(false);
    }
  }

  function handleBack() {
    if (step === 1) {
      // Going back to source selection
      setDeploySource(null);
      setStep(0);
    } else {
      setStep(step - 1);
    }
  }

  // --- Step content renderers ---

  function renderSourceStep() {
    return (
      <div class={styles.sourceGrid}>
        <button
          type="button"
          class={styles.sourceCard}
          onClick={() => handleSourceSelect('git')}
          aria-label="Deploy from Git repository"
        >
          <GitBranch size={28} aria-hidden="true" />
          <span class={styles.sourceCardTitle}>Deploy from Git</span>
          <span class={styles.sourceCardDescription}>
            Connect a repository, build from source, and deploy automatically.
          </span>
        </button>
        <button
          type="button"
          class={styles.sourceCard}
          onClick={() => handleSourceSelect('image')}
          aria-label="Deploy a Docker image"
        >
          <Container size={28} aria-hidden="true" />
          <span class={styles.sourceCardTitle}>Deploy Docker Image</span>
          <span class={styles.sourceCardDescription}>
            Pull a pre-built image from a registry and deploy it directly.
          </span>
        </button>
        <button
          type="button"
          class={styles.sourceCard}
          onClick={() => handleSourceSelect('compose')}
          aria-label="Deploy from Docker Compose"
        >
          <Layers size={28} aria-hidden="true" />
          <span class={styles.sourceCardTitle}>Docker Compose</span>
          <span class={styles.sourceCardDescription}>
            Deploy a multi-container stack from a docker-compose.yml file.
          </span>
        </button>
      </div>
    );
  }

  function renderGitRepoStep() {
    return (
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
    );
  }

  function renderBuildSettingsStep() {
    return (
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
    );
  }

  function renderImageStep() {
    return (
      <div class={formStyles.fieldGroup}>
        <div>
          <label htmlFor="create-app-name" class={formStyles.label}>App Name</label>
          <input id="create-app-name" class={formStyles.input} value={form.name} onInput={(e) => update('name', (e.target as HTMLInputElement).value)} placeholder="my-ghost-blog" />
        </div>
        <div>
          <label htmlFor="create-image-ref" class={formStyles.label}>Docker Image</label>
          <input
            id="create-image-ref"
            class={formStyles.inputMono}
            value={form.image_ref}
            onInput={(e) => update('image_ref', (e.target as HTMLInputElement).value)}
            placeholder="ghost:5-alpine"
          />
          <span class={formStyles.hint}>
            Image name from Docker Hub or a full registry URL.
          </span>
        </div>
        <div>
          <label htmlFor="create-image-port" class={formStyles.label}>Container Port</label>
          <input
            id="create-image-port"
            class={formStyles.inputMono}
            type="number"
            min="1"
            max="65535"
            value={form.port}
            onInput={(e) => update('port', (e.target as HTMLInputElement).value)}
          />
          <span class={formStyles.hint}>
            The port the container listens on internally.
          </span>
        </div>
      </div>
    );
  }

  function renderComposeStep() {
    const services = parseComposeServices(form.compose_content);
    return (
      <div class={formStyles.fieldGroup}>
        <div>
          <label htmlFor="create-compose-name" class={formStyles.label}>Stack Name</label>
          <input
            id="create-compose-name"
            class={formStyles.input}
            value={form.name}
            onInput={(e) => update('name', (e.target as HTMLInputElement).value)}
            placeholder="my-wordpress-stack"
          />
        </div>
        <div>
          <label htmlFor="create-compose-content" class={formStyles.label}>
            Compose File
          </label>
          <span class={formStyles.hint}>
            Paste your docker-compose.yml content. Only pre-built images are supported (no build directive).
          </span>
          <textarea
            id="create-compose-content"
            class={formStyles.textarea}
            value={form.compose_content}
            onInput={(e) => update('compose_content', (e.target as HTMLTextAreaElement).value)}
            placeholder={`services:\n  web:\n    image: nginx:latest\n    ports:\n      - "80:80"\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_PASSWORD: secret`}
            rows={14}
            spellcheck={false}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
          />
          {composeError && (
            <p role="alert" class={styles.composeError}>{composeError}</p>
          )}
        </div>
        {services.length > 0 && (
          <div class={styles.servicePreview}>
            <span class={styles.servicePreviewLabel}>
              {services.length} service{services.length !== 1 ? 's' : ''} detected
            </span>
            <ul class={styles.serviceList} aria-label="Detected services">
              {services.map((s) => (
                <li key={s} class={styles.serviceItem}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  function renderEnvStep() {
    return (
      <div>
        <label htmlFor="create-env-vars" class={formStyles.label}>Environment Variables</label>
        <p class={styles.envDescription}>
          Paste your .env file content below. One KEY=value pair per line.
          {deploySource === 'compose' && (
            <> These will be available for {'${VAR}'} interpolation in your compose file.</>
          )}
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
    );
  }

  function renderReviewStep() {
    const isImage = deploySource === 'image';
    const isCompose = deploySource === 'compose';
    const services = isCompose ? parseComposeServices(form.compose_content) : [];

    return (
      <div class={formStyles.fieldGroup}>
        <h3 class={styles.reviewTitle}>Review</h3>
        <div class={styles.reviewGrid}>
          <span class={styles.reviewLabel}>Name</span>
          <span class={styles.reviewValue}>{form.name || '—'}</span>

          <span class={styles.reviewLabel}>Deploy Type</span>
          <span class={styles.reviewValue}>
            {isCompose ? 'Docker Compose' : isImage ? 'Docker Image' : 'Git Repository'}
          </span>

          {isCompose ? (
            <>
              <span class={styles.reviewLabel}>Services</span>
              <span class={styles.reviewValue}>
                {services.length > 0 ? services.join(', ') : '—'}
              </span>
            </>
          ) : isImage ? (
            <>
              <span class={styles.reviewLabel}>Image</span>
              <span class={styles.reviewMono}>{form.image_ref}</span>
              <span class={styles.reviewLabel}>Port</span>
              <span class={styles.reviewMono}>{form.port}</span>
            </>
          ) : (
            <>
              <span class={styles.reviewLabel}>Repository</span>
              <span class={styles.reviewMono}>{form.git_repo || '—'}</span>
              <span class={styles.reviewLabel}>Branch</span>
              <span class={styles.reviewMono}>{form.git_branch}</span>
              {form.build_command && <>
                <span class={styles.reviewLabel}>Build</span>
                <span class={styles.reviewMono}>{form.build_command}</span>
              </>}
            </>
          )}

          {form.envContent && <>
            <span class={styles.reviewLabel}>Env vars</span>
            <span>{form.envContent.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length} variable(s)</span>
          </>}
        </div>
      </div>
    );
  }

  // --- Determine which content to render for the current step ---

  function renderStepContent() {
    if (step === 0) return renderSourceStep();

    if (deploySource === 'git') {
      if (step === 1) return renderGitRepoStep();
      if (step === 2) return renderBuildSettingsStep();
      if (step === 3) return renderEnvStep();
      if (step === 4) return renderReviewStep();
    }

    if (deploySource === 'image') {
      if (step === 1) return renderImageStep();
      if (step === 2) return renderEnvStep();
      if (step === 3) return renderReviewStep();
    }

    if (deploySource === 'compose') {
      if (step === 1) return renderComposeStep();
      if (step === 2) return renderEnvStep();
      if (step === 3) return renderReviewStep();
    }

    return null;
  }

  return (
    <div class={styles.wrapper}>
      <h1 class={styles.pageTitle}>
        Create New App
      </h1>

      {/* a11y [WCAG 1.3.1]: progress indicator with aria-current */}
      <nav aria-label="Progress" class={styles.progress}>
        {steps.map((s, i) => (
          <div key={s} class={styles.progressStep} aria-current={i === step ? 'step' : undefined}>
            <div class={i <= step ? styles.progressBarActive : styles.progressBarInactive} />
            <span class={i === step ? styles.progressLabelCurrent : i < step ? styles.progressLabelActive : styles.progressLabelInactive}>
              {s}
            </span>
          </div>
        ))}
      </nav>

      <div ref={cardRef} tabIndex={-1} class={styles.card}>
        {renderStepContent()}
      </div>

      {step > 0 && (
        <div class={styles.navigation}>
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft size={14} /> Back
          </Button>
          {!isReviewStep ? (
            <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
              Next <ArrowRight size={14} />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleDeploy} loading={deploying} disabled={!form.name.trim()}>
              <Rocket size={14} /> Deploy
            </Button>
          )}
        </div>
      )}

      {step === 0 && (
        <div class={styles.navigation}>
          <a href="/" class={styles.cancelLink}><Button variant="ghost">Cancel</Button></a>
          <span />
        </div>
      )}
    </div>
  );
}
