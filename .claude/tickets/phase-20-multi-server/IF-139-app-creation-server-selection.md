# IF-139: App creation — server selection step

**Phase:** 20D — Dashboard UI
**Priority:** Medium
**Estimate:** M

## Description

Add a server selection step to the app creation wizard. This step only appears when two or more servers are registered. Each server is presented as a radio-button card showing its name, IP, and current resource usage. The server with the lowest resource usage is pre-selected. The selected server_id is included in the app creation API call.

## Acceptance Criteria

### Server Selection Step
- [ ] New step in the app creation wizard between Source and Config steps
- [ ] Only shown when 2 or more servers are registered
- [ ] Single-server installations: step is skipped, server_id defaults to control plane

### Server Cards
- [ ] Each server displayed as a selectable radio-button card
- [ ] Card contents:
  - Server name
  - Host IP/hostname
  - Role badge ("Control plane" or "Worker")
  - CPU usage bar with percentage
  - RAM usage bar with percentage
  - Disk usage bar with percentage
  - Number of apps already deployed
- [ ] Selected card has a visible highlight (border or background change)
- [ ] Only online servers are selectable; offline servers shown but disabled with "Offline" label

### Pre-Selection
- [ ] Pre-selects the server with the lowest combined resource usage (average of CPU + RAM %)
- [ ] If all servers have equal usage: pre-selects the first worker (not the control plane)

### Integration
- [ ] Selected `server_id` stored in the wizard state
- [ ] Included in the `POST /api/v1/apps` request body
- [ ] Step validation: a server must be selected before proceeding

### Accessibility
- [ ] Radio-button cards use proper `role="radio"` and `aria-checked`
- [ ] Arrow keys navigate between options
- [ ] Focus visible on the selected card
- [ ] Screen reader announces: server name, role, and resource usage

## Technical Notes

- The wizard step component: `src/islands/app-create/ServerSelectStep/ServerSelectStep.tsx`
- Fetch server list with metrics from `GET /api/v1/servers`
- The radio-card pattern can be reused for other selection UIs in the future
- Resource usage data is approximate (based on last metrics snapshot) — this is for guidance, not precision
- Wizard state management: use the existing wizard state pattern (likely nanostores or prop drilling)

## Out of Scope

- Server recommendation engine or auto-placement
- Resource reservation or capacity planning
- Creating a new server from within the app creation flow
- Server comparison view

## Dependencies

- IF-135 (backend server selection in app creation API)
- IF-136 (servers list page — ensures server data is available and the pattern is established)
