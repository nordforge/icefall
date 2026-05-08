import { atom } from 'nanostores';
import type { User, ApiToken } from '@lib/types';

export const $users = atom<User[]>([]);
export const $tokens = atom<ApiToken[]>([]);
export const $usersLoaded = atom(false);
