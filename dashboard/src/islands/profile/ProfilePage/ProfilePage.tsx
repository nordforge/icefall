import { useState, useEffect } from 'preact/hooks';
import { api } from '@lib/api';
import type { User, ApiToken } from '@lib/types';
import { formatRelativeTime } from '@lib/format';
import Button from '@islands/shared/Button/Button';
import TwoFactorSection from '@islands/settings/TwoFactorSection/TwoFactorSection';
import {
  User as UserIcon,
  Lock,
  Mail,
  Link2,
  Key,
  Monitor,
  Trash2,
  Copy,
  Plus,
  LogOut,
  Settings2,
  AlertTriangle,
} from 'lucide-preact';
import styles from './profile-page.module.css';
import formStyles from '@styles/form.module.css';

type SessionEntry = {
  id: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
};

type OAuthIdentity = {
  id: string;
  provider: string;
  provider_email: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailErr, setEmailErr] = useState('');

  // OAuth identities
  const [identities, setIdentities] = useState<OAuthIdentity[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<{ github: boolean; google: boolean }>({ github: false, google: false });

  // API Tokens
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [tokenSubmitting, setTokenSubmitting] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsMsg, setSessionsMsg] = useState('');

  // Preferences
  const [preferences, setPreferences] = useState<Record<string, unknown>>({});
  const [prefSaving, setPrefSaving] = useState(false);

  // Danger zone
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  useEffect(() => {
    Promise.all([
      api.getMe().then(({ data }) => setUser(data)).catch(() => {}),
      api.listOAuthIdentities().then(({ data }) => setIdentities(data)).catch(() => {}),
      api.getEnabledOAuthProviders().then(({ data }) => setEnabledProviders(data)).catch(() => {}),
      api.listTokens().then(({ data }) => setTokens(data)).catch(() => {}),
      api.listSessions().then(({ data }) => setSessions(data)).catch(() => {}),
      api.getPreferences().then(({ data }) => setPreferences(data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // --- Password ---

  async function handleChangePassword() {
    setPasswordErr('');
    setPasswordMsg('');

    if (newPassword.length < 12) {
      setPasswordErr('New password must be at least 12 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordMsg('Password changed successfully. Other sessions have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Refresh sessions list
      api.listSessions().then(({ data }) => setSessions(data)).catch(() => {});
    } catch (e: any) {
      setPasswordErr(e.message || 'Failed to change password');
    }
    setPasswordSubmitting(false);
  }

  // --- Email ---

  async function handleChangeEmail() {
    setEmailErr('');
    setEmailMsg('');

    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setEmailErr('Enter a valid email address');
      return;
    }

    setEmailSubmitting(true);
    try {
      const { data } = await api.changeEmail(trimmed, emailPassword);
      setEmailMsg('Email updated successfully');
      setUser(prev => prev ? { ...prev, email: data.email } : prev);
      setNewEmail('');
      setEmailPassword('');
    } catch (e: any) {
      setEmailErr(e.message || 'Failed to update email');
    }
    setEmailSubmitting(false);
  }

  // --- Tokens ---

  async function handleCreateToken() {
    if (!tokenName.trim()) return;
    setTokenSubmitting(true);
    try {
      const { data } = await api.createToken(tokenName.trim());
      setNewTokenValue(data.token);
      const { data: refreshed } = await api.listTokens();
      setTokens(refreshed);
      setTokenName('');
      setShowCreateToken(false);
    } catch {}
    setTokenSubmitting(false);
  }

  async function handleRevokeToken(tokenId: string) {
    try {
      await api.revokeToken(tokenId);
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch {}
  }

  // --- Sessions ---

  async function handleRevokeAllSessions() {
    setSessionsLoading(true);
    setSessionsMsg('');
    try {
      await api.revokeAllSessions();
      setSessionsMsg('All other sessions have been signed out.');
      const { data } = await api.listSessions();
      setSessions(data);
    } catch (e: any) {
      setSessionsMsg(e.message || 'Failed to revoke sessions');
    }
    setSessionsLoading(false);
  }

  if (loading) {
    return <p class={styles.loadingText}>Loading profile...</p>;
  }

  return (
    <div class={styles.page}>
      <div class={styles.pageHeader}>
        <h1 class={styles.pageTitle}>Account</h1>
        <p class={styles.pageSubtitle}>Manage your account settings and security</p>
      </div>

      {/* --- Account Info --- */}
      <section class={styles.section} aria-labelledby="account-info-heading">
        <h2 id="account-info-heading" class={styles.sectionHeading}>
          {/* a11y [1.1.1]: decorative icon hidden from assistive tech */}
          <UserIcon size={18} aria-hidden="true" /> Account Info
        </h2>
        <div class={styles.infoGrid}>
          <div class={styles.infoItem}>
            <span class={styles.infoLabel}>Email</span>
            <span class={styles.infoValue}>{user?.email || '-'}</span>
          </div>
          <div class={styles.infoItem}>
            <span class={styles.infoLabel}>Role</span>
            <span class={styles.roleBadge}>{user?.role || '-'}</span>
          </div>
          <div class={styles.infoItem}>
            <span class={styles.infoLabel}>Member since</span>
            <span class={styles.infoValue}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
            </span>
          </div>
          <div class={styles.infoItem}>
            <span class={styles.infoLabel}>Two-Factor</span>
            <span class={styles.infoValue}>{user?.totp_enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </section>

      {/* --- Change Password --- */}
      <section class={styles.section} aria-labelledby="password-heading">
        <h2 id="password-heading" class={styles.sectionHeading}>
          <Lock size={18} aria-hidden="true" /> Change Password
        </h2>
        <p class={styles.sectionDescription}>
          After changing your password, all other sessions will be signed out.
        </p>

        {passwordErr && <p class={styles.feedbackError} role="alert">{passwordErr}</p>}
        {passwordMsg && <p class={styles.feedbackSuccess} role="status">{passwordMsg}</p>}

        <div class={formStyles.fieldGroup}>
          <div>
            {/* a11y [1.3.1]: label associated with input */}
            <label htmlFor="current-password" class={formStyles.label}>Current password</label>
            <input
              id="current-password"
              class={formStyles.input}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onInput={e => setCurrentPassword((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label htmlFor="new-password" class={formStyles.label}>New password</label>
            <input
              id="new-password"
              class={formStyles.input}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onInput={e => setNewPassword((e.target as HTMLInputElement).value)}
            />
            <p class={formStyles.hint}>Minimum 12 characters</p>
          </div>
          <div>
            <label htmlFor="confirm-password" class={formStyles.label}>Confirm new password</label>
            <input
              id="confirm-password"
              class={formStyles.input}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onInput={e => setConfirmPassword((e.target as HTMLInputElement).value)}
              onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
            />
          </div>
        </div>
        <div class={styles.formActions}>
          <Button
            variant="primary"
            onClick={handleChangePassword}
            loading={passwordSubmitting}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            Update Password
          </Button>
        </div>
      </section>

      {/* --- Change Email --- */}
      <section class={styles.section} aria-labelledby="email-heading">
        <h2 id="email-heading" class={styles.sectionHeading}>
          <Mail size={18} aria-hidden="true" /> Change Email
        </h2>
        <p class={styles.sectionDescription}>
          Enter your password to confirm the email change.
        </p>

        {emailErr && <p class={styles.feedbackError} role="alert">{emailErr}</p>}
        {emailMsg && <p class={styles.feedbackSuccess} role="status">{emailMsg}</p>}

        <div class={formStyles.fieldGroup}>
          <div>
            <label htmlFor="new-email" class={formStyles.label}>New email address</label>
            <input
              id="new-email"
              class={formStyles.input}
              type="email"
              autoComplete="email"
              value={newEmail}
              onInput={e => setNewEmail((e.target as HTMLInputElement).value)}
              placeholder="new@example.com"
            />
          </div>
          <div>
            <label htmlFor="email-confirm-password" class={formStyles.label}>Current password</label>
            <input
              id="email-confirm-password"
              class={formStyles.input}
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onInput={e => setEmailPassword((e.target as HTMLInputElement).value)}
              onKeyDown={e => { if (e.key === 'Enter') handleChangeEmail(); }}
            />
          </div>
        </div>
        <div class={styles.formActions}>
          <Button
            variant="primary"
            onClick={handleChangeEmail}
            loading={emailSubmitting}
            disabled={!newEmail.trim() || !emailPassword}
          >
            Update Email
          </Button>
        </div>
      </section>

      {/* --- Two-Factor Authentication --- */}
      <TwoFactorSection />

      {/* --- Connected Accounts --- */}
      <section class={styles.section} aria-labelledby="oauth-heading">
        <h2 id="oauth-heading" class={styles.sectionHeading}>
          <Link2 size={18} aria-hidden="true" /> Connected Accounts
        </h2>
        <p class={styles.sectionDescription}>
          Link third-party accounts for faster sign-in.
        </p>

        <div class={styles.providerList}>
          {(['github', 'google'] as const).map(provider => {
            const identity = identities.find(i => i.provider === provider);
            const enabled = enabledProviders[provider];

            return (
              <div key={provider} class={styles.providerRow}>
                <div class={styles.providerInfo}>
                  <span class={styles.providerName}>{provider}</span>
                  {identity ? (
                    <span class={styles.providerEmail}>{identity.provider_email || 'Linked'}</span>
                  ) : (
                    <span class={styles.providerNotLinked}>Not linked</span>
                  )}
                </div>
                {identity ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await api.unlinkOAuthProvider(provider);
                        setIdentities(prev => prev.filter(i => i.provider !== provider));
                      } catch {}
                    }}
                  >
                    Unlink
                  </Button>
                ) : enabled ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/api/v1/auth/oauth/${provider}/authorize`;
                    }}
                  >
                    Link {provider}
                  </Button>
                ) : (
                  <span class={styles.providerNotLinked}>Not configured</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- API Tokens --- */}
      <section class={styles.section} aria-labelledby="tokens-heading">
        <div class={styles.sectionHeader}>
          <h2 id="tokens-heading" class={styles.sectionHeading}>
            <Key size={18} aria-hidden="true" /> API Tokens
          </h2>
          <Button variant="secondary" size="sm" onClick={() => setShowCreateToken(true)}>
            <Plus size={14} aria-hidden="true" /> Create Token
          </Button>
        </div>

        {newTokenValue && (
          <div class={styles.tokenBanner} role="alert">
            <p class={styles.tokenBannerLabel}>Copy your new token — it won't be shown again:</p>
            <div class={styles.tokenRow}>
              <code class={styles.tokenValue}>{newTokenValue}</code>
              <button
                type="button"
                class={styles.iconButton}
                onClick={() => navigator.clipboard.writeText(newTokenValue)}
                aria-label="Copy token to clipboard"
              >
                <Copy size={14} aria-hidden="true" />
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewTokenValue('')}>Dismiss</Button>
          </div>
        )}

        {showCreateToken && (
          <div class={styles.card}>
            {/* a11y [1.3.1]: label associated with input */}
            <label htmlFor="token-name" class={formStyles.label}>Token Name</label>
            <input
              id="token-name"
              class={formStyles.input}
              value={tokenName}
              onInput={e => setTokenName((e.target as HTMLInputElement).value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateToken(); }}
              placeholder="CI/CD pipeline"
            />
            <div class={styles.cardActions}>
              <Button variant="ghost" onClick={() => { setShowCreateToken(false); setTokenName(''); }}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateToken} loading={tokenSubmitting} disabled={!tokenName.trim()}>Create</Button>
            </div>
          </div>
        )}

        <div class={styles.tableCard}>
          <table class={styles.table}>
            <thead>
              <tr class={styles.tableRow}>
                <th class={styles.th}>Name</th>
                <th class={styles.th}>Last Used</th>
                <th class={styles.th}>Expires</th>
                <th class={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id} class={styles.tableRow}>
                  <td class={styles.td}>{t.name}</td>
                  <td class={styles.tdMuted}>{t.last_used_at ? formatRelativeTime(t.last_used_at) : 'Never'}</td>
                  <td class={styles.tdMuted}>{t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'Never'}</td>
                  <td class={styles.td}>
                    <button
                      type="button"
                      onClick={() => handleRevokeToken(t.id)}
                      class={styles.iconButton}
                      aria-label={`Revoke token ${t.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr>
                  <td class={styles.emptyRow} colSpan={4}>No API tokens yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Active Sessions --- */}
      <section class={styles.section} aria-labelledby="sessions-heading">
        <div class={styles.sectionHeader}>
          <h2 id="sessions-heading" class={styles.sectionHeading}>
            <Monitor size={18} aria-hidden="true" /> Active Sessions
          </h2>
          {sessions.length > 1 && (
            <Button variant="ghost" size="sm" onClick={handleRevokeAllSessions} loading={sessionsLoading}>
              <LogOut size={14} aria-hidden="true" /> Sign out everywhere
            </Button>
          )}
        </div>

        {sessionsMsg && <p class={styles.feedbackSuccess} role="status">{sessionsMsg}</p>}

        <div class={styles.tableCard}>
          <table class={styles.table}>
            <thead>
              <tr class={styles.tableRow}>
                <th class={styles.th}>Session</th>
                <th class={styles.th}>Created</th>
                <th class={styles.th}>Expires</th>
                <th class={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} class={styles.tableRow}>
                  <td class={styles.tdMono}>{s.id.slice(0, 8)}...</td>
                  <td class={styles.tdMuted}>{formatRelativeTime(s.created_at)}</td>
                  <td class={styles.tdMuted}>{new Date(s.expires_at).toLocaleDateString()}</td>
                  <td class={styles.td}>
                    {s.is_current && (
                      <span class={styles.currentBadge}>Current</span>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td class={styles.emptyRow} colSpan={4}>No active sessions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Preferences --- */}
      <section class={styles.section} aria-labelledby="preferences-heading">
        <h2 id="preferences-heading" class={styles.sectionHeading}>
          <Settings2 size={18} aria-hidden="true" /> Preferences
        </h2>
        <p class={styles.sectionDescription}>
          Settings synced across all your devices.
        </p>

        <div class={formStyles.fieldGroup}>
          <div>
            <label htmlFor="pref-theme" class={formStyles.label}>Theme</label>
            <select
              id="pref-theme"
              class={formStyles.input}
              value={(preferences.theme as string) || 'system'}
              onChange={async (e) => {
                const theme = (e.target as HTMLSelectElement).value;
                const updated = { ...preferences, theme };
                setPreferences(updated);
                document.documentElement.setAttribute('data-theme', theme === 'system'
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : theme);
                localStorage.setItem('icefall-theme', theme);
                setPrefSaving(true);
                try { await api.updatePreferences({ theme }); } catch {}
                setPrefSaving(false);
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label htmlFor="pref-timezone" class={formStyles.label}>Timezone</label>
            <select
              id="pref-timezone"
              class={formStyles.input}
              value={(preferences.timezone as string) || Intl.DateTimeFormat().resolvedOptions().timeZone}
              onChange={async (e) => {
                const timezone = (e.target as HTMLSelectElement).value;
                setPreferences(prev => ({ ...prev, timezone }));
                setPrefSaving(true);
                try { await api.updatePreferences({ timezone }); } catch {}
                setPrefSaving(false);
              }}
            >
              {Intl.supportedValuesOf('timeZone').map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label class={formStyles.label}>
              <input
                type="checkbox"
                class={formStyles.checkbox}
                checked={preferences.email_notifications !== false}
                onChange={async (e) => {
                  const email_notifications = (e.target as HTMLInputElement).checked;
                  setPreferences(prev => ({ ...prev, email_notifications }));
                  setPrefSaving(true);
                  try { await api.updatePreferences({ email_notifications }); } catch {}
                  setPrefSaving(false);
                }}
              />
              {' '}Email notifications for deploy events
            </label>
          </div>
        </div>
        {prefSaving && <p class={styles.savingIndicator}>Saving...</p>}
      </section>

      {/* --- Danger Zone --- */}
      <section class={styles.section} aria-labelledby="danger-heading">
        <h2 id="danger-heading" class={styles.sectionHeadingDanger}>
          <AlertTriangle size={18} aria-hidden="true" /> Danger Zone
        </h2>
        <p class={styles.sectionDescription}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {deleteErr && <p class={styles.feedbackError} role="alert">{deleteErr}</p>}

        {!deleteConfirm ? (
          <Button variant="danger" onClick={() => setDeleteConfirm(true)}>
            Delete Account
          </Button>
        ) : (
          <div class={styles.dangerCard}>
            <p class={styles.dangerText}>
              Enter your password to confirm account deletion. All your sessions, tokens, and data will be permanently removed.
            </p>
            <div class={formStyles.fieldGroup}>
              <div>
                <label htmlFor="delete-password" class={formStyles.label}>Password</label>
                <input
                  id="delete-password"
                  class={formStyles.input}
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onInput={e => setDeletePassword((e.target as HTMLInputElement).value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && deletePassword) handleDeleteAccount();
                  }}
                />
              </div>
            </div>
            <div class={styles.formActions}>
              <Button variant="ghost" onClick={() => { setDeleteConfirm(false); setDeletePassword(''); setDeleteErr(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                loading={deleteSubmitting}
                disabled={!deletePassword}
              >
                Permanently Delete Account
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  async function handleDeleteAccount() {
    setDeleteErr('');
    setDeleteSubmitting(true);
    try {
      await api.deleteAccount(deletePassword);
      window.location.href = '/login';
    } catch (e: any) {
      setDeleteErr(e.message || 'Failed to delete account');
    }
    setDeleteSubmitting(false);
  }
}
