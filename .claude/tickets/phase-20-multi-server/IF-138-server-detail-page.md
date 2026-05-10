# IF-138: Server detail page

**Phase:** 20D — Dashboard UI
**Priority:** High
**Estimate:** M

## Description

Build the server detail page with tabbed navigation showing overview metrics, apps deployed on the server, historical metrics charts, and server settings. The page reuses existing patterns (metric cards, sparklines, app cards) and adds a danger zone for worker server management. The control-plane server detail page omits destructive actions.

## Acceptance Criteria

### Page Structure
- [ ] Route: `/servers/{id}`
- [ ] Fetches server details from `GET /api/v1/servers/{id}`
- [ ] Header: server name, status dot, role badge ("Control plane" or "Worker"), host IP
- [ ] Tabbed navigation: Overview | Apps | Metrics | Settings

### Overview Tab
- [ ] Metric cards: CPU %, RAM usage, Disk usage, App count
- [ ] Sparkline charts for CPU and RAM (last 1 hour, data from metrics history)
- [ ] Connection info: agent version, last heartbeat, registered date
- [ ] Uptime since last connection

### Apps Tab
- [ ] Lists all apps on this server using existing AppCard component
- [ ] Empty state: "No apps deployed to this server"
- [ ] Link to create a new app (pre-selects this server if IF-139 is implemented)

### Metrics Tab
- [ ] Historical charts: CPU, RAM, Disk, Network I/O
- [ ] Time range selector: 1h, 6h, 24h, 7d
- [ ] Data from `GET /api/v1/servers/{id}/metrics?range={timerange}`
- [ ] Per-container breakdown table below the charts

### Settings Tab
- [ ] Editable fields: server name, labels (key-value pairs)
- [ ] Save button calls `PUT /api/v1/servers/{id}`
- [ ] Danger zone (workers only):
  - "Disconnect server" — sets status to draining, waits for apps to be migrated
  - "Force remove" — type server name to confirm, calls `DELETE /api/v1/servers/{id}?force=true`
- [ ] Danger zone hidden for the control-plane server

### Real-Time Updates
- [ ] Metrics update via SSE or polling (10-second interval)
- [ ] Status dot updates on `server.connected`/`server.disconnected` events
- [ ] App list updates when apps are added/removed from this server

## Technical Notes

- Island: `src/islands/servers/ServerDetail/ServerDetail.tsx` with tab sub-components
- Astro page: `src/pages/servers/[id].astro`
- Reuse metric card components from the existing dashboard home page
- Sparkline charts: use the same charting approach as existing metrics (canvas or SVG)
- The danger zone pattern should match existing patterns (e.g., app deletion in settings)
- Labels editor: simple key-value pair list with add/remove

## Out of Scope

- Server terminal (SSH access to the server itself)
- Server log viewer (agent logs)
- Resource quotas or limits per server
- Server notifications or alert configuration

## Dependencies

- IF-136 (servers list page provides navigation to this page)
