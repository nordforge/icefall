import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import type { Deploy } from '@lib/types';
import { formatRelativeTime, formatDuration, shortSha } from '@lib/format';
import StatusDot from '@islands/shared/StatusDot/StatusDot';
import styles from './deploys-tab.module.css';

type Props = {
  appId: string;
}

export default function DeploysTab({ appId }: Props) {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listDeploys(appId).then(({ data }) => { setDeploys(data); setLoading(false); }).catch(() => setLoading(false));
  }, [appId]);

  if (loading) return <p class={styles.message}>Loading deploys...</p>;

  if (deploys.length === 0) return <p class={styles.message}>No deploys yet.</p>;

  return (
    <div class={styles.wrapper}>
      <table class={styles.table}>
        <thead>
          <tr class={styles.theadRow}>
            {['Deploy', 'Commit', 'Branch', 'Status', 'Duration', 'Time'].map((h) => (
              <th key={h} class={styles.th}>
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
            const isLast = i === deploys.length - 1;
            return (
              <tr key={d.id} class={isLast ? styles.rowLast : styles.row}>
                <td class={styles.cell}>
                  <a href={`/apps/${appId}/deploys/${d.id}`} class={styles.deployLink}>
                    #{deploys.length - i}
                  </a>
                </td>
                <td class={`${styles.cell} ${styles.commitSha}`}>
                  {d.git_sha ? shortSha(d.git_sha) : '—'}
                </td>
                <td class={`${styles.cell} ${styles.mono}`}>main</td>
                <td class={styles.cell}><StatusDot status={d.status} /></td>
                <td class={`${styles.cell} ${styles.duration}`}>
                  {duration ? formatDuration(duration) : '—'}
                </td>
                <td class={`${styles.cell} ${styles.time}`}>
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
