# IF-121: Agent binary skeleton

**Phase:** 20A — Multi-Server Foundation
**Priority:** Critical
**Estimate:** L

## Description

Create the minimal agent binary that can connect to the control plane over WebSocket, authenticate with a bearer token, maintain a heartbeat, and reconnect with exponential backoff. This is the empty shell that subsequent tickets (IF-125 through IF-130) fill with actual handlers. The binary must be small, efficient, and suitable for running as a systemd service on minimal VPS instances.

## Acceptance Criteria

### Project Structure
- [ ] `agent/` directory with its own `Cargo.toml`
- [ ] Binary name: `icefall-agent`
- [ ] Minimal dependency set:
  - `tokio` (runtime, net, signal, sync, time)
  - `tokio-tungstenite` (WebSocket client)
  - `bollard` (Docker API)
  - `reqwest` (HTTP client for Caddy API and downloads)
  - `sysinfo` (system metrics)
  - `serde` + `serde_json` (serialization)
  - `ed25519-dalek` (signature verification)
  - `tracing` + `tracing-subscriber` (structured logging)
  - `icefall-common` (shared types)

### Configuration
- [ ] Loads config from `/etc/icefall-agent/config.toml`
- [ ] Config fields: `control_plane_url`, `token`, `server_id`, `log_level`
- [ ] CLI flag `--config` to override config path
- [ ] Missing config file: exit with clear error message and example config
- [ ] Environment variable overrides: `ICEFALL_CONTROL_PLANE_URL`, `ICEFALL_TOKEN`

### WebSocket Connection
- [ ] Connects to `{control_plane_url}/api/v1/agent/ws`
- [ ] Sets `Authorization: Bearer {token}` header on upgrade request
- [ ] On successful connection: logs "Connected to control plane" at INFO level
- [ ] On auth failure (401): logs error and exits (do not retry with bad token)

### Reconnection with Exponential Backoff
- [ ] On connection drop: reconnect with backoff starting at 1 second
- [ ] Backoff sequence: 1s → 2s → 4s → 8s → 16s → 32s → 64s → 128s → 256s → 300s (cap)
- [ ] Add jitter: +/- 20% randomization on each delay
- [ ] Reset backoff to 1s on successful connection
- [ ] Log each reconnection attempt with the delay

### Heartbeat
- [ ] Send WebSocket Ping frame every 15 seconds
- [ ] If no Pong received within 10 seconds: close connection and trigger reconnect
- [ ] Heartbeat runs as a separate tokio task

### Graceful Shutdown
- [ ] Listens for SIGTERM and SIGINT
- [ ] On signal: sends WebSocket close frame, waits up to 5s for in-flight operations, then exits
- [ ] Exit code 0 on clean shutdown

### Binary Size & Resource Targets
- [ ] Target: ~8 MB stripped musl binary (includes build logic from icefall-common: framework detection + Dockerfile generation)
- [ ] Target: < 12 MB idle RAM usage
- [ ] Profile: `[profile.release]` with `lto = true`, `codegen-units = 1`, `strip = true`

### Message Loop
- [ ] Main loop reads incoming WebSocket messages
- [ ] Deserializes JSON into `AgentMessage` (from icefall-common)
- [ ] Dispatches to handler by method name (stub handlers that log "unhandled method: {name}")
- [ ] Sends Response messages back for Request messages (stub returns error: "not implemented")

## Technical Notes

- Use `tokio::select!` for the main loop: WebSocket read, heartbeat timer, shutdown signal
- The reconnection loop wraps the entire connection lifecycle
- Consider `tracing-subscriber` with JSON output for production and pretty output for development
- For musl builds: ensure `bollard` and `reqwest` work with `native-tls` vendored or switch to `rustls`
- Test with `cargo build --target x86_64-unknown-linux-musl` early to catch linking issues

## Design Decision

The agent binary is ~8 MB (not smaller) because it includes the full build pipeline from `icefall-common`: framework detection (`build/detect.rs`) and Dockerfile generation (`build/dockerfile.rs`). This allows the agent to handle the complete build flow locally on the worker — git clone, detect framework, generate Dockerfile, docker build — without any image transfer from the control plane.

## Out of Scope

- Actual Docker, Caddy, or metrics handlers (covered in IF-125 through IF-130)
- Enrollment flow (covered in IF-122)
- Auto-update mechanism (covered in IF-143)
- Windows or macOS support (Linux only)

## Dependencies

- IF-120 (Cargo workspace must be set up first)
