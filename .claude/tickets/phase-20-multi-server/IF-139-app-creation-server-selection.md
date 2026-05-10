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

### Server Capacity Cards
- [ ] Each server displayed as a selectable radio-button card with visual capacity indicators
- [ ] Card contents:
  - Server name
  - Host IP/hostname
  - Role badge ("Control plane" or "Worker")
  - CPU usage bar with percentage
  - RAM usage bar with percentage
  - Disk usage bar with percentage
  - App count indicator (e.g., "3 apps deployed")
  - **"Recommended" tag** on the server with the best composite score (from IF-135)
- [ ] Selected card has a visible highlight (border or background change)
- [ ] Only online servers are selectable; offline servers shown but disabled with "Offline" label
- [ ] Capacity bars use color coding: green (< 60%), amber (60-80%), red (> 80%)

### Pre-Selection and Recommendation
- [ ] Pre-selects the server tagged as "Recommended" (best composite score based on CPU + RAM + Disk + app count)
- [ ] "Recommended" tag is a composite score — not just one metric — covering CPU, RAM, disk, and app count
- [ ] If all servers have equal scores: pre-selects the first worker (not the control plane)
- [ ] User always confirms selection — no auto-placement, recommendation is advisory only

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
- "Recommended" tag logic: use the composite score from the API response (IF-135), display tag on the card with the highest score
- Wizard state management: use the existing wizard state pattern (likely nanostores or prop drilling)

## Out of Scope

- Automatic server placement (user always confirms, "Recommended" is advisory)
- Resource reservation or capacity planning
- Creating a new server from within the app creation flow
- Server comparison view

## Dependencies

- IF-135 (backend server selection in app creation API)
- IF-136 (servers list page — ensures server data is available and the pattern is established)
