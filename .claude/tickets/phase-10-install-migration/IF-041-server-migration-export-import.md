# IF-041: Server migration (export/import)

**Phase:** 10 — Install & Migration
**Priority:** Medium
**Estimate:** L

## Description

Export full server state to a single archive and import it on a new server. Supports local files and S3/R2 remote storage for servers with limited disk space.

## Acceptance Criteria

- [x] `icefall migrate export --output <path>`:
  - Pre-flight size estimate shown before starting
  - Daemon running detection with warning + confirm prompt
  - SQLite WAL checkpoint for consistency, then database copy
  - Configuration export (includes encryption key — warning printed)
  - Fresh database dumps for all running managed containers (pg_dumpall, mysqldump, mongodump, Redis BGSAVE)
  - Docker volume snapshots via Alpine container tar
  - Log files and existing backup archives
  - Manifest file (manifest.json) with version, timestamp, content summary
  - SHA-256 checksum file alongside the archive
  - Bundle into single `.tar.gz`
  - Progress output per step (8 steps)
- [x] `icefall migrate import --from <path>`:
  - Checksum verification if `.sha256` file exists
  - Manifest inspection (version, date, content counts)
  - Auto-stops daemon before restoring
  - Restores SQLite database, configuration (with encryption key), Docker volumes, logs, backups
  - Stages database dump files with per-type restore commands printed
  - Auto-starts daemon after restore
  - Progress output per step (6 steps)
- [x] S3/R2 remote storage support
- [x] `--dry-run` flag for both export and import
- [x] SSL certificates NOT included (Caddy re-issues on new server)
- [x] Images NOT included (re-pulled or rebuilt — saves archive size)
- [x] Size estimate before export

## S3/R2 Remote Storage

Both export and import accept `s3://` or `r2://` paths. Uses the `aws` CLI under the hood.

### Export directly to S3/R2

```bash
# Export to S3
icefall migrate export --output s3://my-bucket/backups/icefall-2026-05-07.tar.gz

# Export to Cloudflare R2
icefall migrate export --output r2://my-bucket/backups/icefall-2026-05-07.tar.gz
```

The archive is created locally in a temp file, uploaded via `aws s3 cp`, then the temp file is deleted. This avoids needing permanent disk space for the archive on the source server.

### Import from S3/R2

```bash
# Import from S3
icefall migrate import --from s3://my-bucket/backups/icefall-2026-05-07.tar.gz

# Import from Cloudflare R2
icefall migrate import --from r2://my-bucket/backups/icefall-2026-05-07.tar.gz
```

Downloads the archive to a temp file, runs the full import, then cleans up.

### AWS CLI Configuration

The `aws` CLI must be installed and configured. For R2:

```bash
aws configure --profile r2
# Set endpoint: https://<account-id>.r2.cloudflarestorage.com
# Then: export AWS_PROFILE=r2
```

## Full Migration Walkthrough (for docs)

### Server A (source):

```bash
# 1. Export everything
icefall migrate export --output s3://backups/icefall-migration.tar.gz

# Or locally:
icefall migrate export --output /tmp/icefall-migration.tar.gz
scp /tmp/icefall-migration.tar.gz user@new-server:/tmp/
```

### Server B (destination):

```bash
# 1. Install Icefall
curl -fsSL https://icefall.dev/install.sh | bash

# 2. Stop the fresh daemon (import will restart it)
systemctl stop icefall

# 3. Import
icefall migrate import --from s3://backups/icefall-migration.tar.gz

# Or from local file:
icefall migrate import --from /tmp/icefall-migration.tar.gz

# 4. Redeploy apps (rebuilds container images on the new server)
icefall apps list
# For each app, trigger a deploy from the dashboard or run:
# icefall deploy (in the app directory with .icefall.toml)

# 5. Update DNS to point to the new server's IP
# Caddy will auto-issue SSL certificates on first request
```

### What transfers automatically:
- All app definitions, users, sessions, API tokens
- Environment variables (encrypted, key included in config)
- Docker volume data for managed databases
- Fresh database dumps (Postgres, MySQL, Redis, MongoDB)
- Log files and backup history

### What rebuilds automatically:
- Container images (re-pulled/rebuilt on deploy)
- SSL certificates (Caddy re-issues via Let's Encrypt)
- Caddy routes (configured on deploy)

### Dry run (inspect without changing anything):

```bash
# See what would be exported
icefall migrate export --dry-run

# Download and inspect an archive without restoring
icefall migrate import --from s3://backups/icefall-migration.tar.gz --dry-run
```

## Dependencies

- IF-002, IF-004, IF-029, IF-030
