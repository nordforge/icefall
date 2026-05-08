import type { App, Deploy, Domain, EnvVar, ServerStatus, ServerMetricsSnapshot, User, ApiToken, HealthCheckResult } from './types';

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
  listApps: (tag?: string) =>
    request<{ data: App[] }>(`/apps${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`),

  getApp: (id: string) => request<{ data: App }>(`/apps/${id}`),

  createApp: (body: {
    name: string;
    git_repo?: string;
    git_branch?: string;
    framework?: string;
    image_ref?: string;
    port?: number;
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
};

export { ApiError };
