# IF-017: Dashboard home page

**Phase:** 4 — Web Dashboard
**Priority:** High
**Estimate:** M

## Description

The main dashboard page showing server health overview and a grid of all deployed apps.

## Acceptance Criteria

- [ ] Server resource bar at top:
  - CPU usage (percentage bar)
  - RAM usage (used / total bar)
  - Disk usage (used / total bar)
  - Data from `GET /api/v1/server/status`
- [ ] App grid/list:
  - Card per app: name, status dot (online/deploying/failed/stopped), primary domain, framework icon, last deploy time
  - Click card → navigate to app detail
  - Quick actions on card: redeploy button, link to logs
- [ ] Empty state: friendly message + "Create your first app" CTA
- [ ] Grid layout: 1 col (mobile), 2 col (tablet), 3 col (desktop)
- [ ] Real-time status updates via SSE (status dots update live)
- [ ] Light and dark theme verified

## Design References (Stitch — Light Mode)

| Screen | Stitch ID | Screenshot folder |
|--------|-----------|-------------------|
| Icefall Dashboard (Light) | `5a0920c332834efe99f987bca26e2e68` | `design_screenshots/dashboard/` |

## Dependencies

- IF-016, IF-006
