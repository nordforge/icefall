# IF-143: Agent auto-update

**Phase:** 20E — Polish & Security
**Priority:** Medium
**Estimate:** M

## Description

Enable the control plane to push agent updates to connected workers. When a new Icefall release is detected, the control plane sends an update command to each agent with the download URL, SHA-256 checksum, and Ed25519 signature. The agent downloads the new binary, verifies its integrity and authenticity, performs an atomic binary swap, and lets systemd restart it. The dashboard shows the agent version per server for visibility.

## Acceptance Criteria

### Control Plane Update Detection
- [ ] Control plane checks for new releases periodically (same mechanism as self-update, if available)
- [ ] Compares the latest release's agent version against each connected agent's reported version
- [ ] Triggers update for agents that are behind the latest version

### Update Command
- [ ] `system.update` command sent to the agent via WebSocket
- [ ] Command payload:
  ```json
  {
    "version": "1.3.0",
    "download_url": "https://github.com/.../icefall-agent-v1.3.0-x86_64-linux.tar.gz",
    "sha256": "...",
    "signature": "<base64 Ed25519 signature>",
    "target": "x86_64-unknown-linux-musl"
  }
  ```
- [ ] Target matches the agent's current architecture

### Agent Update Execution
- [ ] Downloads the new binary from the provided URL
- [ ] Verifies SHA-256 checksum of the downloaded file
- [ ] Verifies Ed25519 signature against the embedded trusted public key
- [ ] If verification fails: abort update, report error to control plane, continue running
- [ ] Atomic binary swap:
  1. Write new binary to `/usr/local/bin/icefall-agent.new`
  2. `chmod +x` on the new binary
  3. `rename()` (atomic on same filesystem) to replace `/usr/local/bin/icefall-agent`
- [ ] Exit with code 0 — systemd restarts the agent with the new binary
- [ ] Agent reconnects to control plane with the new version

### Version Reporting
- [ ] Agent reports its version in the WebSocket connection handshake (custom header or initial message)
- [ ] Control plane stores agent version in `servers.agent_version`
- [ ] Dashboard shows agent version on the server detail page
- [ ] Dashboard shows a badge/icon when an agent is outdated

### Safety
- [ ] Updates are not forced — the agent validates before applying
- [ ] If the new binary crashes on startup: systemd restarts, hits crash loop, stays on new version (manual intervention needed)
- [ ] Consider: keep one previous binary as `/usr/local/bin/icefall-agent.prev` for manual rollback
- [ ] Rate limit: only one update attempt per 10 minutes per agent

### Admin Control
- [ ] `POST /api/v1/servers/{id}/update` — manually trigger an update for a specific server
- [ ] `POST /api/v1/servers/update-all` — trigger updates for all outdated agents
- [ ] Dashboard: "Update agent" button on server detail page when outdated

## Technical Notes

- The Ed25519 public key for verification is the same key embedded in the agent at compile time (from IF-097/IF-124)
- Atomic rename requires the temp file and target to be on the same filesystem — `/usr/local/bin/` should be safe
- The agent should report its architecture so the control plane sends the correct binary
- Consider a pre-update health check: verify the agent can reach the download URL before starting
- Systemd `Restart=always` with `RestartSec=5` ensures the agent restarts after the binary swap

## Out of Scope

- Automatic rollback on crash (requires a supervisor more sophisticated than systemd)
- Staged rollouts (update all agents simultaneously)
- Agent downgrade support
- Update channels (beta, nightly) — all agents track stable

## Dependencies

- IF-121 (agent binary with the message loop and shutdown handling)
- IF-124 (release workflow produces signed agent binaries)
