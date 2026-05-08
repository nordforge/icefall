# IF-059: Start / Stop / Restart controls

**Phase:** 14 — Dashboard Surface
**Priority:** Critical
**Estimate:** S

## Description

Add container lifecycle controls to the dashboard for both apps and databases. The Docker client already has `stop_container`, `start_container`, and `restart_container` — this ticket wires those to UI buttons. Currently there's a non-functional "Stop App" button in the settings tab that needs to be replaced with working controls.

## Acceptance Criteria

- [ ] App overview tab: action buttons for Start, Stop, and Restart in the app header area
- [ ] Stop button shows a confirmation modal ("This will stop your app and make it unreachable. Continue?")
- [ ] Restart button triggers a graceful restart (stop + start) without confirmation
- [ ] Start button only visible when the app is stopped
- [ ] Buttons show loading state while the action is in progress
- [ ] Status indicator (StatusDot) updates in real-time via SSE after action completes
- [ ] Database detail page: same Start / Stop / Restart controls
- [ ] API endpoints used:
  - `POST /api/v1/apps/{id}/stop`
  - `POST /api/v1/apps/{id}/start`
  - `POST /api/v1/apps/{id}/restart`
  - Equivalent for databases
- [ ] Role enforcement: deployer and admin can start/stop/restart, viewer cannot
- [ ] Remove the existing non-functional "Stop App" button from settings tab
- [ ] Light and dark theme verified

## Technical Notes

- The Docker client wrapper in `src/docker/` already exposes container lifecycle methods via Bollard
- The MCP server's `restart_app` tool (tool #13) already calls the restart logic — reuse that code path
- SSE events for container state changes should use the existing EventBus

## Out of Scope

- Force kill / force stop (graceful only for v1.0)
- Bulk start/stop across multiple apps
- Scheduled start/stop

## Dependencies

- IF-019 (app detail page), IF-004 (Docker client)
