# IF-137: Add server flow (dashboard)

**Phase:** 20D — Dashboard UI
**Priority:** High
**Estimate:** L

## Description

Build the dashboard UI for adding a new worker server. Instead of a modal, the flow uses an inline panel on the servers page. The user enters a server name, generates a setup command, copies it, and runs it on the target machine. The dashboard shows real-time connection progress as the agent enrolls and reports its status. The entire flow is designed to feel fast and guided.

## Acceptance Criteria

### Inline Panel
- [ ] "Add server" button opens an inline panel (slides down or expands in-page, not a modal)
- [ ] Panel contains:
  - Server name input field (required)
  - Host IP/hostname input field (required)
  - "Generate setup command" button
- [ ] Validation: name and host required before generating

### Setup Command Generation
- [ ] Calls `POST /api/v1/servers` to create the server and get the enrollment token
- [ ] Displays the one-liner command:
  ```
  curl -fsSL https://<control-plane>/api/v1/servers/setup | bash -s -- --token <token>
  ```
- [ ] Copy button next to the command (copies to clipboard)
- [ ] Token expiry countdown: "Token expires in 14:32" (updates in real time)
- [ ] "Regenerate token" link if the token expires

### Connection Progress
- [ ] Real-time progress via SSE events, displayed as a 4-step checklist:
  1. Agent connected
  2. Docker check passed
  3. Network verified
  4. Server registered
- [ ] Each step shows: pending (gray), in progress (spinner), complete (checkmark), failed (X)
- [ ] Progress updates automatically as SSE events arrive

### Error States
- [ ] Docker not found on worker: show error at step 2 with remediation hint
- [ ] Connection timeout (no agent connect within 15 minutes): show "Token expired" with regenerate option
- [ ] Auth failed: show "Invalid token" error
- [ ] Network unreachable: show error with troubleshooting steps

### Success State
- [ ] All 4 steps complete: panel shows "Server ready to receive deployments"
- [ ] "View server" button navigates to the server detail page
- [ ] Server card appears in the grid behind the panel (real-time via SSE)

### UX Details
- [ ] Panel is dismissible (X button or Escape key)
- [ ] Dismissing during enrollment: server record persists, agent can still connect
- [ ] Focus management: focus moves to the name input when panel opens
- [ ] Keyboard accessible: all actions reachable via Tab + Enter

## Technical Notes

- The inline panel pattern avoids modal accessibility complexity while keeping context
- Token expiry: store the creation timestamp and compute remaining time client-side
- SSE events for enrollment progress may need new event types: `server.enrollment.step`
- The 4-step progress is a UX simplification — the actual enrollment is: WebSocket connect → enrollment POST → agent reports Docker status → agent reports ready
- Consider a `useServerEnrollment` hook that manages the SSE subscription and step state

## Out of Scope

- Bulk server addition (one at a time)
- SSH-based setup (user runs the command manually)
- Server import from other platforms
- Custom agent configuration during setup

## Dependencies

- IF-118 (server CRUD API for creating the server record)
- IF-122 (enrollment flow for token exchange)
- IF-123 (install script served at the generated URL)
