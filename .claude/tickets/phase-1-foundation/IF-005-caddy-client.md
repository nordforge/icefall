# IF-005: Caddy admin API client

**Phase:** 1 — Foundation
**Priority:** Critical
**Estimate:** S

## Description

Implement a client for Caddy's admin API to dynamically manage reverse proxy routes. No Caddyfile generation — all config changes go through the JSON admin API.

## Acceptance Criteria

- [ ] HTTP client for Caddy admin API (default: `http://localhost:2019`)
- [ ] Add route: map domain → container IP:port (with automatic HTTPS)
- [ ] Remove route: by domain
- [ ] Update route: change upstream target (for zero-downtime deploys)
- [ ] List active routes
- [ ] Wildcard subdomain support (configure `*.base-domain.com`)
- [ ] Health check on Caddy availability at daemon startup
- [ ] Graceful handling of Caddy being unreachable (queue changes, retry)
- [ ] Test helpers for verifying route state

## Dependencies

- IF-001, IF-003 (needs Caddy admin URL from config)
