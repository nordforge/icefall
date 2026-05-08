# IF-060: Health check UI

**Phase:** 14 — Dashboard Surface
**Priority:** High
**Estimate:** M

## Description

The backend runs health checks (TCP + Docker) with auto-restart on failure, but none of this is visible in the dashboard. Surface health status, configuration, and event history in the app detail page.

## Acceptance Criteria

### Overview Tab
- [ ] Health status badge next to the app status dot: "Healthy", "Unhealthy", "Checking", "No health check"
- [ ] If unhealthy: show time since last healthy check and restart count
- [ ] Health badge color: green (healthy), red (unhealthy), yellow (checking), gray (unconfigured)

### Settings Tab — Health Check Configuration
- [ ] Section: "Health Checks" in app settings
- [ ] Toggle: Enable/disable health checks
- [ ] Fields when enabled:
  - Check type: TCP port check or HTTP path check (dropdown)
  - HTTP path (only for HTTP type, e.g., `/health`)
  - Expected status code (default: 200, only for HTTP type)
  - Check interval in seconds (default: 30, min: 10, max: 300)
  - Timeout in seconds (default: 5)
  - Failure threshold before marking unhealthy (default: 3)
  - Auto-restart on failure toggle (default: on)
  - Max restart attempts (default: 5, only when auto-restart is on)
- [ ] Save triggers update to app health check config via API
- [ ] Validation: interval must be > timeout

### Health Event History
- [ ] New section in the overview tab or deploys tab: "Health Events"
- [ ] Chronological list of health events: healthy, unhealthy, auto-restart, recovered
- [ ] Each event shows: timestamp, event type, details (e.g., "TCP check failed on port 3000")
- [ ] Wire to existing `GET /api/v1/apps/{id}/health` endpoint

### General
- [ ] Light and dark theme verified
- [ ] Mobile responsive

## Technical Notes

- Backend health runner: `src/monitoring/health_runner.rs` — fully implemented
- Health events are emitted to EventBus with `health.down`, `health.recovered`, `health.auto_restart` types
- The `GET /apps/{id}/health` endpoint returns current status and recent events
- Health check config is stored on the app model — check exact field names in the schema

## Out of Scope

- Custom health check scripts
- Health check for databases (separate ticket if needed)
- Uptime SLA calculations

## Dependencies

- IF-025 (health check system), IF-019 (app detail page)
