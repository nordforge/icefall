import { useEffect, useState } from 'preact/hooks';
import Button from '@islands/shared/Button/Button';
import { User, Server, Globe, GitBranch, Rocket, Check, ArrowRight, SkipForward } from 'lucide-preact';
import styles from './onboarding.module.css';
import formStyles from '@styles/form.module.css';

type OnboardingStatus = {
  current_step: string;
  completed_steps: string[];
  is_complete: boolean;
}

const STEP_CONFIG = [
  { key: 'admin_account', label: 'Create Account', icon: User, required: true },
  { key: 'server_check', label: 'Server Check', icon: Server, required: true },
  { key: 'base_domain', label: 'Base Domain', icon: Globe, required: false },
  { key: 'git_provider', label: 'Git Provider', icon: GitBranch, required: false },
  { key: 'first_app', label: 'First App', icon: Rocket, required: true },
  { key: 'first_deploy', label: 'Deploy', icon: Check, required: true },
];

export default function OnboardingWizard() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [baseDomain, setBaseDomain] = useState('');
  const [appName, setAppName] = useState('');
  const [gitRepo, setGitRepo] = useState('');
  const [checks, setChecks] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/v1/onboarding/status');
      const data = await res.json();
      if (data.is_complete) {
        window.location.href = '/';
        return;
      }
      setStatus(data);
    } catch {}
    setLoading(false);
  }

  async function apiPost(path: string, body?: object) {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/v1${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setSubmitting(false);
        return null;
      }
      setSubmitting(false);
      return data;
    } catch (e) {
      setError('Connection failed');
      setSubmitting(false);
      return null;
    }
  }

  async function handleAdminCreate() {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const result = await apiPost('/onboarding/admin', { email, password });
    if (result) fetchStatus();
  }

  async function handleServerCheck() {
    const result = await apiPost('/onboarding/server-check');
    if (result) {
      setChecks(result.checks || []);
      if (result.all_passed) setTimeout(fetchStatus, 500);
    }
  }

  async function handleDomainSave() {
    if (!baseDomain.trim()) {
      await skipStep('base_domain');
      return;
    }
    const result = await apiPost('/onboarding/domain', { base_domain: baseDomain });
    if (result) fetchStatus();
  }

  async function handleGitSkip() {
    await skipStep('git_provider');
  }

  async function handleCreateApp() {
    const result = await apiPost('/onboarding/app', {
      name: appName,
      git_repo: gitRepo || undefined,
    });
    if (result) {
      await apiPost('/onboarding/first_deploy/complete');
      fetchStatus();
    }
  }

  async function skipStep(step: string) {
    await apiPost(`/onboarding/skip/${step}`);
    fetchStatus();
  }

  async function handleComplete() {
    await apiPost('/onboarding/complete');
    window.location.href = '/';
  }

  if (loading) return <div class={styles.loadingWrapper}>Loading...</div>;
  if (!status) return null;

  const currentStep = status.current_step;
  const stepIndex = STEP_CONFIG.findIndex((s) => s.key === currentStep);
  const stepConfig = STEP_CONFIG[stepIndex];

  if (currentStep === 'completed') {
    return (
      <div class={styles.cardCentered}>
        <div class={styles.successIcon}>
          <Check size={28} />
        </div>
        <h2 class={styles.completedTitle}>You're all set!</h2>
        <p class={styles.completedDescription}>Icefall is configured and ready to deploy.</p>
        <Button variant="primary" fullWidth onClick={handleComplete}>
          Go to Dashboard <ArrowRight size={14} />
        </Button>
      </div>
    );
  }

  return (
    <div class={styles.card}>
      {stepConfig && (
        <div class={styles.stepHeader}>
          <div class={styles.stepIcon}>
            {stepConfig && <stepConfig.icon size={24} />}
          </div>
          <h2 class={styles.stepTitle}>
            {stepConfig.label}
          </h2>
        </div>
      )}

      {error && (
        <div class={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {currentStep === 'admin_account' && (
        <div class={formStyles.fieldGroup}>
          <p class={styles.stepDescription}>Create your admin account to get started.</p>
          <div>
            <label htmlFor="onboard-email" class={formStyles.label}>Email</label>
            <input id="onboard-email" class={formStyles.input} type="email" autoComplete="email" aria-invalid={!!error && error.toLowerCase().includes('email')} value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} placeholder="admin@example.com" />
          </div>
          <div>
            <label htmlFor="onboard-password" class={formStyles.label}>Password</label>
            <input id="onboard-password" class={formStyles.input} type="password" autoComplete="new-password" aria-describedby="password-hint" aria-invalid={!!error && error.toLowerCase().includes('password')} value={password} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} />
            <p id="password-hint" class={formStyles.hint}>Minimum 8 characters</p>
          </div>
          <div>
            <label htmlFor="onboard-confirm-password" class={formStyles.label}>Confirm Password</label>
            <input id="onboard-confirm-password" class={formStyles.input} type="password" autoComplete="new-password" aria-invalid={!!error && error.toLowerCase().includes('password')} value={confirmPassword} onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)} />
          </div>
          <Button variant="primary" fullWidth onClick={handleAdminCreate} loading={submitting} disabled={!email || !password || !confirmPassword}>
            Create Account
          </Button>
        </div>
      )}

      {currentStep === 'server_check' && (
        <div class={formStyles.fieldGroup}>
          <p class={styles.stepDescription}>Checking your server configuration.</p>
          {checks.length > 0 ? (
            <div class={styles.checksList}>
              {checks.map((c: any) => (
                <div key={c.id} class={styles.checkItem}>
                  {/* a11y [WCAG 1.4.1]: color-only dot supplemented with sr-only text */}
                  <span class={c.status === 'pass' ? styles.checkDotPass : c.status === 'warn' ? styles.checkDotWarn : styles.checkDotFail} aria-hidden="true" />
                  <span class="sr-only">{c.status}</span>
                  <span class={styles.checkName}>{c.name}</span>
                  <span class={styles.checkMessage}>{c.message}</span>
                </div>
              ))}
            </div>
          ) : null}
          <Button variant="primary" fullWidth onClick={handleServerCheck} loading={submitting}>
            {checks.length > 0 ? 'Re-run Checks' : 'Run Checks'}
          </Button>
        </div>
      )}

      {currentStep === 'base_domain' && (
        <div class={formStyles.fieldGroup}>
          <p class={styles.stepDescription}>Configure a domain for HTTPS and app subdomains.</p>
          <div>
            <label htmlFor="onboard-base-domain" class={formStyles.label}>Base Domain</label>
            <input id="onboard-base-domain" class={formStyles.inputMono} value={baseDomain} onInput={(e) => setBaseDomain((e.target as HTMLInputElement).value)} placeholder="apps.example.com" />
          </div>
          <Button variant="primary" fullWidth onClick={handleDomainSave} loading={submitting}>
            {baseDomain.trim() ? 'Continue' : 'Skip — add domain later'}
          </Button>
          {baseDomain.trim() && (
            <button onClick={() => skipStep('base_domain')} class={styles.skipButton}>
              Skip for now
            </button>
          )}
        </div>
      )}

      {currentStep === 'git_provider' && (
        <div class={formStyles.fieldGroup}>
          <p class={styles.stepDescription}>Link GitHub or GitLab for automatic deployments.</p>
          <div class={formStyles.fieldGroup}>
            <div class={styles.providerItem}>
              <div>
                <p class={styles.providerName}>GitHub</p>
                <p class={styles.providerHint}>Connect repositories from GitHub</p>
              </div>
              <Button variant="primary" size="sm">Connect</Button>
            </div>
            <div class={styles.providerItem}>
              <div>
                <p class={styles.providerName}>GitLab</p>
                <p class={styles.providerHint}>Connect repositories from GitLab</p>
              </div>
              <Button variant="secondary" size="sm">Connect</Button>
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={handleGitSkip}>
            Continue
          </Button>
          <button onClick={handleGitSkip} class={styles.skipButton}>
            Skip for now
          </button>
        </div>
      )}

      {currentStep === 'first_app' && (
        <div class={formStyles.fieldGroup}>
          <p class={styles.stepDescription}>Connect a repository and deploy it.</p>
          <div>
            <label htmlFor="onboard-git-repo" class={formStyles.label}>Repository URL</label>
            <input id="onboard-git-repo" class={formStyles.inputMono} value={gitRepo} onInput={(e) => setGitRepo((e.target as HTMLInputElement).value)} placeholder="https://github.com/user/repo" />
          </div>
          <div>
            <label htmlFor="onboard-app-name" class={formStyles.label}>App Name</label>
            <input id="onboard-app-name" class={formStyles.input} value={appName} onInput={(e) => setAppName((e.target as HTMLInputElement).value)} placeholder="my-awesome-app" />
          </div>
          <Button variant="primary" fullWidth onClick={handleCreateApp} loading={submitting} disabled={!appName.trim()}>
            <Rocket size={14} /> Deploy
          </Button>
        </div>
      )}

      {currentStep === 'first_deploy' && (
        <div class={styles.loadingWrapper}>
          <p class={styles.deployMessage}>Your app is being deployed...</p>
          {/* a11y: prefers-reduced-motion handled in CSS module */}
          <div class={styles.deploySpinner} role="status" aria-label="Deploying" />
          <p class={styles.deployHint}>This may take a few minutes.</p>
        </div>
      )}
    </div>
  );
}
