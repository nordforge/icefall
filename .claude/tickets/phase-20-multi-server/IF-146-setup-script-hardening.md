# IF-146: Setup script hardening

**Phase:** 20E — Polish & Security
**Priority:** Medium
**Estimate:** S

## Description

Harden the install script (from IF-123) to be idempotent, support multiple Linux distributions, use official package sources for Docker and Caddy, and include an uninstall script. The script must be safe to run multiple times without side effects and handle edge cases like pre-existing Docker installations or partial previous runs.

## Acceptance Criteria

### Idempotency
- [ ] Safe to run multiple times without errors or side effects
- [ ] Checks for existing installations before installing:
  - If `icefall-agent` binary exists and is the correct version: skip download
  - If Docker is installed and running: skip Docker install
  - If Caddy is installed and running: skip Caddy install
  - If systemd service exists: stop, update, restart (not duplicate)
- [ ] Config file: merge new values, do not overwrite existing config

### OS Detection
- [ ] Detects OS and version from `/etc/os-release`
- [ ] Supported distributions:
  - Ubuntu 20.04+
  - Debian 11+
  - CentOS / Rocky Linux / AlmaLinux 8+
  - Alpine 3.16+
  - Fedora 38+
- [ ] Unsupported OS: exits with clear error and manual install instructions

### Docker Installation
- [ ] Uses official `get.docker.com` script for Docker CE
- [ ] Verifies Docker daemon is running after install: `docker info`
- [ ] Verifies Docker socket is accessible: `docker ps`
- [ ] If Docker is installed but not running: attempts to start it
- [ ] Adds the service user to the `docker` group if needed

### Caddy Installation
- [ ] Uses official Caddy package repository:
  - Debian/Ubuntu: `https://dl.cloudsmith.io/public/caddy/stable/deb/debian`
  - CentOS/Fedora: `https://dl.cloudsmith.io/public/caddy/stable/rpm/el`
  - Alpine: `apk add caddy` from community repository
- [ ] Enables and starts Caddy systemd service (or OpenRC on Alpine)
- [ ] Verifies Caddy admin API is reachable: `curl -s http://localhost:2019/config/`

### Docker Socket Verification
- [ ] After Docker install: verify `/var/run/docker.sock` exists and is accessible
- [ ] If socket is not accessible: print error with remediation (add user to docker group, restart)

### Uninstall Script
- [ ] `GET /api/v1/agent/uninstall` serves an uninstall shell script
- [ ] Uninstall script:
  - Stops and disables the icefall-agent systemd service
  - Removes the service file
  - Removes the binary from `/usr/local/bin/`
  - Removes `/etc/icefall-agent/` config directory (with confirmation prompt)
  - Does NOT remove Docker or Caddy (they may be used by other services)
- [ ] No authentication required for the uninstall script endpoint

### Script Quality
- [ ] `shellcheck` passes with no errors or warnings
- [ ] Supports `NO_COLOR` environment variable for uncolored output
- [ ] Logs all actions to `/var/log/icefall-agent-install.log`
- [ ] Traps errors and prints the failing command with line number
- [ ] Requires root (exits early with a clear message if not root)

## Technical Notes

- Use `command -v` for checking if a binary exists (POSIX-compatible)
- For Alpine: systemd is not available — use OpenRC instead (`rc-service`, `rc-update`)
- The `get.docker.com` script handles its own OS detection, but verify it completed successfully
- Caddy package repos require adding GPG keys — use the official Caddy instructions per distro
- The idempotency check for the agent binary can compare SHA-256 hashes

## Out of Scope

- Docker Compose installation
- Custom Docker daemon configuration (storage drivers, log drivers)
- Firewall configuration (the user must open ports 80/443 manually)
- Non-systemd init systems other than OpenRC (e.g., runit, s6)

## Dependencies

- IF-123 (base install script that this ticket hardens)
