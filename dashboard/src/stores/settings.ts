import { atom } from 'nanostores';

export type SettingsData = {
  base_domain: string | null;
  version: string;
}

export type NotificationChannel = {
  id: string;
  channel_type: string;
  config: Record<string, string>;
  created_at: string;
}

export const $settings = atom<SettingsData | null>(null);
export const $channels = atom<NotificationChannel[]>([]);
export const $settingsLoaded = atom(false);
