# IF-101: Update rollback & failure recovery

**Phase:** 16 — Self-Update
**Priority:** High
**Estimate:** M

## Description

Implement automatic and manual rollback for failed updates. If the new binary crashes, fails health checks, or the admin wants to revert, the system must restore the previous binary and database to a known-good state. This is the safety net that makes the entire update system trustworthy.

## Acceptance Criteria

### Automatic Rollback (Crash Detection)
- [ ] systemd `ExecStopPost` calls the rollback binary:
  ```ini
  ExecStopPost=-/var/lib/icefall/updates/icefall.rollback rollback --check
  ```
  - The `-` prefix means systemd ignores the exit code
  - Uses the PREVIOUS (known-good) binary, not the potentially broken new one
- [ ] `rollback --check` logic:
  1. Read `/var/lib/icefall/updates/pending_update` marker
  2. If marker does not exist → exit (no pending update, normal stop)
  3. If marker exists and is < 5 minutes old → trigger rollback (new binary crashed)
  4. If marker exists and is > 5 minutes old → exit (the new binary ran long enough, crash is unrelated)
- [ ] Rollback execution:
  1. Copy rollback binary over current binary: `cp icefall.rollback /var/lib/icefall/bin/icefall`
  2. Restore database backup: `cp icefall-{timestamp}-pre-update.db icefall.db`
  3. Restore dashboard assets backup if applicable
  4. Delete `pending_update` marker
  5. Write to `update_history`: status = `rolled_back`, error = `new binary crashed on startup`
  6. `systemctl restart icefall` (starts the old, known-good binary)

### systemd Watchdog Integration
- [ ] Service configured with `WatchdogSec=60`
- [ ] Daemon pings watchdog every 30 seconds: `sd_notify::notify(NotifyState::Watchdog)`
- [ ] If daemon stops pinging (hang/crash), systemd kills and restarts it
- [ ] `StartLimitBurst=3` + `StartLimitIntervalSec=300`: after 3 failed starts in 5 minutes, systemd stops retrying → `ExecStopPost` rollback triggers

### Post-Update Self-Test
- [ ] New binary runs diagnostics on startup when `pending_update` marker exists:
  - Database connection works
  - Docker daemon is reachable
  - All previously-running user containers are still running
  - Can serve a request on the health endpoint
- [ ] If self-test fails: log error, exit non-zero → triggers systemd restart → eventual rollback
- [ ] If self-test passes: delete marker, write success to `update_history`, clean up old backups

### Manual Rollback
- [ ] CLI command: `icefall update rollback`
  - Checks if a rollback binary exists at `/var/lib/icefall/updates/icefall.rollback`
  - Shows confirmation: "Roll back from v{current} to v{previous}? This will restore the database backup from {timestamp}."
  - Executes same rollback procedure as automatic
  - `--yes` flag to skip confirmation (for scripting)
- [ ] API endpoint: `POST /api/v1/system/update/rollback`
  - Requires admin role
  - Returns 404 if no rollback binary available
  - Triggers rollback + restart

### Dashboard Rollback UI
- [ ] After a successful update, show "Rollback to v{previous}" option in Settings > Updates for 24 hours
- [ ] Button opens confirmation dialog with warning about database restoration
- [ ] If the update failed, the rollback option is more prominent (primary action in error state)

### Backup Retention
- [ ] Rollback binary kept for 7 days after successful update, then auto-cleaned
- [ ] Database backup kept for 7 days after successful update
- [ ] Only the most recent rollback binary is kept (older ones deleted)
- [ ] Background cleanup task runs daily

### Database Rollback Safety
- [ ] Since migrations are additive-only, the OLD binary can run against the NEW schema (ignores new columns/tables)
- [ ] Database backup restoration is the fallback for cases where this assumption breaks
- [ ] The backup is a complete SQLite file copy (not incremental) — simple, reliable, easy to verify

## Technical Notes

- The rollback binary is always the previous version's binary — it understands the `rollback --check` subcommand because every Icefall binary does
- Using `ExecStopPost` with the rollback binary (not the current binary) avoids the bootstrap problem: a broken new binary cannot be trusted to run rollback logic
- The 5-minute timeout on the marker file distinguishes "crashed during update" from "crashed days later for unrelated reasons"
- `sd-notify` watchdog is lightweight (one syscall every 30s) but catches hangs that a simple crash handler would miss
- User containers are Docker containers managed by the Docker daemon — they are completely independent of the Icefall process and continue running through the entire rollback

## Out of Scope

- Automatic rollback triggered by application-level health degradation (future: if deploy success rate drops after update)
- Downgrade through the update UI (CLI-only via `icefall update rollback`)
- Rollback across multiple versions (only one version back)

## Dependencies

- IF-100 (update apply — provides the binary swap, marker file, and backup infrastructure)
