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
  tags: string | null;
  volumes: string | null;
  image_ref: string | null;
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
  env_snapshot: string | null;
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
  path: string | null;
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

export type ServerMetricsSnapshot = {
  timestamp: string;
  cpu_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
}

export type User = {
  id: string;
  email: string;
  role: 'admin' | 'deployer' | 'viewer';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export type ApiToken = {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export type HealthCheck = {
  id: string;
  app_id: string;
  check_type: string;
  config: string | null;
  interval_secs: number;
  failure_threshold: number;
  auto_restart: boolean;
  created_at: string;
}

export type HealthCheckEvent = {
  id: string;
  health_check_id: string;
  status: 'healthy' | 'unhealthy';
  checked_at: string;
}

export type HealthCheckResult = {
  check: HealthCheck;
  current_status: string;
  uptime_percent: number;
  recent_events: HealthCheckEvent[];
}
