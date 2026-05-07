import { useEffect, useState } from 'preact/hooks';
import type { App, Deploy } from '../../lib/types';
import { api } from '../../lib/api';
import { formatRelativeTime, shortSha, formatDuration } from '../../lib/format';
import StatusDot from '../shared/StatusDot';
import ProgressBar from '../shared/ProgressBar';

interface Props {
  app: App;
}

export default function OverviewTab({ app }: Props) {
  const [deploys, setDeploys] = useState<Deploy[]>([]);

  useEffect(() => {
    api.listDeploys(app.id).then(({ data }) => setDeploys(data.slice(0, 5))).catch(() => {});
  }, [app.id]);

  const latestDeploy = deploys[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)' }}>
          Status
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <StatusDot status={latestDeploy?.status === 'running' ? 'online' : latestDeploy?.status || 'stopped'} />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {latestDeploy?.status === 'running' ? `Running ${latestDeploy.started_at ? formatRelativeTime(latestDeploy.started_at) : ''}` : latestDeploy?.status || 'No deploys yet'}
          </span>
        </div>

        {latestDeploy?.container_id && (
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Container ID</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {latestDeploy.container_id.slice(0, 12)}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Port</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>3000</div>
        </div>

        {latestDeploy?.image_ref && (
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Image</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {latestDeploy.image_ref}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Deploys
        </h3>
        {deploys.length === 0 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>No deploys yet</p>
        ) : (
          <table style={{ fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-1) 0', fontWeight: 'var(--weight-medium)' }}>Commit</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-1) 0', fontWeight: 'var(--weight-medium)' }}>Branch</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-1) 0', fontWeight: 'var(--weight-medium)' }}>Status</th>
                <th style={{ textAlign: 'right', padding: 'var(--space-1) 0', fontWeight: 'var(--weight-medium)' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr key={d.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-2) 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-info)' }}>
                    <a href={`/apps/${app.id}/deploys/${d.id}`} style={{ color: 'inherit' }}>
                      {d.git_sha ? shortSha(d.git_sha) : '—'}
                    </a>
                  </td>
                  <td style={{ padding: 'var(--space-2) 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {app.git_branch}
                  </td>
                  <td style={{ padding: 'var(--space-2) 0' }}>
                    <StatusDot status={d.status} />
                  </td>
                  <td style={{ padding: 'var(--space-2) 0', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                    {formatRelativeTime(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {deploys.length > 0 && (
          <a href={`/apps/${app.id}/deploys`} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
            View all →
          </a>
        )}
      </div>
    </div>
  );
}
