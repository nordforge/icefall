# IF-041: Server migration (export/import)

**Phase:** 10 — Install & Migration
**Priority:** Medium
**Estimate:** L

## Description

Export full server state to a single archive and import it on a new server.

## Acceptance Criteria

- [ ] `icefall migrate export --output <path>`:
  - Export SQLite database
  - Export all env vars (encrypted)
  - Export app configurations
  - Snapshot Docker volumes (for databases and persistent apps)
  - Run database dumps (pg_dump, mysqldump, etc.)
  - Bundle into single `.tar.gz`
  - Progress output per step
- [ ] `icefall migrate import --from <path>`:
  - Verify archive integrity (checksum)
  - Restore SQLite database
  - Restore env vars
  - Restore app configurations
  - Pull/rebuild container images
  - Restore Docker volumes from snapshots
  - Restore database dumps
  - Configure Caddy routes for all apps
  - Progress output per step
- [ ] SSL certificates NOT included (Caddy re-issues on new server)
- [ ] Images NOT included (re-pulled or rebuilt — saves archive size)
- [ ] Dry-run option: `--dry-run` shows what would be exported/imported
- [ ] Size estimate before export
- [ ] Resume on partial failure (skip already-restored items)
- [ ] Verified: export from server A → import on server B → all apps reachable

## Dependencies

- IF-002, IF-004, IF-029, IF-030
