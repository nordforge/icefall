# IF-026: Container metrics collection

**Phase:** 6 — Monitoring
**Priority:** Medium
**Estimate:** M

## Description

Collect and expose basic container metrics (CPU, memory, network) via the Docker stats API.

## Acceptance Criteria

- [ ] Background task polling Docker stats API per running container
- [ ] Metrics collected: CPU %, memory usage/limit, network rx/tx bytes
- [ ] Polling interval: configurable (default: 10s)
- [ ] Metrics stored in-memory (ring buffer, last 1 hour per container)
- [ ] API endpoints:
  - `GET /api/v1/apps/:id/metrics` — current snapshot
  - `GET /api/v1/apps/:id/metrics/history?period=1h` — time series
  - `GET /api/v1/server/metrics` — aggregate server metrics (total CPU, RAM, disk)
- [ ] SSE events: `container.metrics` emitted on each poll
- [ ] Server-level metrics: total/used CPU, total/used RAM, disk usage (from OS, not Docker)
- [ ] Dashboard integration: resource bars on app detail and home page

## Dependencies

- IF-004, IF-015
