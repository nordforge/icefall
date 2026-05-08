import { atom } from 'nanostores';

export type ManagedDb = {
  id: string;
  name: string;
  db_type: string;
  container_id: string | null;
  credentials: string;
  backup_schedule: string | null;
  app_id: string | null;
  created_at: string;
}

export const $databases = atom<ManagedDb[]>([]);
export const $databasesLoaded = atom(false);
