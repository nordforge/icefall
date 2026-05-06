# IF-030: Automated database backups

**Phase:** 7 — Databases
**Priority:** High
**Estimate:** M

## Description

Scheduled database dumps with local retention and optional S3/R2 push.

## Acceptance Criteria

- [ ] Backup scheduler running as background tokio task
- [ ] Backup methods per database type:
  - PostgreSQL: `pg_dump` executed inside container via Docker exec
  - MySQL: `mysqldump` executed inside container
  - Redis: trigger `BGSAVE`, copy RDB file from volume
  - MongoDB: `mongodump` executed inside container
- [ ] Backup schedule: configurable per database (cron expression, default: daily at 3:00 AM)
- [ ] Backup storage: compressed (gzip) to local directory (`data/backups/<db-id>/`)
- [ ] Retention: keep last N backups locally (configurable, default: 7)
- [ ] Optional S3/R2 push:
  - S3 credentials configured in global settings
  - Backups uploaded after local save
  - Configurable bucket and prefix
- [ ] Manual backup trigger via API: `POST /api/v1/databases/:id/backup`
- [ ] Backup history: `GET /api/v1/databases/:id/backups` (list with timestamps, size, status)
- [ ] Restore from backup: `POST /api/v1/databases/:id/restore/:backup_id`
  - Confirmation required (destructive operation)
  - Stops database, restores dump, restarts
- [ ] Backup failure triggers notification (if configured)

## Dependencies

- IF-029, IF-004
