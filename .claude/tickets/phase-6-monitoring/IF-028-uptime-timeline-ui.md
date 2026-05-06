# IF-028: Uptime timeline UI component

**Phase:** 6 — Monitoring
**Priority:** Medium
**Estimate:** S

## Description

Visual uptime timeline showing health check history as a green/red bar across 24h/7d/30d.

## Acceptance Criteria

- [ ] Timeline component: horizontal bar divided into time segments
- [ ] Each segment colored: green (healthy), red (unhealthy), gray (no data)
- [ ] Time range selector: 24h, 7d, 30d
- [ ] Hover over segment: tooltip showing exact time and status
- [ ] Uptime percentage displayed alongside (e.g. "99.7% uptime")
- [ ] Placed on app detail Overview tab
- [ ] Data from `GET /api/v1/apps/:id/health` events
- [ ] Light and dark theme verified

## Dependencies

- IF-025, IF-019
