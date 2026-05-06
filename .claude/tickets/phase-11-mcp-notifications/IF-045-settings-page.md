# IF-045: Global settings page

**Phase:** 11 — MCP & Notifications
**Priority:** Medium
**Estimate:** M

## Description

Dashboard settings page for server-wide configuration: domain, Docker, SMTP, OAuth, backups, and resource defaults.

## Acceptance Criteria

- [ ] Settings page accessible from sidebar (admin only)
- [ ] Sections:
  - **General** — server name, base domain (editable), server IP display
  - **Docker** — Docker socket path, Docker version info (read-only), image cleanup settings
  - **OAuth Providers** — GitHub + GitLab OAuth app credentials (from IF-033)
  - **Notifications** — SMTP settings, webhook URLs, Plunk config (from IF-043)
  - **Backups** — S3/R2 credentials, default backup schedule, retention count
  - **Resource Defaults** — default memory/CPU limits per project type
  - **Updates** — current version, latest version, update button, changelog preview
- [ ] Each section independently saveable
- [ ] Sensitive fields masked (passwords, API keys, secrets)
- [ ] Validation before save (test SMTP connection, verify S3 credentials, etc.)
- [ ] Success/error toast messages on save
- [ ] Light and dark theme verified

## Dependencies

- IF-016, IF-032
