# IF-007: Daemon lifecycle management

**Phase:** 1 — Foundation
**Priority:** High
**Estimate:** M

## Description

Implement the daemon process lifecycle — start, stop, PID file management, signal handling, and systemd integration.

## Acceptance Criteria

- [ ] `icefall daemon start` starts the daemon in the foreground (systemd handles backgrounding)
- [ ] `icefall daemon stop` sends SIGTERM to the running daemon
- [ ] `icefall daemon status` reports whether daemon is running
- [ ] PID file at `/var/run/icefall.pid` (or configurable)
- [ ] SIGTERM handler: graceful shutdown (finish in-progress builds, close connections)
- [ ] SIGINT handler: same as SIGTERM
- [ ] Startup sequence: load config → connect DB → connect Docker → connect Caddy → start API server
- [ ] Startup health checks: verify Docker is reachable, data dir is writable
- [ ] Systemd service unit file template (`icefall.service`)
- [ ] Logging to stdout/stderr (systemd journal captures it)

## Dependencies

- IF-001, IF-003, IF-006
