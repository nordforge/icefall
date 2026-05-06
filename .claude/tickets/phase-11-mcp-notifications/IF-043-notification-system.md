# IF-043: Notification system (SMTP + Webhooks + Plunk)

**Phase:** 11 — MCP & Notifications
**Priority:** Medium
**Estimate:** M

## Description

Multi-channel notification system for deploy events, health check alerts, and backup status.

## Acceptance Criteria

- [ ] Notification channels:
  - **SMTP** via `lettre` — user provides host, port, username, password, from address
  - **Webhook** — arbitrary URL, POST with JSON payload
  - **Plunk** (optional) — API key + Plunk instance URL
- [ ] API endpoints:
  - `GET /api/v1/notifications/channels` — list configured channels
  - `POST /api/v1/notifications/channels` — add channel
  - `PUT /api/v1/notifications/channels/:id` — update channel
  - `DELETE /api/v1/notifications/channels/:id` — remove channel
  - `POST /api/v1/notifications/channels/:id/test` — send test notification
- [ ] Per-project notification rules:
  - `GET /api/v1/apps/:id/notifications` — list rules for app
  - `POST /api/v1/apps/:id/notifications` — add rule (event type + channel)
  - `DELETE /api/v1/apps/:id/notifications/:id` — remove rule
- [ ] Event types: `deploy.success`, `deploy.failure`, `health.down`, `health.recovered`, `health.auto_restart`, `backup.success`, `backup.failure`
- [ ] Notification dispatch: background task, non-blocking (failures don't affect the event)
- [ ] Webhook payload format:
  ```json
  { "event": "deploy.failure", "app": "my-app", "timestamp": "...", "details": { ... } }
  ```
- [ ] SMTP: configurable email templates (plain text, no HTML dependency)
- [ ] Channel credentials encrypted at rest
- [ ] Notification history: last 100 sent notifications (for debugging)
- [ ] Settings UI: notification channels management + per-app rules

## Dependencies

- IF-002, IF-006
