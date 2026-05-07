import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import type { User, ApiToken } from '@lib/types';
import { formatRelativeTime } from '@lib/format';
import Button from '@islands/shared/Button/Button';
import StatusDot from '@islands/shared/StatusDot/StatusDot';
import { UserPlus, Key, Trash2, Copy } from 'lucide-preact';
import styles from './users-page.module.css';
import formStyles from '@styles/form.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('deployer');
  const [tokenName, setTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listUsers().then(({ data }) => setUsers(data)).catch(() => {}),
      api.listTokens().then(({ data }) => setTokens(data)).catch(() => {}),
    ]).then(() => setLoading(false));
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
                        <StatusDot status={u.is_active ? 'online' : 'stopped'} />
                      </td>
                      <td class={styles.tdMuted}>{u.last_login_at ? formatRelativeTime(u.last_login_at) : 'Never'}</td>
                      <td class={styles.td}>
                        {u.is_active && (
                          <button type="button" onClick={() => handleDeactivate(u.id)} class={styles.iconButton} aria-label={`Deactivate ${u.email}`}>
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td class={styles.emptyRow} colSpan={5}>No users yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section class={styles.section}>
            <div class={styles.sectionHeader}>
              <h2 class={styles.sectionTitle}>API Tokens</h2>
              <Button variant="primary" onClick={() => setShowCreateToken(true)}>
                <Key size={14} aria-hidden="true" /> Create Token
              </Button>
            </div>

            {newTokenValue && (
              <div class={styles.tokenBanner} role="alert">
                <p class={styles.tokenBannerLabel}>Copy your new token — it won't be shown again:</p>
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
