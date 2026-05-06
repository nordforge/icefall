# IF-006: REST API skeleton with Axum

**Phase:** 1 — Foundation
**Priority:** Critical
**Estimate:** M

## Description

Set up the Axum-based HTTP server that serves the REST API. This is the daemon's public interface — everything the web dashboard and CLI client talks to.

## Acceptance Criteria

- [ ] Axum router with versioned API prefix (`/api/v1`)
- [ ] Shared application state (database pool, Docker client, Caddy client, config)
- [ ] JSON request/response serialization via serde
- [ ] Error handling middleware (consistent error response format with status codes)
- [ ] CORS configuration for dashboard origin
- [ ] Request logging middleware
- [ ] Route stubs for all major resources:
  - `GET/POST /api/v1/apps`
  - `GET/PUT/DELETE /api/v1/apps/:id`
  - `GET/POST /api/v1/apps/:id/deploys`
  - `GET/POST /api/v1/apps/:id/env`
  - `GET/POST /api/v1/apps/:id/domains`
  - `GET/POST /api/v1/databases`
  - `GET/POST /api/v1/users`
  - `GET/PUT /api/v1/settings`
  - `GET /api/v1/server/status`
- [ ] SSE endpoint skeleton (`/api/v1/events`)
- [ ] OpenAPI spec auto-generation setup (via `utoipa` or similar)
- [ ] Graceful shutdown (finish in-flight requests)

## Dependencies

- IF-001, IF-002, IF-003
