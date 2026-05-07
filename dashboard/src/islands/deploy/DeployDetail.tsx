import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { createSSEClient } from '../../lib/sse';
import type { Deploy, BuildStep } from '../../lib/types';
import { formatDuration, shortSha, formatRelativeTime } from '../../lib/format';
import StatusDot from '../shared/StatusDot';
import Button from '../shared/Button';
import BuildStepRow from './BuildStep';
import { RotateCcw, X, GitBranch, Clock } from 'lucide-preact';

interface Props {
  appId: string;
  deployId: string;
  appName: string;
}

export default function DeployDetail({ appId, deployId, appName }: Props) {
  const [deploy, setDeploy] = useState<Deploy | null>(null);
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    api.listDeploys(appId).then(({ data }) => {
      const d = data.find((d) => d.id === deployId);
      if (d) setDeploy(d);
    });
  }, [appId, deployId]);

  useEffect(() => {
    if (!deploy) return;

    if (deploy.build_log) {
      try {
        const parsed = JSON.parse(deploy.build_log);
        if (Array.isArray(parsed)) setSteps(parsed);
      } catch {
        // build_log is plain text, not structured steps
      }
    }

    if (deploy.status === 'building' || deploy.status === 'deploying') {
      const sse = createSSEClient(`/api/v1/apps/${appId}/deploys/${deployId}/events`, {
        'build.step.start': (data: any) => {
          setSteps((prev) => [...prev, { name: data.name, status: 'running', started_at: new Date().toISOString(), finished_at: null, output: [] }]);
          setExpandedStep(null);
        },
        'build.step.output': (data: any) => {
          setSteps((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last) last.output = [...last.output, data.line || data.toString()];
            return copy;
          });
        },
        'build.step.complete': (data: any) => {
          setSteps((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last) {
              last.status = data.status || 'done';
              last.finished_at = new Date().toISOString();
            }
            return copy;
          });
        },
        'deploy.status': (data: any) => {
          setDeploy((prev) => prev ? { ...prev, status: data.status } : prev);
        },
      });

      return () => sse.close();
    }
  }, [deploy?.id, deploy?.status]);

  if (!deploy) return <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>Loading deploy...</p>;

  const isActive = deploy.status === 'building' || deploy.status === 'deploying';
  const duration = deploy.started_at && deploy.finished_at
    ? (new Date(deploy.finished_at).getTime() - new Date(deploy.started_at).getTime()) / 1000
    : null;

  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        Apps &gt; {appName} &gt; Deploys &gt; #{deployId.slice(0, 8)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-semibold)' }}>
              Deploy #{deployId.slice(0, 8)}
            </h1>
            <StatusDot status={deploy.status} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            {deploy.git_sha && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                {shortSha(deploy.git_sha)}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <GitBranch size={13} /> main
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Clock size={13} /> {deploy.started_at ? formatRelativeTime(deploy.started_at) : '—'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {isActive && <Button variant="secondary"><X size={14} /> Cancel Deploy</Button>}
          <Button variant="primary" onClick={() => api.triggerDeploy(appId).then(() => window.location.reload())}>
            <RotateCcw size={14} /> Redeploy
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {steps.length > 0 ? steps.map((step, i) => (
          <BuildStepRow
            key={i}
            step={step}
            index={i}
            expanded={expandedStep === i || step.status === 'running' || step.status === 'failed'}
            onToggle={() => setExpandedStep(expandedStep === i ? null : i)}
          />
        )) : deploy.build_log ? (
          <div style={{
            background: 'var(--color-surface-invert)',
            color: 'var(--color-text-invert)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            lineHeight: 'var(--leading-normal)',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            maxHeight: 400,
          }}>
            {deploy.build_log}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>No build output available.</p>
        )}
      </div>

      {duration && (
        <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Total duration: {formatDuration(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
