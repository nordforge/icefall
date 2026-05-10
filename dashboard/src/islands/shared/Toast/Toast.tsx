import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-preact';
import { $toasts, removeToast } from '@stores/toast';
import type { Toast as ToastItem, ToastType } from '@stores/toast';
import styles from './toast.module.css';

const ICON_MAP: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

function ToastEntry({ toast }: { toast: ToastItem }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
    }, toast.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.duration]);

  function handleClose() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
  }

  function handleAnimationEnd() {
    if (exiting) {
      removeToast(toast.id);
    }
  }

  const Icon = ICON_MAP[toast.type];
  const classes = [
    styles.toast,
    styles[toast.type],
    exiting ? styles.exit : styles.enter,
  ].join(' ');

  return (
    <div
      class={classes}
      role="status"
      onAnimationEnd={handleAnimationEnd}
    >
      <Icon size={18} aria-hidden="true" class={styles.icon} />
      <span class={styles.message}>{toast.message}</span>
      <button
        type="button"
        class={styles.close}
        onClick={handleClose}
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Toast() {
  const toasts = useStore($toasts);

  return (
    <div class={styles.container} aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastEntry key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
