import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { X } from 'lucide-preact';
import styles from './keyboard-shortcuts.module.css';

type Shortcut = {
  keys: string[];
  label: string;
  action: () => void;
};

const NAV_SHORTCUTS: Shortcut[] = [
  { keys: ['g', 'h'], label: 'Go home', action: () => { window.location.href = '/'; } },
  { keys: ['g', 'd'], label: 'Go to databases', action: () => { window.location.href = '/databases'; } },
  { keys: ['g', 's'], label: 'Go to server', action: () => { window.location.href = '/server'; } },
  { keys: ['g', 'p'], label: 'Go to projects', action: () => { window.location.href = '/projects'; } },
  { keys: ['g', 'u'], label: 'Go to users', action: () => { window.location.href = '/users'; } },
  { keys: ['g', 'e'], label: 'Go to settings', action: () => { window.location.href = '/settings'; } },
];

const ACTION_SHORTCUTS: Shortcut[] = [
  { keys: ['c', 'a'], label: 'Create app', action: () => { window.location.href = '/apps/new'; } },
  { keys: ['c', 'd'], label: 'Create database', action: () => { window.location.href = '/databases?create=true'; } },
];

const ALL_SHORTCUTS = [...NAV_SHORTCUTS, ...ACTION_SHORTCUTS];

/** Check if focus is in a text-entry field where shortcuts should not fire. */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: save previous focus and move to close button on open
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => {
      closeRef.current?.focus();
    });
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  return (
    <div class={styles.backdrop} onClick={onClose}>
      {/* a11y [WCAG 4.1.2]: dialog role with aria-modal and labelling */}
      <div
        ref={dialogRef}
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div class={styles.header}>
          <h2 class={styles.title}>Keyboard Shortcuts</h2>
          <button
            ref={closeRef}
            type="button"
            class={styles.closeButton}
            onClick={onClose}
            aria-label="Close shortcuts help"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>Navigation</h3>
          <div class={styles.shortcutList}>
            {NAV_SHORTCUTS.map((s) => (
              <div key={s.label} class={styles.shortcutRow}>
                <span class={styles.shortcutLabel}>{s.label}</span>
                <div class={styles.keys}>
                  {s.keys.map((k, i) => (
                    <>
                      <kbd class={styles.kbd}>{k}</kbd>
                      {i < s.keys.length - 1 && <span class={styles.separator}>then</span>}
                    </>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>Actions</h3>
          <div class={styles.shortcutList}>
            {ACTION_SHORTCUTS.map((s) => (
              <div key={s.label} class={styles.shortcutRow}>
                <span class={styles.shortcutLabel}>{s.label}</span>
                <div class={styles.keys}>
                  {s.keys.map((k, i) => (
                    <>
                      <kbd class={styles.kbd}>{k}</kbd>
                      {i < s.keys.length - 1 && <span class={styles.separator}>then</span>}
                    </>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div class={styles.section}>
          <h3 class={styles.sectionTitle}>General</h3>
          <div class={styles.shortcutList}>
            <div class={styles.shortcutRow}>
              <span class={styles.shortcutLabel}>Show this help</span>
              <div class={styles.keys}>
                <kbd class={styles.kbd}>?</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire in text fields
      if (isEditableTarget(e.target)) return;
      // Don't fire with modifiers (except Shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // ? key opens help (Shift + / or ? directly)
      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // If help modal is open, don't process shortcuts
      if (showHelp) return;

      // Two-key sequence handling
      if (pendingKeyRef.current) {
        const combo = pendingKeyRef.current + key;
        pendingKeyRef.current = null;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const match = ALL_SHORTCUTS.find(
          (s) => s.keys[0] + s.keys[1] === combo
        );
        if (match) {
          e.preventDefault();
          match.action();
        }
        return;
      }

      // Check if this could be a first key of a sequence
      const isFirstKey = ALL_SHORTCUTS.some((s) => s.keys[0] === key);
      if (isFirstKey) {
        pendingKeyRef.current = key;
        // Reset after 500ms if no second key
        timeoutRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
          timeoutRef.current = null;
        }, 500);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showHelp]);

  if (showHelp) {
    return <ShortcutHelp onClose={() => setShowHelp(false)} />;
  }

  return null;
}
