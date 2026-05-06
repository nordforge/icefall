# IF-042: First-run setup wizard

> **SUPERSEDED** — Replaced by Phase 13 Onboarding (IF-050 through IF-058), which breaks this wizard into individual step tickets with full acceptance criteria.

**Phase:** 10 — Install & Migration
**Priority:** ~~High~~ — Superseded
**Estimate:** ~~M~~

## Description

Web-based setup wizard that runs on first visit when no admin account exists.

## Acceptance Criteria

- [ ] Detect first-run state: no users in database
- [ ] All routes redirect to `/setup` until wizard is complete
- [ ] Wizard steps:
  1. **Welcome** — Icefall branding, brief description
  2. **Create admin account** — email + password (with strength indicator)
  3. **Configure base domain** (optional) — enter domain, show DNS instructions, verify
  4. **Connect Docker** — verify Docker is reachable, show Docker version/info
  5. **Summary** — review settings, "Complete Setup" button
- [ ] On completion: create admin user, save config, redirect to dashboard
- [ ] Wizard works without Caddy/HTTPS (plain HTTP on setup port for initial access)
- [ ] Clean, focused UI — no sidebar, no navigation, just the wizard
- [ ] Light and dark theme verified
- [ ] Skip steps that are already configured (e.g. if `icefall init` already ran)

## Dependencies

- IF-016, IF-032, IF-024, IF-004
