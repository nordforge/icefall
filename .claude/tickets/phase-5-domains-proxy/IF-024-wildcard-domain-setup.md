# IF-024: Base domain and wildcard setup flow

**Phase:** 5 — Domains & Proxy
**Priority:** High
**Estimate:** S

## Description

First-time setup flow for configuring the base domain and wildcard DNS. This runs during `icefall init` or first dashboard visit.

## Acceptance Criteria

- [ ] Setup wizard step: "Configure your base domain"
- [ ] User enters base domain (e.g. `apps.example.com`)
- [ ] UI shows DNS instructions:
  - A record: `apps.example.com → <server IP>`
  - Wildcard A record: `*.apps.example.com → <server IP>`
- [ ] Verification: daemon checks both records resolve to server IP
- [ ] On success: save base domain to config, configure Caddy wildcard
- [ ] On failure: clear instructions on what's missing
- [ ] Skip option: continue without base domain (manual domain per app only)
- [ ] Base domain changeable later in settings
- [ ] Server IP auto-detected for display in DNS instructions

## Dependencies

- IF-005, IF-003
