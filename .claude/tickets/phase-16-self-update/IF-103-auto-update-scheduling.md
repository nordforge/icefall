# IF-103: Auto-update scheduling

**Phase:** 16 — Self-Update
**Priority:** Medium
**Estimate:** M

## Description

Implement the automatic update mechanism that downloads and applies updates during a configurable maintenance window. Auto-update is off by default and must be explicitly opted into. When enabled, Icefall pre-downloads updates as soon as they're discovered, then applies them during the maintenance window — making the actual update fast (no download wait). Active deploys are respected: if a deploy is running, the update waits or skips to the next window.

## Acceptance Criteria

### Settings
- [ ] Auto-update controlled by settings in the database:
  ```sql
  auto_update_enabled BOOLEAN DEFAULT FALSE,
  auto_update_channel TEXT DEFAULT 'stable',
  auto_update_window_start TEXT DEFAULT '03:00',  -- local time, 24h
  auto_update_window_end TEXT DEFAULT '05:00',
  auto_update_notify_before_minutes INTEGER DEFAULT 30
  ```
- [ ] Settings exposed via `GET/PATCH /api/v1/system/update/preferences` (from IF-098)
- [ ] Dashboard UI for these settings built in IF-102

### Pre-Download
- [ ] When update discovery (IF-098) finds a new version and auto-update is enabled:
  - Immediately trigger the download + verification pipeline (IF-099)
  - This happens during normal hours, NOT during the maintenance window
  - Store the ready-to-apply update in `/var/lib/icefall/updates/`
- [ ] If pre-download fails: retry once per check interval (6 hours). Do not spam.

### Maintenance Window Logic
- [ ] Background task checks every 60 seconds if the current time is within the maintenance window
- [ ] When inside the window and a verified update is ready:
  1. Check for active deploys (any app with `building` or `deploying` status)
  2. If active deploy: wait, re-check every 30 seconds until deploy finishes or window closes
  3. If window closes with deploy still running: skip this window, try next one
  4. If no active deploys: proceed with update
- [ ] Maintenance window respects the server's configured timezone (from platform settings)
- [ ] Window wrapping: `23:00` to `02:00` correctly spans midnight

### Pre-Update Notification
- [ ] 30 minutes before the maintenance window opens (configurable):
  - Push SSE event `system.update.scheduled`: "Icefall will auto-update to v{version} at {time}"
  - Send notification via configured channels (webhook, SMTP, Slack, Discord)
- [ ] Dashboard shows a banner: "Scheduled update to v{version} at {time}. [Postpone 24h] [Update Now] [Skip This Version]"
- [ ] Postpone: delays auto-update by 24 hours (shifts the next check)
- [ ] Skip: adds version to `skipped_updates` table — a newer version will still be auto-applied
- [ ] Update Now: triggers immediate apply (same as manual update)

### Skip & Breaking Change Logic
- [ ] Versions in `skipped_updates` are not auto-applied (manual apply still possible)
- [ ] A newer version (e.g., v1.4.1) is NOT skipped even if v1.4.0 was
- [ ] If release manifest contains `breaking: true`:
  - Auto-update is SKIPPED (breaking changes require manual review)
  - Notification: "v{version} is available but requires manual review. See release notes."
  - Admin must manually trigger from dashboard or CLI

### Post-Auto-Update Notification
- [ ] After successful auto-update, send notification: "Icefall automatically updated from v{old} to v{new}"
- [ ] After failed auto-update, send notification: "Automatic update to v{version} failed: {error}. Manual intervention may be required."
- [ ] After skipped auto-update (deploy in progress), send notification: "Scheduled update to v{version} was skipped because a deploy was in progress. Will retry at next maintenance window."

### Update Channel Support
- [ ] Stable channel: only `prerelease: false` GitHub releases
- [ ] Beta channel: includes `prerelease: true` releases with `-beta` or `-rc` tags
- [ ] Channel change takes effect at next check interval
- [ ] Switching from beta to stable: if current version is a pre-release, stable updates still apply (you can "graduate" from beta to stable)

## Technical Notes

- The maintenance window scheduler is a simple tokio background task with a 60-second sleep loop
- Use `chrono` with the configured timezone for window calculations
- Pre-download is fire-and-forget: if it fails, the discovery loop picks it up on the next cycle
- The "30 minutes before" notification uses a one-shot timer spawned when the window is about to open
- Breaking change detection: parse `breaking` field from the release manifest (`min_supported_version` skip distance also indicates breaking changes)

## Out of Scope

- Nightly channel (deferred — needs separate infrastructure for nightly builds)
- Fleet-wide update coordination (multi-instance support is out of scope for v1)
- Update deferral policies (e.g., "delay all updates by 7 days") — simple skip is enough for v1
- Patch-only auto-updates (auto-update applies any non-breaking version, not just patches)

## Dependencies

- IF-098 (update discovery — provides version availability)
- IF-099 (download & verify — pre-download pipeline)
- IF-100 (update apply — the actual update execution)
- IF-043 (notification system — for pre/post update notifications)
