# IF-100: Update apply, restart & graceful shutdown

**Phase:** 16 — Self-Update
**Priority:** Critical
**Estimate:** L

## Description

The core update execution: swap the binary, handle database migrations, restart the daemon via systemd with zero dropped connections, and verify health. This is the most critical and failure-sensitive ticket in the phase. Every step must be idempotent and crash-safe. User containers must NEVER stop. User sessions must survive.

## Acceptance Criteria

### Pre-Apply Checks
- [ ] Verify a downloaded + verified update exists (IF-099 completed)
- [ ] Check no active deploys are in progress — if so:
  - Manual update: warn the user, require confirmation
  - Auto-update: postpone, retry in 5 minutes until maintenance window closes
- [ ] Verify systemd service is running (if applicable)

### Backup Phase
- [ ] Back up current binary: `cp /var/lib/icefall/bin/icefall /var/lib/icefall/updates/icefall.rollback`
- [ ] Back up SQLite database using SQLite's online backup API (`sqlite3_backup_init`):
  ```
  /var/lib/icefall/backups/icefall-{timestamp}-pre-update.db
  ```
  - Safe even with concurrent readers (WAL-compatible)
  - NOT a file copy (file copy can corrupt WAL databases)
- [ ] Back up dashboard assets if external: `cp -r dashboard/dist dashboard/dist.bak`
- [ ] Write pending update marker file:
  ```json
  // /var/lib/icefall/updates/pending_update
  {
    "from_version": "0.3.2",
    "to_version": "0.4.0",
    "rollback_binary": "/var/lib/icefall/updates/icefall.rollback",
    "db_backup": "/var/lib/icefall/backups/icefall-20260510143000-pre-update.db",
    "started_at": "2026-05-10T14:30:00Z"
  }
  ```

### Database Migration
- [ ] Run forward migrations from the NEW version's embedded migration set
  - The OLD binary runs NEW migrations (migrations must be additive-only)
- [ ] All pending migrations run inside a single SQLite transaction
- [ ] Set `busy_timeout(30s)` to handle concurrent write locks
- [ ] If migration fails: transaction rolls back automatically, abort update, system unchanged
- [ ] Record migration result in update history

### Binary Swap (Atomic)
- [ ] Copy new binary to staging path adjacent to target (same filesystem):
  ```rust
  let staging = current_binary.with_extension("new");
  fs::copy(&new_binary, &staging)?;
  ```
- [ ] Set executable permissions: `chmod 755`
- [ ] Atomic rename: `fs::rename(staging, current_binary)` — same-filesystem, atomic on Linux
- [ ] Replace dashboard assets directory (daemon is about to restart, so brief inconsistency is OK)

### systemd Socket Activation (Zero-Downtime Restart)
- [ ] New `icefall.socket` unit file:
  ```ini
  [Socket]
  ListenStream=0.0.0.0:8443
  FileDescriptorStoreMax=1

  [Install]
  WantedBy=sockets.target
  ```
- [ ] Updated `icefall.service` unit file:
  ```ini
  [Service]
  Type=notify
  Requires=icefall.socket
  After=icefall.socket
  TimeoutStopSec=30
  KillMode=mixed
  Restart=on-failure
  RestartSec=2
  ```
- [ ] Daemon receives listening socket via `listenfd` crate on startup
- [ ] Fallback: if not running under systemd, bind socket directly (development mode)
- [ ] During restart, systemd holds the socket open and queues incoming connections — no 502 errors

### Graceful Shutdown
- [ ] On SIGTERM: stop accepting new connections (systemd queues via socket)
- [ ] Set cancellation token checked by SSE streams
- [ ] Wait up to 10 seconds for in-flight requests to complete
- [ ] Close database connection pool gracefully
- [ ] Exit cleanly

### Restart & Health Verification
- [ ] Spawn `systemctl restart icefall` (non-blocking — do not wait, as systemd kills this process)
- [ ] New binary on startup:
  1. Detect `pending_update` marker file
  2. Run self-diagnostics: DB connectivity, Docker daemon reachable, user containers still running
  3. Call `sd_notify::notify(NotifyState::Ready)` on success
  4. Delete `pending_update` marker (update complete)
  5. Clean up: remove downloaded tarball, keep rollback binary for 7 days
- [ ] If self-diagnostics fail: log error, mark update as failed, keep marker for rollback
- [ ] If not systemd-managed: detect via `INVOCATION_ID` env var, use simpler restart strategy

### SSE Progress Events
- [ ] Step-by-step events for the dashboard:
  ```
  event: update.step
  data: {"step": "backup", "status": "running"}

  event: update.step
  data: {"step": "backup", "status": "done", "duration_secs": 4.2}

  event: update.step
  data: {"step": "migrate", "status": "running"}
  ...

  event: update.step
  data: {"step": "restart", "status": "running"}
  ```
- [ ] SSE connection drops during restart (expected — dashboard handles reconnection)

### API Endpoint
- [ ] `POST /api/v1/system/update/apply` — begin the update process
  - Requires admin role
  - Returns 409 if update already in progress
  - Returns 400 if no downloaded update ready
  - Returns 200 with status, then streams steps via SSE

### Migration Safety Rules (Developer Constraint)
- [ ] Document in CONTRIBUTING.md: between version N and N+1, migrations can ONLY:
  - Add new tables
  - Add new columns with default values
  - Add new indexes
  - Insert new seed data
- [ ] Migrations CANNOT: drop columns, rename columns, change types, drop tables
- [ ] Destructive changes deferred to version N+2 (after N+1 code no longer references old schema)

## Technical Notes

- `listenfd` crate receives systemd socket-activated file descriptors
- `sd-notify` crate for systemd readiness notification and watchdog pings
- `rusqlite` `backup` feature for online SQLite backup API
- The `pending_update` marker file is the key to rollback detection — if it exists when the new binary starts, the update has not yet been verified
- Socket activation eliminates the restart gap entirely: connections queue at the kernel level while the process restarts
- `rename()` is atomic on all Linux filesystems (ext4, xfs, btrfs)

## Out of Scope

- Automatic rollback mechanism (IF-101)
- Dashboard UI for the update process (IF-102)
- Auto-update scheduling (IF-103)

## Dependencies

- IF-097 (release pipeline — for the systemd unit files and binary layout)
- IF-098 (update discovery — version and manifest data)
- IF-099 (download & verify — the downloaded artifact)
