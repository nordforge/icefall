# IF-035: API token management

**Phase:** 8 — Auth & API
**Priority:** High
**Estimate:** S

## Description

Generate and manage API tokens for programmatic access (CLI, CI/CD, MCP server). Tokens inherit the creating user's role.

## Acceptance Criteria

- [ ] API endpoints:
  - `POST /api/v1/tokens` — create token (name, optional expiry)
  - `GET /api/v1/tokens` — list user's tokens (masked, showing name + last used)
  - `DELETE /api/v1/tokens/:id` — revoke token
- [ ] Token format: `icefall_` prefix + 48-char random hex
- [ ] Token hashed in database (only shown once on creation)
- [ ] Token auth: `Authorization: Bearer icefall_xxx` header
- [ ] Token inherits creating user's role for permission checks
- [ ] Last-used timestamp updated on each API call
- [ ] Optional expiry date (default: no expiry)
- [ ] Token management in dashboard settings page:
  - List of tokens with name, created date, last used, expiry
  - Create token dialog: name + optional expiry date → show token once
  - Revoke button with confirmation
- [ ] Rate limiting per token (configurable, default: 100 req/min)

## Dependencies

- IF-032, IF-006
