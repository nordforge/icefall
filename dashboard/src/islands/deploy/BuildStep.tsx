import type { BuildStep } from '../../lib/types';
import { formatDuration } from '../../lib/format';
import { Check, Circle, Loader, X, ChevronDown, ChevronRight } from 'lucide-preact';
import { useRef, useEffect } from 'preact/hooks';

interface Props {
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
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface)',
          border: 'none',
          color: 'var(--color-text)',
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          gap: 'var(--space-3)',
        }}
        aria-expanded={expanded}
      >
        <Icon size={16} style={{ color, flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 'var(--weight-medium)' }}>{step.name}</span>
        {duration && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {formatDuration(duration)}
          </span>
        )}
        {step.status === 'running' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            ...
          </span>
        )}
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && step.output.length > 0 && (
        <div
          ref={outputRef}
          style={{
            background: 'var(--color-surface-invert)',
            color: 'var(--color-text-invert)',
            padding: 'var(--space-4)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.7,
            maxHeight: 300,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {step.output.map((line, i) => (
            <div key={i}>
              <span style={{ color: 'var(--color-text-muted)', userSelect: 'none', marginRight: 'var(--space-3)' }}>$</span>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
