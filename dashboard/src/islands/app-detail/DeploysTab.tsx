import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';
import type { Deploy } from '../../lib/types';
import { formatRelativeTime, formatDuration, shortSha } from '../../lib/format';
import StatusDot from '../shared/StatusDot';

interface Props {
  appId: string;
}

export default function DeploysTab({ appId }: Props) {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listDeploys(appId).then(({ data }) => { setDeploys(data); setLoading(false); }).catch(() => setLoading(false));
  }, [appId]);

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>Loading deploys...</p>;

  if (deploys.length === 0) return <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-4)' }}>No deploys yet.</p>;

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <table style={{ fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['Deploy', 'Commit', 'Branch', 'Status', 'Duration', 'Time'].map((h) => (
              <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deploys.map((d, i) => {
            const duration = d.started_at && d.finished_at
              ? (new Date(d.finished_at).getTime() - new Date(d.started_at).getTime()) / 1000
              : null;
            return (
              <tr key={d.id} style={{ borderBottom: i < deploys.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <a href={`/apps/${appId}/deploys/${d.id}`} style={{ color: 'var(--color-primary)', fontWeight: 'var(--weight-medium)' }}>
                    #{deploys.length - i}
                  </a>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-info)' }}>
                  {d.git_sha ? shortSha(d.git_sha) : '—'}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>main</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}><StatusDot status={d.status} /></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                  {duration ? formatDuration(duration) : '—'}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  {formatRelativeTime(d.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
