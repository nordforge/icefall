import { atom } from 'nanostores';

export type UpdateInfo = {
  available: boolean;
  current_version: string;
  latest_version: string | null;
  changelog_highlights: string[];
  changelog_url: string | null;
  breaking: boolean;
  breaking_changes: string | null;
  published_at: string | null;
  checked_at: string;
};

export type UpdateStepName =
  | 'checking_compatibility'
  | 'creating_backup'
  | 'downloading'
  | 'verifying_integrity'
  | 'applying_migrations'
  | 'restarting'
  | 'verifying_health';

export type UpdateStep = {
  name: UpdateStepName;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number | null;
  duration_secs: number | null;
  error: string | null;
};

export type UpdateStatus = {
  state: 'idle' | 'downloading' | 'applying' | 'completed' | 'failed';
  target_version: string | null;
  steps: UpdateStep[];
  error: string | null;
};

export const $updateInfo = atom<UpdateInfo | null>(null);
export const $updateStatus = atom<UpdateStatus | null>(null);
export const $updateDialogOpen = atom(false);
