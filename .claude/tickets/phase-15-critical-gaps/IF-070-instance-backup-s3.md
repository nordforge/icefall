# IF-070: Scheduled instance backup to S3

**Phase:** 15 — Critical Gaps
**Priority:** High
**Estimate:** M

## Description

The CLI already has `icefall migrate export` which creates a full backup (SQLite DB + config + database dumps + Docker volumes). Add a scheduled background job that runs this export automatically and uploads to S3. If a user's VPS dies and they lose all app configs with no backup path, that's catastrophic.

## Acceptance Criteria

### Settings Page UI
- [ ] New section: "Instance Backup"
- [ ] Toggle: "Enable automatic instance backups" (default: off)
- [ ] S3 destination: reuse the existing S3/R2 backup location config from settings
- [ ] Schedule selector:
  - Preset options: Daily (at 2:00 AM), Weekly (Sunday 2:00 AM), Monthly (1st at 2:00 AM)
  - Custom cron expression input for advanced users
- [ ] Retention count: how many backups to keep (default: 7)
- [ ] "Backup Now" button for manual trigger
- [ ] Last backup status display: timestamp, size, success/failure
- [ ] Backup history: list of recent backups with timestamp, size, status

### Backend
- [ ] Background job (tokio task) that runs on the configured cron schedule
- [ ] Reuses the existing `migrate export` logic from `src/cli/commands/migrate.rs`:
  1. Export SQLite database
  2. Export config file (with encryption key)
  3. Dump managed databases (pg_dump, mysqldump, mongodump, redis BGSAVE)
  4. Snapshot Docker volumes
  5. Generate SHA256 checksum
  6. Package as tar.gz
- [ ] Upload to configured S3 destination with key: `instance-backups/{timestamp}.tar.gz`
- [ ] Retention: delete backups older than the retention count after successful upload
- [ ] Emit notification events: `instance_backup.success`, `instance_backup.failure`
- [ ] Store backup history in database: timestamp, size, S3 key, status, error message

### API
- [ ] `POST /api/v1/settings/instance-backup/trigger` — manual backup trigger
- [ ] `GET /api/v1/settings/instance-backup/history` — list backup history
- [ ] `PUT /api/v1/settings/instance-backup` — update schedule and retention config

### General
- [ ] Restore remains CLI-only for v1.0 (`icefall migrate import`)
- [ ] Light and dark theme verified

## Technical Notes

- The export logic in `src/cli/commands/migrate.rs` is comprehensive — it handles SQLite, config, database dumps, volume snapshots, and S3 upload
- The existing S3 config (from database backup settings) should be reused
- Consider using `tokio-cron-scheduler` or parsing cron expressions manually (the backup scheduler in `src/` may already have cron support)
- Instance backups are larger than database backups — show estimated size before first backup

## Out of Scope

- Restore from dashboard UI (CLI only: `icefall migrate import`)
- Incremental backups
- Backup encryption beyond what S3 provides (SSE)
- Cross-server backup restore
- Backup to local storage (S3 only for instance backups)

## Dependencies

- IF-041 (server migration export/import), IF-045 (settings page)
