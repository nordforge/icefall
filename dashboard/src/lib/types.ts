export type App = {
  id: string;
  name: string;
  git_repo: string | null;
  git_branch: string;
  framework: string | null;
  build_config: string | null;
  resource_limits: string | null;
  preview_enabled: boolean;
  preview_branch_pattern: string | null;
  webhook_secret: string | null;
  created_at: string;
  updated_at: string;
}

export type Deploy = {
  id: string;
  app_id: string;
  environment_id: string;
  status: DeployStatus;
  git_sha: string | null;
  build_log: string | null;
  started_at: string | null;
  finished_at: string | null;
  image_ref: string | null;
  container_id: string | null;
  created_at: string;
}

export type DeployStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'running'
  | 'failed'
  | 'stopped'
  | 'cancelled';

export type EnvVar = {
  id: string;
  key: string;
  value: string;
  scope: 'shared' | 'production' | 'preview';
  created_at: string;
}

export type Domain = {
  id: string;
  app_id: string;
  domain: string;
  verified: boolean;
  ssl_status: string;
  created_at: string;
}

export type ServerStatus = {
  status: string;
  version: string;
  cpu_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
}

export type BuildStep = {
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  started_at: string | null;
  finished_at: string | null;
  output: string[];
}

export type AppStatus = 'online' | 'building' | 'deploying' | 'failed' | 'stopped';
