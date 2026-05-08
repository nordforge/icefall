# IF-067: Finish SMTP notifications

**Phase:** 15 — Critical Gaps
**Priority:** High
**Estimate:** S

## Description

The notification dispatch for SMTP currently logs a message and returns `Ok(())`. Replace the stub with actual email sending via the `lettre` crate. SMTP config fields already exist in the settings page — this is purely backend work.

## Acceptance Criteria

- [ ] Add `lettre` crate to Cargo.toml for SMTP email sending
- [ ] Replace the SMTP stub in `notifications.rs` with actual email dispatch:
  - Connect to configured SMTP server (host, port, username, password)
  - Support STARTTLS and implicit TLS
  - Send HTML email with event details
- [ ] Email template for notifications:
  - Subject: `[Icefall] {event_type}: {app_name}` (e.g., "[Icefall] Deploy Failed: my-api")
  - Body: event type, app name, timestamp, brief details, link to dashboard
  - Plain text fallback for email clients that don't render HTML
- [ ] SMTP configuration fields (already in settings UI):
  - Host
  - Port (default: 587)
  - Username
  - Password (stored encrypted)
  - From address
  - TLS mode (STARTTLS / implicit TLS / none)
- [ ] Test notification endpoint works for SMTP: `POST /api/v1/settings/notifications/test` sends a test email
- [ ] Error handling: if SMTP connection fails, log error and don't crash the notification pipeline
- [ ] SMTP credentials stored encrypted (AES-256-GCM, same as other secrets)

## Technical Notes

- Current stub location: `src/api/routes/notifications.rs`, around the `dispatch_notification` function
- The webhook dispatch (working) is the template for the async dispatch pattern
- `lettre` supports async via `tokio` feature flag — matches our runtime
- Consider connection pooling if notification volume is high (unlikely for v1.0)

## Out of Scope

- Email templates customization
- Resend / Plunk / transactional email API integration
- Email notification preferences per user (all admins get all emails)
- Retry on temporary SMTP failures

## Dependencies

- IF-043 (notification system)
