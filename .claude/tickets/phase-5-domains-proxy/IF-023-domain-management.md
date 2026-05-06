# IF-023: Domain management

**Phase:** 5 — Domains & Proxy
**Priority:** High
**Estimate:** M

## Description

Full domain management: automatic wildcard subdomains, custom domain addition with DNS verification, and Caddy route configuration.

## Acceptance Criteria

- [ ] API endpoints:
  - `GET /api/v1/apps/:id/domains` — list domains for app
  - `POST /api/v1/apps/:id/domains` — add custom domain
  - `DELETE /api/v1/apps/:id/domains/:id` — remove domain
  - `POST /api/v1/apps/:id/domains/:id/verify` — trigger DNS verification
- [ ] Auto-generated subdomain on deploy: `appname.base-domain.com`
- [ ] Preview subdomain: `branch--appname.base-domain.com`
- [ ] Custom domain flow:
  1. User enters domain name
  2. UI shows required DNS record (A record → server IP)
  3. User clicks "Verify" → daemon checks DNS resolution
  4. On success: Caddy route created, SSL auto-provisioned
  5. On failure: clear error ("DNS not pointing to this server yet")
- [ ] Domain verification retry (check again button)
- [ ] Multiple custom domains per app
- [ ] Primary domain selection (shown on dashboard cards)
- [ ] Domain removal cleans up Caddy route
- [ ] UI: domain list with status badges (verified/pending), add form, DNS instructions
- [ ] Optional sslip.io support: `appname-IP.sslip.io` as instant-access fallback

## Dependencies

- IF-005, IF-006, IF-002
