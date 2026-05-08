# IF-069: Path-based routing

**Phase:** 15 — Critical Gaps
**Priority:** Medium
**Estimate:** S

## Description

Users who need `/api` on one service and `/` on another on the same domain cannot use Icefall without path-based routing. Caddy's `route` directive handles path matching natively — the Caddy client integration already supports it.

## Acceptance Criteria

### Domain Configuration UI
- [ ] Optional "Path" field on domain configuration (in the domains tab and global domains page)
- [ ] Path input: text field with `/` prefix enforced (e.g., `/api`, `/admin`, `/docs`)
- [ ] Default: empty (matches all paths, current behavior)
- [ ] Help text: "Route only requests matching this path prefix to this app. Leave empty to match all paths."
- [ ] Multiple domains with the same hostname but different paths allowed (e.g., `example.com/` → app-a, `example.com/api` → app-b)

### Backend
- [ ] Path field added to the domain model (nullable, defaults to `/` or empty)
- [ ] Caddy route generation includes path matcher when path is specified:
  - Uses Caddy's `handle_path` or `route` directive with `path` matcher
  - Strips the path prefix before proxying (so `/api/users` → the container receives `/users`)
  - Option to NOT strip the prefix (pass-through mode)
- [ ] Routing priority: more specific (longer) paths match first
  - `/api/v2` matches before `/api` which matches before `/`
  - Caddy handles this natively with route ordering
- [ ] Validation: path must start with `/`, no query strings, no fragments

### API
- [ ] `POST /api/v1/apps/{id}/domains` accepts optional `path` field
- [ ] `GET /api/v1/apps/{id}/domains` returns path in response

### General
- [ ] Light and dark theme verified

## Technical Notes

- Caddy client: `src/caddy/` — the `add_route` function needs to accept an optional path matcher
- Caddy's `handle_path` directive strips the matched prefix by default — `handle` does not
- The domain model likely needs a migration to add a `path` column

## Out of Scope

- Header-based routing
- Query parameter routing
- Regular expression path matching (glob only)
- Rewrite rules
- Weighted routing / canary deployments

## Dependencies

- IF-005 (Caddy client), IF-023 (domain management)
