import { atom } from 'nanostores';
import type { App } from '@lib/types';

export const $apps = atom<App[]>([]);
export const $appsLoading = atom(true);
