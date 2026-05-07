import { atom } from 'nanostores';
import type { ServerStatus } from '@lib/types';

export const $serverStatus = atom<ServerStatus | null>(null);
