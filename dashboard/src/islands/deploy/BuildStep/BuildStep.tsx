import type { BuildStep } from '@lib/types';
import { formatDuration } from '@lib/format';
import { Check, Circle, Loader, X, ChevronDown, ChevronRight } from 'lucide-preact';
import { useRef, useEffect } from 'preact/hooks';
import styles from './build-step.module.css';

type Props = {
  step: BuildStep;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const STATUS_ICON = {
  done: { Icon: Check, color: 'var(--color-success)' },
  running: { Icon: Loader, color: 'var(--color-primary)' },
  pending: { Icon: Circle, color: 'var(--color-text-muted)' },
  failed: { Icon: X, color: 'var(--color-error)' },
};

export default function BuildStepRow({ step, expanded, onToggle }: Props) {
  const { Icon, color } = STATUS_ICON[step.status] || STATUS_ICON.pending;
  const outputRef = useRef<HTMLDivElement>(null);

  const duration = step.started_at && step.finished_at
    ? (new Date(step.finished_at).getTime() - new Date(step.started_at).getTime()) / 1000
    : null;

  useEffect(() => {
    if (expanded && outputRef.current && step.status === 'running') {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [step.output.length, expanded]);

  return (
    <div class={styles.wrapper}>
      <button
        onClick={onToggle}
        class={styles.toggle}
        aria-expanded={expanded}
      >
        {/* a11y [WCAG 1.4.1]: icon is decorative; status conveyed by sr-only text */}
        <Icon size={16} style={{ color }} class={styles.statusIcon} aria-hidden="true" />
        <span class="sr-only">Status: {step.status}</span>
        <span class={styles.stepName}>{step.name}</span>
        {duration && (
          <span class={styles.duration}>
            {formatDuration(duration)}
          </span>
        )}
        {step.status === 'running' && (
          <span class={styles.duration}>
            ...
          </span>
        )}
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && step.output.length > 0 && (
        <div
          ref={outputRef}
          class={styles.output}
        >
          {step.output.map((line, i) => (
            <div key={i}>
              <span class={styles.linePrefix}>$</span>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
