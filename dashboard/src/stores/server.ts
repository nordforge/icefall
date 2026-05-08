import { atom } from 'nanostores';
import type { ServerStatus, ServerMetricsSnapshot } from '@lib/types';

export const $serverStatus = atom<ServerStatus | null>(null);
export const $serverMetricsHistory = atom<ServerMetricsSnapshot[]>([]);
export const $serverMetricsRange = atom<ServerMetricsSnapshot[]>([]);
