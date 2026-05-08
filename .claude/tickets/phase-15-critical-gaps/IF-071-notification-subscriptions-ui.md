# IF-071: Per-event notification subscriptions UI

**Phase:** 15 — Critical Gaps
**Priority:** Medium
**Estimate:** S

## Description

The notification rules API already exists (`/apps/{app_id}/notifications`) with event types (`deploy.success`, `deploy.failure`, `health.down`, `backup.failure`). The backend supports per-app, per-event rules. Without a UI, users get all notifications or none. Add a subscription matrix to the settings page.

## Acceptance Criteria

### Settings Page — Notification Subscriptions
- [ ] New subsection under each notification channel: "Event Subscriptions"
- [ ] Checkbox matrix: rows = event types, columns = channels
- [ ] Event types:
  - Deploy successful
  - Deploy failed
  - Health check down
  - Health check recovered
  - Auto-restart triggered
  - Backup successful
  - Backup failed
  - Instance backup successful (if IF-070 is done)
  - Instance backup failed (if IF-070 is done)
- [ ] Channels (columns): Webhook, Email (SMTP), Slack, Discord
- [ ] Only show channels that are configured (have a URL/config set)
- [ ] Default for new channels: all failure events enabled, success events disabled
- [ ] "Select All" / "Deselect All" toggles per channel and per event type
- [ ] Save persists to notification rules via existing API

### API
- [ ] Uses existing endpoints:
  - `GET /api/v1/settings/notifications/rules` — get current subscription matrix
  - `PUT /api/v1/settings/notifications/rules` — update subscriptions
- [ ] If endpoints don't exist yet, create them (the rules engine exists in the backend)

### General
- [ ] Light and dark theme verified
- [ ] Mobile responsive: matrix becomes a stacked card layout on small screens

## Technical Notes

- The notification system in `src/api/routes/notifications.rs` already has event types and a rules engine
- Event types are defined as: `deploy.success`, `deploy.failure`, `health.down`, `health.recovered`, `health.auto_restart`, `backup.success`, `backup.failure`
- The rules can be global (all apps) or per-app — start with global rules only for v1.0

## Out of Scope

- Per-app notification overrides (e.g., "only notify on failures for this app")
- Notification scheduling (quiet hours)
- Notification grouping / digest mode
- Custom notification templates

## Dependencies

- IF-043 (notification system), IF-045 (settings page), IF-067 (SMTP), IF-068 (Slack/Discord)
