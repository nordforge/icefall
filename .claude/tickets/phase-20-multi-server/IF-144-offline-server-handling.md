# IF-144: Offline server handling

**Phase:** 20E — Polish & Security
**Priority:** High
**Estimate:** M

## Description

Gracefully handle the scenario where a worker server goes offline. The dashboard shows a persistent banner when any server is unreachable, apps on offline servers display an "unreachable" status, and deploy/restart actions are disabled for those apps. All offline indicators auto-dismiss when the server reconnects.

## Acceptance Criteria

### Offline Detection
- [ ] Server marked as offline when no heartbeat received for 45 seconds (from IF-119)
- [ ] SSE event `server.disconnected` triggers UI updates across the dashboard

### Persistent Banner
- [ ] When any server is offline: a banner appears at the top of every dashboard page
- [ ] Banner text: "{server_name} is offline" (or "{n} servers are offline" for multiple)
- [ ] Banner style: warning color (amber/orange), not dismissible by the user
- [ ] Banner auto-dismisses when the server reconnects (SSE `server.connected`)
- [ ] Banner includes a link to the server detail page

### App Status
- [ ] Apps on offline servers show "unreachable" status instead of their normal status
- [ ] StatusDot component: new "unreachable" state with a distinct color (gray or muted red)
- [ ] App list page: unreachable apps visually distinct but not hidden
- [ ] App detail page: status shows "unreachable" with explanation text

### Disabled Actions
- [ ] Deploy button disabled for apps on offline servers
- [ ] Restart button disabled for apps on offline servers
- [ ] Stop/start buttons disabled for apps on offline servers
- [ ] Disabled buttons show tooltip: "Server is offline"
- [ ] Terminal tab shows "Server offline — terminal unavailable"
- [ ] Log streaming paused with message: "Server offline — logs paused"

### Recovery
- [ ] When server reconnects: all disabled actions re-enable automatically
- [ ] App status reverts to the actual container status (agent reports on reconnect)
- [ ] Log streaming resumes from where it left off (agent sends buffered lines)
- [ ] No manual refresh needed — updates via SSE

### Edge Cases
- [ ] Control-plane server cannot go offline (it is the server running the dashboard)
- [ ] If all workers are offline: banner shown, all worker apps unreachable, control-plane apps unaffected
- [ ] Server flapping (rapid connect/disconnect): debounce status changes (5-second delay before showing offline)

## Technical Notes

- The banner component: `src/islands/shared/OfflineServerBanner/OfflineServerBanner.tsx`
- Banner should be rendered in the DashboardLayout so it appears on every page
- The offline state can be managed with a nanostore that SSE events update
- StatusDot needs a new variant — check existing StatusDot variants and add "unreachable"
- Debouncing prevents UI flicker during brief network blips

## Out of Scope

- Automatic failover (moving apps from offline servers to online servers)
- Email/webhook notifications for server offline events (future alerting feature)
- Offline server diagnostics (ping, traceroute, etc.)
- Retry mechanisms for failed deploys after reconnection

## Dependencies

- IF-119 (agent WebSocket endpoint for heartbeat tracking and SSE events)
- IF-136 (servers list page — offline indicators appear on server cards)
