# IF-123: Install script served by control plane

**Phase:** 20A — Multi-Server Foundation
**Priority:** High
**Estimate:** M

## Description

The control plane serves a shell script at a public endpoint that automates the complete setup of a worker server. The script downloads the agent binary, verifies its integrity, writes the configuration, installs Docker and Caddy if needed, creates a systemd service, and starts the agent. This is what the user runs on a fresh VPS after generating a setup command in the dashboard.

## Acceptance Criteria

### Script Endpoint
- [ ] `GET /api/v1/servers/setup` serves a shell script
- [ ] Content-Type: `text/x-shellscript`
- [ ] No authentication required (the enrollment token inside the script provides auth)
- [ ] Script is generated from a template with the control plane URL baked in

### Agent Binary Download
- [ ] Agent binary hosted at `GET /api/v1/agent/download/{target}`
- [ ] Supported targets: `x86_64-linux`, `aarch64-linux`
- [ ] Script detects architecture: `uname -m` → maps to target
- [ ] Downloads binary to `/usr/local/bin/icefall-agent`
- [ ] SHA-256 checksum file at `GET /api/v1/agent/download/{target}.sha256`
- [ ] Script verifies checksum after download; aborts on mismatch

### Dependency Installation
- [ ] Installs Docker if `docker` command not found:
  - Uses official `get.docker.com` script
  - Verifies Docker daemon is running after install
  - Adds current user to `docker` group
- [ ] Installs Caddy if `caddy` command not found:
  - Uses official Caddy package repository for the detected OS
  - Enables and starts Caddy systemd service

### Configuration
- [ ] Creates `/etc/icefall-agent/` directory
- [ ] Writes `/etc/icefall-agent/config.toml` with:
  - `control_plane_url` — baked into the script from the template
  - `token` — passed as a script argument or environment variable
- [ ] Config file permissions: 0600, owned by root

### Systemd Service
- [ ] Creates `/etc/systemd/system/icefall-agent.service`
- [ ] Service configuration:
  - `Type=simple`
  - `Restart=always`
  - `RestartSec=5`
  - `ExecStart=/usr/local/bin/icefall-agent`
- [ ] Hardened with:
  - `NoNewPrivileges=yes`
  - `ProtectSystem=strict`
  - `ProtectHome=yes`
  - `ReadWritePaths=/etc/icefall-agent`
- [ ] `systemctl daemon-reload && systemctl enable --now icefall-agent`

### Script UX
- [ ] Script starts with `#!/bin/bash` and `set -euo pipefail`
- [ ] Colored output for status messages (with `NO_COLOR` support)
- [ ] Clear error messages on failure with suggested remediation
- [ ] Prints summary on success: "Agent installed and running. Waiting for enrollment..."
- [ ] Exit code 0 on success, non-zero on any failure

## Technical Notes

- The one-liner the user copies from the dashboard looks like:
  ```
  curl -fsSL https://<control-plane>/api/v1/servers/setup | bash -s -- --token <enrollment_token>
  ```
- The script template can use Rust's `format!` or a simple string replacement for the control plane URL
- Binary hosting: either serve from disk (release artifacts) or proxy to GitHub Releases
- For aarch64 detection: `uname -m` returns `aarch64` on ARM64 Linux

## Out of Scope

- macOS or Windows agent installation
- Containerized agent deployment (Docker-in-Docker)
- Ansible/Terraform/Pulumi integration (future phase)
- Uninstall script (covered in IF-146)

## Dependencies

- IF-118 (server creation generates the enrollment token used in the script)
- IF-121 (agent binary must exist to be downloaded)
