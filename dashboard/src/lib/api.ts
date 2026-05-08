import type { App, Deploy, Domain, EnvVar, ServerStatus, ServerMetricsSnapshot, User, ApiToken } from './types';

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
  listApps: () => request<{ data: App[] }>('/apps'),

  getApp: (id: string) => request<{ data: App }>(`/apps/${id}`),

  createApp: (body: {
    name: string;
    git_repo?: string;
    git_branch?: string;
    framework?: string;
  }) => request<{ data: App }>('/apps', { method: 'POST', body: JSON.stringify(body) }),

  updateApp: (id: string, body: Partial<App>) =>
    request<{ data: App }>(`/apps/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteApp: (id: string) =>
    request<{ message: string }>(`/apps/${id}`, { method: 'DELETE' }),

  listDeploys: (appId: string) =>
    request<{ data: Deploy[] }>(`/apps/${appId}/deploys`),

  triggerDeploy: (appId: string) =>
    request<{ data: Deploy }>(`/apps/${appId}/deploys`, { method: 'POST' }),

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

  addDomain: (appId: string, domain: string) =>
    request<{ data: Domain }>(
      `/apps/${appId}/domains`,
      { method: 'POST', body: JSON.stringify({ domain }) },
    ),

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

  getServerIp: () => request<{ ip: string }>('/server/ip'),

  getServerMetricsHistory: (limit?: number) =>
    request<{ data: ServerMetricsSnapshot[] }>(
      `/server/metrics/history${limit ? `?limit=${limit}` : ''}`
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
