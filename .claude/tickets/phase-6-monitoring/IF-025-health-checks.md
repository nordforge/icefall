# IF-025: Health check system

**Phase:** 6 — Monitoring
**Priority:** High
**Estimate:** M

## Description

Implement health checks that monitor deployed containers and trigger auto-restart on failure.

## Acceptance Criteria

- [ ] Health check types:
  - **TCP** — attempt TCP connection to container port, success = port open
  - **Docker native** — use Docker's built-in HEALTHCHECK if defined in image
- [ ] Health check configuration per app:
  - Type (tcp/docker, default: tcp)
  - Interval (default: 30s)
  - Timeout per check (default: 5s)
  - Failure threshold (default: 3 consecutive failures)
  - Auto-restart enabled (default: true)
  - Auto-restart max retries (default: 5)
- [ ] Health check runner as a background tokio task in the daemon
- [ ] Status tracking: healthy / unhealthy / unknown
- [ ] On failure threshold reached:
  - Mark app as unhealthy
  - If auto-restart enabled: restart container
  - Emit SSE event (`health.status`)
  - Trigger notification (if configured)
- [ ] On recovery: mark healthy, emit event, trigger recovery notification
- [ ] Health check event history stored in DB (last 1000 events per app)
- [ ] Uptime calculation from event history (percentage over 24h/7d/30d)
- [ ] API endpoints:
  - `GET /api/v1/apps/:id/health` — current status + recent events
  - `PUT /api/v1/apps/:id/health` — update check configuration

## Dependencies

- IF-004, IF-002, IF-015
