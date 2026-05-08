import { useEffect, useState } from 'preact/hooks';
import type { App, Deploy, HealthCheckResult } from '@lib/types';
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
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);

  useEffect(() => {
    api.listDeploys(app.id).then(({ data }) => setDeploys(data.slice(0, 5))).catch(() => {});
    api.getHealth(app.id).then(({ data }) => setHealthResults(data)).catch(() => {});
  }, [app.id]);

  const latestDeploy = deploys[0];
  const healthCheck = healthResults[0];
  const healthStatus = healthCheck?.current_status || 'unknown';
  const isImageApp = !!app.image_ref;

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

        {isImageApp && (
          <div class={styles.detailBlock}>
            <span class={styles.detailLabel}>Image</span>
            <div class={styles.detailValue}>
              {app.image_ref}
            </div>
          </div>
        )}

        {!isImageApp && latestDeploy?.image_ref && (
          <div class={styles.detailBlock}>
            <span class={styles.detailLabel}>Build Image</span>
            <div class={styles.detailValue}>
              {latestDeploy.image_ref}
            </div>
          </div>
        )}
      </div>

      <div class={styles.panel}>
        <h3 class={styles.sectionTitle}>Health</h3>
        {!healthCheck ? (
          <p class={styles.emptyText}>No health check configured</p>
        ) : (
          <>
            <div class={styles.statusRow}>
              <span class={`${styles.healthBadge} ${styles[`health_${healthStatus}`] || ''}`}>
                {healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'unhealthy' ? 'Unhealthy' : 'Unknown'}
              </span>
              {healthCheck.uptime_percent >= 0 && (
                <span class={styles.uptimeText}>{healthCheck.uptime_percent.toFixed(1)}% uptime</span>
              )}
            </div>
            <div class={styles.detailBlock}>
              <span class={styles.detailLabel}>Type</span>
              <div class={styles.detailValueBase}>{healthCheck.check.check_type.toUpperCase()}</div>
            </div>
            <div class={styles.detailBlock}>
              <span class={styles.detailLabel}>Interval</span>
              <div class={styles.detailValueBase}>{healthCheck.check.interval_secs}s</div>
            </div>
            <div class={styles.detailBlock}>
              <span class={styles.detailLabel}>Auto-restart</span>
              <div class={styles.detailValueBase}>{healthCheck.check.auto_restart ? 'Enabled' : 'Disabled'}</div>
            </div>
            {healthCheck.recent_events.length > 0 && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <span class={styles.detailLabel}>Recent Events</span>
                <div class={styles.healthEvents}>
                  {healthCheck.recent_events.slice(0, 5).map((event) => (
                    <div key={event.id} class={styles.healthEvent}>
                      <span class={`${styles.healthDot} ${event.status === 'healthy' ? styles.healthDotGreen : styles.healthDotRed}`} />
                      <span class={styles.detailValue}>{event.status}</span>
                      <span class={styles.timeCell}>{formatRelativeTime(event.checked_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
                {isImageApp ? (
                  <th>Image</th>
                ) : (
                  <>
                    <th>Commit</th>
                    <th>Branch</th>
                  </>
                )}
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr key={d.id} class={styles.deploysRow}>
                  {isImageApp ? (
                    <td class={styles.deploysCell}>
                      <a href={`/apps/${app.id}/deploys/${d.id}`} class={styles.commitLink}>
                        {d.image_ref || app.image_ref || '—'}
                      </a>
                    </td>
                  ) : (
                    <>
                      <td class={styles.deploysCell}>
                        <a href={`/apps/${app.id}/deploys/${d.id}`} class={styles.commitLink}>
                          {d.git_sha ? shortSha(d.git_sha) : '—'}
                        </a>
                      </td>
                      <td class={`${styles.deploysCell} ${styles.branchCell}`}>
                        {app.git_branch}
                      </td>
                    </>
                  )}
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
