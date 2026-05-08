# IF-068: Finish Slack + Discord notifications

**Phase:** 15 — Critical Gaps
**Priority:** High
**Estimate:** S

## Description

Both Slack and Discord accept incoming webhook POSTs with a JSON payload — structurally identical to the generic webhook dispatch that already works. The settings page already has config fields for both channels. Wire up the dispatch with properly formatted payloads.

## Acceptance Criteria

### Slack
- [ ] Format notification as Slack Block Kit payload:
  - Header block with event type icon and title
  - Section block with app name, event details, timestamp
  - Action block with "View in Dashboard" button linking to the app
  - Color attachment: green for success events, red for failure events
- [ ] POST to configured Slack webhook URL
- [ ] Test notification works via settings page

### Discord
- [ ] Format notification as Discord embed:
  - Title: event type (e.g., "Deploy Successful")
  - Description: app name and event details
  - Color: green (#00c853) for success, red (#ff1744) for failure, yellow (#ffc107) for warnings
  - Timestamp field
  - Footer: "Icefall" with optional instance name
  - URL field linking to the app in dashboard
- [ ] POST to configured Discord webhook URL (append `/slack` is NOT needed — use native Discord format)
- [ ] Test notification works via settings page

### General
- [ ] Both channels handle all event types:
  - `deploy.success`, `deploy.failure`
  - `health.down`, `health.recovered`, `health.auto_restart`
  - `backup.success`, `backup.failure`
- [ ] Error handling: log and continue if webhook POST fails (don't block other notifications)
- [ ] Timeout: 10 second timeout on webhook POST to prevent hanging

## Technical Notes

- The generic webhook dispatch in `notifications.rs` is the template — it already does `reqwest::Client::post(url).json(&payload).send()`
- Slack webhook format: `{ "blocks": [...] }` — see https://api.slack.com/reference/block-kit
- Discord webhook format: `{ "embeds": [...] }` — see https://discord.com/developers/docs/resources/webhook
- Config fields for both channels already exist in the settings page and are persisted

## Out of Scope

- Slack App integration (bot tokens, channels) — webhook-only for v1.0
- Discord bot integration — webhook-only
- Message threading (e.g., grouping deploy events)
- Rich interactive components (buttons that trigger actions)

## Dependencies

- IF-043 (notification system), IF-045 (settings page)
