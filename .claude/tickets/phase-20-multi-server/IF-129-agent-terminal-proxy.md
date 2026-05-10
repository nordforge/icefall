# IF-129: Agent terminal proxy

**Phase:** 20B — Agent Core
**Priority:** Medium
**Estimate:** M

## Description

Enable interactive terminal sessions with containers running on remote servers. The agent handles terminal lifecycle commands (open, input, resize, close) by creating Docker exec sessions with TTY support. The control plane proxies terminal data bidirectionally between the dashboard WebSocket and the agent WebSocket, so the existing TerminalTab component works without modification.

## Acceptance Criteria

### Agent Terminal Handlers
- [ ] `terminal.open` — creates a Docker exec session with TTY
  - Parameters: container_id, shell (default `/bin/sh`)
  - Creates exec instance with `AttachStdin`, `AttachStdout`, `AttachStderr`, `Tty` enabled
  - Starts the exec session and begins streaming
  - Returns: session_id (for subsequent input/resize/close)
- [ ] `terminal.input` — sends stdin data to the exec session
  - Parameters: session_id, data (base64-encoded bytes)
  - Writes to the exec session's stdin
- [ ] `terminal.resize` — resizes the TTY
  - Parameters: session_id, cols, rows
  - Calls Docker exec resize API
- [ ] `terminal.close` — terminates the exec session
  - Parameters: session_id
  - Sends SIGHUP to the exec process, cleans up resources

### Terminal Output
- [ ] Agent streams exec stdout/stderr as `terminal.output` Event messages
- [ ] Event data: `{ session_id, data }` (data is base64-encoded)
- [ ] Output is streamed in real-time (no batching — low latency is critical for interactive use)

### Control Plane Proxy
- [ ] Control plane routes `terminal.input` from the dashboard WebSocket to the correct agent
- [ ] Control plane routes `terminal.output` Events from the agent to the correct dashboard WebSocket
- [ ] Routing key: app's server_id determines which agent connection to use
- [ ] Existing TerminalTab component does not need changes (control plane handles the indirection)

### Session Management
- [ ] Maximum 5 concurrent terminal sessions per agent
- [ ] Sessions auto-close after 30 minutes of inactivity (no input received)
- [ ] On agent disconnect: all terminal sessions are terminated
- [ ] On dashboard WebSocket disconnect: close the corresponding terminal session

## Technical Notes

- Use `bollard::exec::CreateExecOptions` and `bollard::exec::StartExecOptions`
- The exec attach returns a `AttachResult` stream — read from it in a loop and forward as Events
- Base64 encoding for terminal data is necessary because it may contain arbitrary bytes (escape sequences, binary data)
- The control plane proxy logic needs a mapping: dashboard_session → (server_id, agent_session_id)
- Latency is important for interactive shells — avoid unnecessary buffering

## Out of Scope

- File upload/download through the terminal
- Terminal session recording or replay
- Multi-user shared terminal sessions
- SSH passthrough (this is Docker exec only)

## Dependencies

- IF-125 (Docker operations handler for container access)
