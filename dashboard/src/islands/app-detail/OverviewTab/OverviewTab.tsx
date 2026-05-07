import { useEffect, useState } from 'preact/hooks';
import type { App, Deploy } from '@lib/types';
import { api } from '@lib/api';
import { formatRelativeTime, shortSha, formatDuration } from '@lib/format';
import StatusDot from '@islands/shared/StatusDot/StatusDot';
import UptimeTimeline from '@islands/shared/UptimeTimeline/UptimeTimeline';
import styles from './overview-tab.module.css';

type Props = {
  app: App;
}

export default function OverviewTab({ app }: Props) {
  const [deploys, setDeploys] = useState<Deploy[]>([]);

  useEffect(() => {
    api.listDeploys(app.id).then(({ data }) => setDeploys(data.slice(0, 5))).catch(() => {});
  }, [app.id]);

  const latestDeploy = deploys[0];

  return (
    <div class={styles.grid}>
      <div class={styles.panel}>
        <h3 class={styles.sectionTitle}>
          Status
        </h3>
        <div class={styles.statusRow}>
          <StatusDot status={latestDeploy?.status === 'running' ? 'online' : latestDeploy?.status || 'stopped'} />
          <span class={styles.statusText}>
            {latestDeploy?.status === 'running' ? `Running ${latestDeploy.started_at ? formatRelativeTime(latestDeploy.started_at) : ''}` : latestDeploy?.status || 'No deploys yet'}
          </span>
        </div>

        {latestDeploy?.container_id && (
          <div class={styles.detailBlock}>
            <span class={styles.detailLabel}>Container ID</span>
            <div class={styles.detailValue}>
              {latestDeploy.container_id.slice(0, 12)}
            </div>
          </div>
        )}

        <div class={styles.detailBlock}>
          <span class={styles.detailLabel}>Port</span>
          <div class={styles.detailValueBase}>3000</div>
        </div>

        {latestDeploy?.image_ref && (
          <div>
            <span class={styles.detailLabel}>Image</span>
            <div class={styles.detailValue}>
              {latestDeploy.image_ref}
            </div>
          </div>
        )}
      </div>

      <div class={styles.deploysPanel}>
        <h3 class={styles.sectionTitleFlush}>
          Recent Deploys
        </h3>
        {deploys.length === 0 ? (
          <p class={styles.emptyText}>No deploys yet</p>
        ) : (
          <table class={styles.deploysTable}>
            <thead>
              <tr class={styles.deploysTheadRow}>
                <th>Commit</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr key={d.id} class={styles.deploysRow}>
                  <td class={styles.deploysCell}>
                    <a href={`/apps/${app.id}/deploys/${d.id}`} class={styles.commitLink}>
                      {d.git_sha ? shortSha(d.git_sha) : '—'}
                    </a>
                  </td>
                  <td class={`${styles.deploysCell} ${styles.branchCell}`}>
                    {app.git_branch}
                  </td>
                  <td class={styles.deploysCell}>
                    <StatusDot status={d.status} />
                  </td>
                  <td class={`${styles.deploysCell} ${styles.timeCell}`}>
                    {formatRelativeTime(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {deploys.length > 0 && (
          <a href={`/apps/${app.id}/deploys`} class={styles.viewAll}>
            View all &rarr;
          </a>
        )}
      </div>

      <div class={styles.uptimePanel}>
        <UptimeTimeline appId={app.id} />
      </div>
    </div>
  );
}
