import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $users, $tokens, $usersLoaded } from '@stores/users';
import { api } from '@lib/api';
import type { User, ApiToken, RegistrationSettings } from '@lib/types';
import { formatRelativeTime } from '@lib/format';
import Button from '@islands/shared/Button/Button';
import StatusDot from '@islands/shared/StatusDot/StatusDot';
import { UserPlus, Key, Trash2, Copy, ShieldCheck, ShieldOff, RotateCcw, KeyRound } from 'lucide-preact';
import styles from './users-page.module.css';
import formStyles from '@styles/form.module.css';

export default function UsersPage() {
  const cachedUsers = useStore($users);
  const cachedTokens = useStore($tokens);
  const wasLoaded = useStore($usersLoaded);
  const [users, setUsers] = useState<User[]>(cachedUsers);
  const [tokens, setTokens] = useState<ApiToken[]>(cachedTokens);
  const [loading, setLoading] = useState(!wasLoaded);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('deployer');
  const [tokenName, setTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Registration settings
  const [regSettings, setRegSettings] = useState<RegistrationSettings>({
    allow_registration: false,
    allowed_domains: null,
    default_role: 'viewer',
  });
  const [regLoading, setRegLoading] = useState(true);
  const [regSaving, setRegSaving] = useState(false);
  const [domainsInput, setDomainsInput] = useState('');

  // Password reset modal
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    userId: string;
    email: string;
    tempPassword?: string;
  } | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  // 2FA reset confirm
  const [reset2faConfirm, setReset2faConfirm] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [resetting2fa, setResetting2fa] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listUsers().then(({ data }) => { setUsers(data); $users.set(data); }).catch(() => {}),
      api.listTokens().then(({ data }) => { setTokens(data); $tokens.set(data); }).catch(() => {}),
      api.getRegistrationSettings().then(({ data }) => {
        setRegSettings(data);
        setDomainsInput(data.allowed_domains || '');
      }).catch(() => {}),
    ]).then(() => {
      setLoading(false);
      setRegLoading(false);
      $usersLoaded.set(true);
    });
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    try {
      await api.inviteUser(inviteEmail.trim(), inviteRole);
      const { data } = await api.listUsers();
      setUsers(data);
      setInviteEmail('');
      setShowInvite(false);
    } catch {}
    setSubmitting(false);
  }

  async function handleChangeRole(userId: string, role: string) {
    try {
      await api.changeRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as User['role'] } : u));
    } catch {}
  }

  async function handleDeactivate(userId: string) {
    try {
      await api.deactivateUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
    } catch {}
  }

  async function handleResetPassword() {
    if (!resetPasswordModal) return;
    setResettingPassword(true);
    try {
      const { data } = await api.resetUserPassword(resetPasswordModal.userId);
      setResetPasswordModal({
        ...resetPasswordModal,
        tempPassword: data.temporary_password,
      });
    } catch {}
    setResettingPassword(false);
  }

  async function handleReset2fa() {
    if (!reset2faConfirm) return;
    setResetting2fa(true);
    try {
      await api.resetUser2fa(reset2faConfirm.userId);
      setUsers(prev =>
        prev.map(u =>
          u.id === reset2faConfirm.userId ? { ...u, totp_enabled: false } : u,
        ),
      );
      setReset2faConfirm(null);
    } catch {}
    setResetting2fa(false);
  }

  async function handleSaveRegSettings() {
    setRegSaving(true);
    try {
      const { data } = await api.updateRegistrationSettings({
        allow_registration: regSettings.allow_registration,
        allowed_domains: domainsInput.trim() || undefined,
        default_role: regSettings.default_role,
      });
      setRegSettings(data);
      setDomainsInput(data.allowed_domains || '');
    } catch {}
    setRegSaving(false);
  }

  async function handleCreateToken() {
    if (!tokenName.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.createToken(tokenName.trim());
      setNewTokenValue(data.token);
      const { data: refreshed } = await api.listTokens();
      setTokens(refreshed);
      setTokenName('');
      setShowCreateToken(false);
    } catch {}
    setSubmitting(false);
  }

  async function handleRevokeToken(tokenId: string) {
    try {
      await api.revokeToken(tokenId);
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch {}
  }

  return (
    <div>
      <div class={styles.pageHeader}>
        <h1 class={styles.pageTitle}>Users & Tokens</h1>
      </div>

      {loading ? (
        <p class={styles.loadingText}>Loading...</p>
      ) : (
        <>
          {/* Registration Settings */}
          <section class={styles.section}>
            <div class={styles.sectionHeader}>
              <h2 class={styles.sectionTitle}>Registration Settings</h2>
            </div>

            {regLoading ? (
              <p class={styles.loadingText}>Loading settings...</p>
            ) : (
              <div class={styles.card}>
                <div class={styles.settingsGrid}>
                  <div class={styles.settingRow}>
                    <label htmlFor="allow-registration" class={formStyles.label}>
                      Allow public registration
                    </label>
                    <button
                      id="allow-registration"
                      type="button"
                      role="switch"
                      aria-checked={regSettings.allow_registration}
                      class={`${styles.toggle} ${regSettings.allow_registration ? styles.toggleOn : ''}`}
                      onClick={() =>
                        setRegSettings(prev => ({
                          ...prev,
                          allow_registration: !prev.allow_registration,
                        }))
                      }
                    >
                      <span class={styles.toggleThumb} />
                    </button>
                  </div>

                  {regSettings.allow_registration && (
                    <div class={styles.settingRow}>
                      <label htmlFor="allowed-domains" class={formStyles.label}>
                        Allowed email domains
                      </label>
                      <input
                        id="allowed-domains"
                        class={formStyles.input}
                        type="text"
                        value={domainsInput}
                        onInput={e =>
                          setDomainsInput((e.target as HTMLInputElement).value)
                        }
                        placeholder="company.com, example.org"
                      />
                      <p class={styles.settingHint}>
                        Comma-separated list. Leave empty to allow any domain.
                      </p>
                    </div>
                  )}

                  <div class={styles.settingRow}>
                    <label htmlFor="default-role" class={formStyles.label}>
                      Default role for new users
                    </label>
                    <select
                      id="default-role"
                      class={formStyles.select}
                      value={regSettings.default_role}
                      onChange={e =>
                        setRegSettings(prev => ({
                          ...prev,
                          default_role: (e.target as HTMLSelectElement).value,
                        }))
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="deployer">Deployer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div class={styles.cardActions}>
                  <Button
                    variant="primary"
                    onClick={handleSaveRegSettings}
                    loading={regSaving}
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Team Members */}
          <section class={styles.section}>
            <div class={styles.sectionHeader}>
              <h2 class={styles.sectionTitle}>Team Members</h2>
              <Button variant="primary" onClick={() => setShowInvite(true)}>
                <UserPlus size={14} aria-hidden="true" /> Invite
              </Button>
            </div>

            {showInvite && (
              <div class={styles.card}>
                <div class={formStyles.fieldRow}>
                  <div>
                    <label htmlFor="invite-email" class={formStyles.label}>Email</label>
                    <input id="invite-email" class={formStyles.input} type="email" autoComplete="email" value={inviteEmail} onInput={e => setInviteEmail((e.target as HTMLInputElement).value)} placeholder="colleague@example.com" />
                  </div>
                  <div>
                    <label htmlFor="invite-role" class={formStyles.label}>Role</label>
                    <select id="invite-role" class={formStyles.select} value={inviteRole} onChange={e => setInviteRole((e.target as HTMLSelectElement).value)}>
                      <option value="admin">Admin</option>
                      <option value="deployer">Deployer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div class={styles.cardActions}>
                  <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleInvite} loading={submitting} disabled={!inviteEmail.trim()}>Send Invite</Button>
                </div>
              </div>
            )}

            <div class={styles.tableCard}>
              <table class={styles.table}>
                <thead>
                  <tr class={styles.tableRow}>
                    <th class={styles.th}>Email</th>
                    <th class={styles.th}>Role</th>
                    <th class={styles.th}>2FA</th>
                    <th class={styles.th}>Status</th>
                    <th class={styles.th}>Last Login</th>
                    <th class={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} class={styles.tableRow}>
                      <td class={styles.td}>{u.email}</td>
                      <td class={styles.td}>
                        <select
                          class={styles.roleSelect}
                          value={u.role}
                          onChange={e => handleChangeRole(u.id, (e.target as HTMLSelectElement).value)}
                          aria-label={`Role for ${u.email}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="deployer">Deployer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td class={styles.td}>
                        {/* a11y [1.1.1]: non-text content has accessible name via aria-label */}
                        {u.totp_enabled ? (
                          <span class={styles.badge2faOn} aria-label="2FA enabled" title="2FA enabled">
                            <ShieldCheck size={14} aria-hidden="true" /> On
                          </span>
                        ) : (
                          <span class={styles.badge2faOff} aria-label="2FA disabled" title="2FA disabled">
                            <ShieldOff size={14} aria-hidden="true" /> Off
                          </span>
                        )}
                      </td>
                      <td class={styles.td}>
                        <StatusDot status={u.is_active ? 'online' : 'stopped'} />
                      </td>
                      <td class={styles.tdMuted}>{u.last_login_at ? formatRelativeTime(u.last_login_at) : 'Never'}</td>
                      <td class={styles.td}>
                        <div class={styles.actionRow}>
                          <button
                            type="button"
                            onClick={() => setResetPasswordModal({ userId: u.id, email: u.email })}
                            class={styles.iconButton}
                            aria-label={`Reset password for ${u.email}`}
                            title="Reset password"
                          >
                            <KeyRound size={14} aria-hidden="true" />
                          </button>
                          {u.totp_enabled && (
                            <button
                              type="button"
                              onClick={() => setReset2faConfirm({ userId: u.id, email: u.email })}
                              class={styles.iconButton}
                              aria-label={`Reset 2FA for ${u.email}`}
                              title="Reset 2FA"
                            >
                              <RotateCcw size={14} aria-hidden="true" />
                            </button>
                          )}
                          {u.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(u.id)}
                              class={styles.iconButton}
                              aria-label={`Deactivate ${u.email}`}
                              title="Deactivate user"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td class={styles.emptyRow} colSpan={6}>No users yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Password Reset Modal */}
          {resetPasswordModal && (
            <div class={styles.overlay} role="dialog" aria-modal="true" aria-label="Reset password">
              <div class={styles.modal}>
                <h3 class={styles.modalTitle}>Reset Password</h3>
                {resetPasswordModal.tempPassword ? (
                  <>
                    <p class={styles.modalText}>
                      A temporary password has been generated for <strong>{resetPasswordModal.email}</strong>.
                      Share it securely -- it will not be shown again.
                    </p>
                    <div class={styles.tokenRow}>
                      <code class={styles.tokenValue}>{resetPasswordModal.tempPassword}</code>
                      <button
                        type="button"
                        class={styles.iconButton}
                        onClick={() => navigator.clipboard.writeText(resetPasswordModal.tempPassword!)}
                        aria-label="Copy temporary password"
                      >
                        <Copy size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <div class={styles.cardActions}>
                      <Button variant="ghost" onClick={() => setResetPasswordModal(null)}>
                        Close
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p class={styles.modalText}>
                      This will generate a new temporary password for <strong>{resetPasswordModal.email}</strong> and
                      invalidate all their existing sessions.
                    </p>
                    <div class={styles.cardActions}>
                      <Button variant="ghost" onClick={() => setResetPasswordModal(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleResetPassword}
                        loading={resettingPassword}
                      >
                        Generate Temporary Password
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2FA Reset Confirm */}
          {reset2faConfirm && (
            <div class={styles.overlay} role="dialog" aria-modal="true" aria-label="Reset two-factor authentication">
              <div class={styles.modal}>
                <h3 class={styles.modalTitle}>Reset 2FA</h3>
                <p class={styles.modalText}>
                  This will disable two-factor authentication for <strong>{reset2faConfirm.email}</strong> and
                  invalidate all their sessions. They will need to set up 2FA again on their next login.
                </p>
                <div class={styles.cardActions}>
                  <Button variant="ghost" onClick={() => setReset2faConfirm(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleReset2fa}
                    loading={resetting2fa}
                  >
                    Reset 2FA
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* API Tokens */}
          <section class={styles.section}>
            <div class={styles.sectionHeader}>
              <h2 class={styles.sectionTitle}>API Tokens</h2>
              <Button variant="primary" onClick={() => setShowCreateToken(true)}>
                <Key size={14} aria-hidden="true" /> Create Token
              </Button>
            </div>

            {newTokenValue && (
              <div class={styles.tokenBanner} role="alert">
                <p class={styles.tokenBannerLabel}>Copy your new token -- it won't be shown again:</p>
                <div class={styles.tokenRow}>
                  <code class={styles.tokenValue}>{newTokenValue}</code>
                  <button type="button" class={styles.iconButton} onClick={() => { navigator.clipboard.writeText(newTokenValue); }} aria-label="Copy token">
                    <Copy size={14} aria-hidden="true" />
                  </button>
                </div>
                <Button variant="ghost" onClick={() => setNewTokenValue('')}>Dismiss</Button>
              </div>
            )}

            {showCreateToken && (
              <div class={styles.card}>
                <label htmlFor="token-name" class={formStyles.label}>Token Name</label>
                <input id="token-name" class={formStyles.input} value={tokenName} onInput={e => setTokenName((e.target as HTMLInputElement).value)} placeholder="CI/CD pipeline" />
                <div class={styles.cardActions}>
                  <Button variant="ghost" onClick={() => setShowCreateToken(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleCreateToken} loading={submitting} disabled={!tokenName.trim()}>Create</Button>
                </div>
              </div>
            )}

            <div class={styles.tableCard}>
              <table class={styles.table}>
                <thead>
                  <tr class={styles.tableRow}>
                    <th class={styles.th}>Name</th>
                    <th class={styles.th}>Prefix</th>
                    <th class={styles.th}>Last Used</th>
                    <th class={styles.th}>Expires</th>
                    <th class={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(t => (
                    <tr key={t.id} class={styles.tableRow}>
                      <td class={styles.td}>{t.name}</td>
                      <td class={styles.tdMono}>{t.prefix}...</td>
                      <td class={styles.tdMuted}>{t.last_used_at ? formatRelativeTime(t.last_used_at) : 'Never'}</td>
                      <td class={styles.tdMuted}>{t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'Never'}</td>
                      <td class={styles.td}>
                        <button type="button" onClick={() => handleRevokeToken(t.id)} class={styles.iconButton} aria-label={`Revoke ${t.name}`}>
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tokens.length === 0 && (
                    <tr>
                      <td class={styles.emptyRow} colSpan={5}>No API tokens yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
