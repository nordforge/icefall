import { atom } from 'nanostores';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

export const $toasts = atom<Toast[]>([]);

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  error: 8000,
  warning: 8000,
};

let counter = 0;

export function addToast(type: ToastType, message: string, duration?: number): void {
  const id = `toast-${++counter}-${Date.now()}`;
  const toast: Toast = {
    id,
    type,
    message,
    duration: duration ?? DEFAULT_DURATIONS[type],
  };
  $toasts.set([...$toasts.get(), toast]);
}

export function removeToast(id: string): void {
  $toasts.set($toasts.get().filter((t) => t.id !== id));
}
