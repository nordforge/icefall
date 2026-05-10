# IF-136: Servers list page

**Phase:** 20D — Dashboard UI
**Priority:** High
**Estimate:** M

## Description

Add a Servers page to the dashboard that displays all registered servers as cards in a grid layout. Each card shows the server name, IP, status, app count, and CPU/RAM usage bars. An "Add server" button initiates the enrollment flow. The sidebar dynamically labels the link "Server" or "Servers" based on the count. On single-server installations, the sidebar link navigates directly to the control-plane server detail view.

## Acceptance Criteria

### Servers Page
- [ ] New page at `/servers`
- [ ] Fetches server list from `GET /api/v1/servers`
- [ ] Displays servers as cards in a responsive grid (reuses card grid pattern from ProjectsPage)
- [ ] Each server card shows:
  - Server name
  - Host IP/hostname
  - Status dot (online = green, offline = red, enrolling = yellow, draining = orange)
  - Number of apps deployed
  - CPU usage bar with percentage
  - RAM usage bar with percentage
- [ ] "Add server" button in the page header
- [ ] Empty state when only the control-plane server exists: "Add a server to distribute your workload"

### Single-Server Behavior
- [ ] If only one server (control plane): `/servers` redirects to `/servers/{control-plane-id}`
- [ ] Sidebar link points directly to the detail view in single-server mode

### Sidebar Integration
- [ ] Sidebar shows "Server" (singular) when only one server exists
- [ ] Sidebar shows "Servers" (plural) when multiple servers exist
- [ ] Server count fetched alongside the existing sidebar data
- [ ] Active state on the sidebar link when on `/servers` or `/servers/*`

### Real-Time Updates
- [ ] Server status updates received via SSE (`server.connected`, `server.disconnected`)
- [ ] Status dots update in real time without page reload
- [ ] Metrics bars update periodically (poll every 10s or via SSE)

### Control-Plane Server Card
- [ ] Control-plane server shown with a distinct "Control plane" badge
- [ ] Cannot be deleted (no delete action in card menu)

## Technical Notes

- Follow the existing island pattern: `src/islands/servers/ServersPage/ServersPage.tsx`
- Astro page at `src/pages/servers.astro` using `DashboardLayout`
- Reuse the card grid CSS from `projects-page.module.css` or extract shared grid styles
- StatusDot component may need new states (enrolling, draining) — check if it already supports them
- Server count for sidebar: consider adding it to the existing layout data fetch to avoid an extra API call

## Out of Scope

- Server filtering or search (small number of servers expected)
- Server sorting or custom ordering
- Map view showing server locations
- Resource allocation planning views

## Dependencies

- IF-118 (server CRUD API for fetching server list)
