import type { App, Deploy, Domain, EnvVar, Project, ServerStatus, ServerMetricsSnapshot, User, ApiToken, HealthCheckResult } from './types';

const API_BASE = '/api/v1';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || 'Unknown error');
  }
  return res.json();
}

export const api = {
  listApps: (params?: { tag?: string; project_id?: string }) => {
    const search = new URLSearchParams();
    if (params?.tag) search.set('tag', params.tag);
    if (params?.project_id) search.set('project_id', params.project_id);
    const qs = search.toString();
    return request<{ data: App[] }>(`/apps${qs ? `?${qs}` : ''}`);
  },

  getApp: (id: string) => request<{ data: App }>(`/apps/${id}`),

  createApp: (body: {
    name: string;
    git_repo?: string;
    git_branch?: string;
    framework?: string;
    image_ref?: string;
    compose_content?: string;
    port?: number;
    deploy_mode?: string;
  }) => request<{ data: App }>('/apps', { method: 'POST', body: JSON.stringify(body) }),

  updateApp: (id: string, body: Partial<App>) =>
    request<{ data: App }>(`/apps/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteApp: (id: string) =>
    request<{ message: string }>(`/apps/${id}`, { method: 'DELETE' }),

  startApp: (id: string) =>
    request<{ message: string; containers: number }>(`/apps/${id}/start`, { method: 'POST' }),

  stopApp: (id: string) =>
    request<{ message: string; containers: number }>(`/apps/${id}/stop`, { method: 'POST' }),

  restartApp: (id: string) =>
    request<{ message: string; containers: number }>(`/apps/${id}/restart`, { method: 'POST' }),

  listDeploys: (appId: string) =>
    request<{ data: Deploy[] }>(`/apps/${appId}/deploys`),

  triggerDeploy: (appId: string) =>
    request<{ data: Deploy }>(`/apps/${appId}/deploys`, { method: 'POST' }),

  rollbackDeploy: (appId: string, deployId: string) =>
    request<{ data: Deploy }>(`/apps/${appId}/deploys/${deployId}/rollback`, { method: 'POST' }),

  listEnvVars: (appId: string, reveal = false) =>
    request<{ data: EnvVar[] }>(`/apps/${appId}/env${reveal ? '?reveal=true' : ''}`),

  setEnvVar: (appId: string, body: { key: string; value: string; scope?: string }) =>
    request<{ data: { id: string; key: string; scope: string } }>(
      `/apps/${appId}/env`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  deleteEnvVar: (appId: string, varId: string) =>
    request<{ message: string }>(`/apps/${appId}/env/${varId}`, { method: 'DELETE' }),

  importEnv: (appId: string, content: string, scope = 'shared') =>
    request<{ imported: number; skipped: string[] }>(
      `/apps/${appId}/env/import`,
      { method: 'POST', body: JSON.stringify({ content, scope }) },
    ),

  listDomains: (appId: string) =>
    request<{ data: Domain[] }>(`/apps/${appId}/domains`),

  addDomain: (appId: string, domain: string, path?: string) =>
    request<{ data: Domain }>(
      `/apps/${appId}/domains`,
      { method: 'POST', body: JSON.stringify({ domain, path: path || undefined }) },
    ),

  listDatabases: () => request<{ data: any[] }>('/databases'),

  linkDatabase: (dbId: string, appId: string) =>
    request<{ message: string }>(`/databases/${dbId}/link/${appId}`, { method: 'POST' }),

  unlinkDatabase: (dbId: string, appId: string) =>
    request<{ message: string }>(`/databases/${dbId}/link/${appId}`, { method: 'DELETE' }),

  startDatabase: (dbId: string) =>
    request<{ message: string }>(`/databases/${dbId}/start`, { method: 'POST' }),

  stopDatabase: (dbId: string) =>
    request<{ message: string }>(`/databases/${dbId}/stop`, { method: 'POST' }),

  restartDatabase: (dbId: string) =>
    request<{ message: string }>(`/databases/${dbId}/restart`, { method: 'POST' }),

  getHealth: (appId: string) =>
    request<{ data: HealthCheckResult[] }>(`/apps/${appId}/health`),

  updateHealth: (appId: string, body: {
    check_type?: string;
    interval_secs?: number;
    failure_threshold?: number;
    auto_restart?: boolean;
    config?: string;
  }) =>
    request<{ data: any }>(`/apps/${appId}/health`, { method: 'PUT', body: JSON.stringify(body) }),

  getServerStatus: () => request<ServerStatus>('/server/status'),

  deleteDomain: (appId: string, domainId: string) =>
    request<{ message: string }>(`/apps/${appId}/domains/${domainId}`, { method: 'DELETE' }),

  listUsers: () => request<{ data: User[] }>('/users'),

  getMe: () => request<{ data: User }>('/users/me'),

  inviteUser: (email: string, role: string) =>
    request<{ data: { invite_token: string } }>(
      '/users/invite',
      { method: 'POST', body: JSON.stringify({ email, role }) },
    ),

  changeRole: (userId: string, role: string) =>
    request<{ data: User }>(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  deactivateUser: (userId: string) =>
    request<{ message: string }>(`/users/${userId}`, { method: 'DELETE' }),

  listTokens: () => request<{ data: ApiToken[] }>('/tokens'),

  createToken: (name: string, expiresAt?: string) =>
    request<{ data: ApiToken & { token: string } }>(
      '/tokens',
      { method: 'POST', body: JSON.stringify({ name, expires_at: expiresAt }) },
    ),

  revokeToken: (tokenId: string) =>
    request<{ message: string }>(`/tokens/${tokenId}`, { method: 'DELETE' }),

  getInstanceBackupConfig: () =>
    request<{ data: { enabled: boolean; cron_schedule: string; retention_count: number } }>(
      '/settings/instance-backup'
    ),

  updateInstanceBackupConfig: (body: {
    enabled?: boolean;
    cron_schedule?: string;
    retention_count?: number;
  }) =>
    request<{ data: { enabled: boolean; cron_schedule: string; retention_count: number } }>(
      '/settings/instance-backup',
      { method: 'PUT', body: JSON.stringify(body) },
    ),

  triggerInstanceBackup: () =>
    request<{ message: string; status: string }>(
      '/settings/instance-backup/trigger',
      { method: 'POST' },
    ),

  listInstanceBackupHistory: () =>
    request<{
      data: Array<{
        id: string;
        filename: string;
        size_bytes: number;
        status: string;
        error_message: string | null;
        s3_key: string | null;
        started_at: string;
        finished_at: string | null;
      }>;
    }>('/settings/instance-backup/history'),

  getServerIp: () => request<{ ip: string }>('/server/ip'),

  getServerMetricsHistory: (limit?: number) =>
    request<{ data: ServerMetricsSnapshot[] }>(
      `/server/metrics/history${limit ? `?limit=${limit}` : ''}`
    ),

  getServerMetricsRange: (from: string, to: string, limit?: number) =>
    request<{ data: ServerMetricsSnapshot[]; total: number }>(
      `/server/metrics/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${limit ? `&limit=${limit}` : ''}`
    ),

  listDbTables: (dbId: string) =>
    request<{ data: string[]; types?: Record<string, string> }>(`/databases/${dbId}/tables`),

  queryDb: (dbId: string, query: string) =>
    request<{ columns?: string[]; rows?: string[][]; documents?: any[]; row_count: number }>(
      `/databases/${dbId}/query`,
      { method: 'POST', body: JSON.stringify({ query }) },
    ),

  // Projects
  listProjects: () =>
    request<{ data: Project[] }>('/projects'),

  getProject: (id: string) =>
    request<{ data: Project & { apps: App[]; databases: any[] } }>(`/projects/${id}`),

  createProject: (body: { name: string; description?: string; color?: string }) =>
    request<{ data: Project }>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  updateProject: (id: string, body: { name?: string; description?: string | null; color?: string | null }) =>
    request<{ data: Project }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteProject: (id: string) =>
    request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // 2FA
  setup2fa: () =>
    request<{ data: { secret: string; qr_svg: string; otpauth_url: string } }>(
      '/auth/2fa/setup',
      { method: 'POST' },
    ),

  verify2fa: (code: string) =>
    request<{ data: { totp_enabled: boolean; backup_codes: string[] }; warning: string }>(
      '/auth/2fa/verify',
      { method: 'POST', body: JSON.stringify({ code }) },
    ),

  validate2fa: (userId: string, code: string) =>
    request<{ data: { user: User; session_id: string } }>(
      '/auth/2fa/validate',
      { method: 'POST', body: JSON.stringify({ user_id: userId, code }) },
    ),

  regenerateBackupCodes: (code: string) =>
    request<{ data: { backup_codes: string[] }; warning: string }>(
      '/auth/2fa/backup-codes',
      { method: 'POST', body: JSON.stringify({ code }) },
    ),

  disable2fa: (code: string) =>
    request<{ message: string }>(
      '/auth/2fa',
      { method: 'DELETE', body: JSON.stringify({ code }) },
    ),

  // OAuth
  getEnabledOAuthProviders: () =>
    request<{ data: { github: boolean; google: boolean } }>(
      '/settings/oauth/providers',
    ),

  listOAuthIdentities: () =>
    request<{ data: Array<{ id: string; provider: string; provider_email: string | null; created_at: string }> }>(
      '/auth/oauth/identities',
    ),

  unlinkOAuthProvider: (provider: string) =>
    request<{ message: string }>(
      `/auth/oauth/${provider}/unlink`,
      { method: 'DELETE' },
    ),

  getOAuthSettings: () =>
    request<{ data: {
      github_client_id: string | null;
      github_has_secret: boolean;
      github_enabled: boolean;
      github_callback_url: string;
      google_client_id: string | null;
      google_has_secret: boolean;
      google_enabled: boolean;
      google_callback_url: string;
    } }>('/settings/oauth'),

  updateOAuthSettings: (body: {
    github_client_id?: string;
    github_client_secret?: string;
    github_enabled?: boolean;
    google_client_id?: string;
    google_client_secret?: string;
    google_enabled?: boolean;
  }) =>
    request<{ data: any; message: string }>(
      '/settings/oauth',
      { method: 'PUT', body: JSON.stringify(body) },
    ),

  // Volumes
  listVolumes: (appId: string) =>
    request<{ data: Array<{ source: string; target: string; read_only: boolean }> }>(
      `/apps/${appId}/volumes`,
    ),

  browseVolume: (appId: string, mountIndex: number, path = '/') =>
    request<{
      data: Array<{ name: string; size: number; modified: string; is_dir: boolean; permissions: string }>;
      path: string;
      mount_target: string;
    }>(`/apps/${appId}/volumes/${mountIndex}/browse?path=${encodeURIComponent(path)}`),

  volumeSize: (appId: string, mountIndex: number) =>
    request<{ data: { bytes_used: number; mount_target: string } }>(
      `/apps/${appId}/volumes/${mountIndex}/size`,
    ),

  deleteVolumeFile: (appId: string, mountIndex: number, path: string) =>
    request<{ message: string; path: string }>(
      `/apps/${appId}/volumes/${mountIndex}/delete`,
      { method: 'POST', body: JSON.stringify({ path }) },
    ),
};

export { ApiError };
