# IF-141: Dashboard home — aggregate metrics and server health

**Phase:** 20D — Dashboard UI
**Priority:** Medium
**Estimate:** M

## Description

Enhance the dashboard home page to show aggregate metrics across all servers and a server health strip. When multiple servers are registered, the existing metrics cards show combined totals (total CPU, total RAM, total disk across all servers). A row of inline status dots below the metrics provides at-a-glance server health. On single-server installations, the home page remains unchanged.

## Acceptance Criteria

### Aggregate Metrics
- [ ] CPU metric card: shows weighted average CPU usage across all online servers
- [ ] RAM metric card: shows total used / total available across all servers
- [ ] Disk metric card: shows total used / total available across all servers
- [ ] App count: total apps across all servers
- [ ] Metrics fetched from `GET /api/v1/metrics` (enhanced to aggregate multi-server data)

### Server Health Strip
- [ ] Horizontal row of server indicators below the metrics cards
- [ ] Each indicator: colored dot + server name
- [ ] Dot colors: green (online), red (offline), yellow (enrolling), orange (draining)
- [ ] Click on a server name navigates to its detail page
- [ ] Only shown when 2 or more servers are registered

### Real-Time Updates
- [ ] Aggregate metrics update via SSE or polling (same interval as current home page)
- [ ] Server status dots update on `server.connected`/`server.disconnected` events
- [ ] New server appears in the strip when enrolled

### Single-Server Mode
- [ ] Health strip hidden
- [ ] Metrics cards show the same data as today (no visual change)
- [ ] No additional API calls

### Responsiveness
- [ ] Health strip wraps on small screens (dots stack into rows)
- [ ] Metric cards remain in the existing responsive grid

## Technical Notes

- The aggregate metrics endpoint should return per-server breakdowns in addition to totals, so the frontend can render both the aggregate cards and the health strip from one API call
- Consider a `useServerHealth` hook that subscribes to SSE events and maintains the server status map
- The health strip component: `src/islands/dashboard/ServerHealthStrip/ServerHealthStrip.tsx`
- Weighted average for CPU: `sum(cpu% * core_count) / total_cores` is more accurate than a simple average
- The existing home page component needs conditional rendering based on server count
- **Server recommendation:** These same metrics (CPU, RAM, disk, app count) feed the composite recommendation score used in server selection (IF-135, IF-139). The aggregate view and the recommendation scoring share the same underlying data from IF-127

## Out of Scope

- Per-server metrics breakdown on the home page (available on server detail pages)
- Historical aggregate metrics charts on the home page
- Server capacity warnings or alerts
- Custom dashboard layouts or widgets

## Dependencies

- IF-127 (agent metrics collection — provides multi-server metrics data)
- IF-136 (servers list page — establishes the server data patterns)
