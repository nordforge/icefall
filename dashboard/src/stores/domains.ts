import { atom } from 'nanostores';

export type DomainWithApp = {
  id: string;
  app_id: string;
  domain: string;
  verified: boolean;
  ssl_status: string;
  created_at: string;
  appName: string;
}

export const $domains = atom<DomainWithApp[]>([]);
export const $domainsLoaded = atom(false);
