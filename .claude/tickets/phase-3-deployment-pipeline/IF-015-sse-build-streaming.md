# IF-015: SSE event streaming for builds and status

**Phase:** 3 — Deployment Pipeline
**Priority:** High
**Estimate:** M

## Description

Implement Server-Sent Events (SSE) endpoints for real-time streaming of build logs, deploy status changes, and health check updates to the web dashboard.

## Acceptance Criteria

- [ ] SSE endpoint: `GET /api/v1/events` (global event stream, filtered by auth role)
- [ ] SSE endpoint: `GET /api/v1/apps/:id/events` (app-specific stream)
- [ ] SSE endpoint: `GET /api/v1/apps/:id/deploys/:id/events` (deploy-specific stream)
- [ ] Event types:
  - `build.step.start` — new build step started (name, index)
  - `build.step.output` — log line within a step
  - `build.step.complete` — step finished (duration, status)
  - `build.complete` — entire build finished (success/failure)
  - `deploy.status` — deploy status changed
  - `health.status` — health check result
  - `container.metrics` — periodic CPU/memory stats
- [ ] Internal broadcast channel (`tokio::sync::broadcast`) for emitting events from build/deploy modules
- [ ] Auto-reconnection friendly (SSE `id` field for last-event-id)
- [ ] Connection cleanup on client disconnect
- [ ] Auth-gated: only authenticated users receive events
- [ ] Backpressure handling: drop old events if client is slow

## Dependencies

- IF-006, IF-010
