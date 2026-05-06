# IF-040: Installation script

**Phase:** 10 — Install & Migration
**Priority:** High
**Estimate:** M

## Description

One-liner curl install script that sets up Icefall on a fresh server.

## Acceptance Criteria

- [ ] Script hosted at `https://icefall.dev/install.sh` (or GitHub raw URL initially)
- [ ] OS detection: Ubuntu, Debian, RHEL/CentOS, Fedora, Arch
- [ ] Architecture detection: x86_64, aarch64
- [ ] Prerequisites check:
  - Docker installed → if not, offer to install via official Docker install script
  - curl/wget available
  - Systemd available
- [ ] Download Icefall binary for detected arch to `/usr/local/bin/icefall`
- [ ] Install Caddy if not present (via official Caddy package repo)
- [ ] Create data directory (`/var/lib/icefall/`)
- [ ] Generate default config file (`/etc/icefall/config.toml`)
- [ ] Create systemd service files:
  - `icefall.service` for the daemon
  - Ensure `caddy.service` is enabled
- [ ] Start both services
- [ ] Print: "Icefall is running! Open http://<server-ip>:PORT to complete setup"
- [ ] Non-interactive mode (`--yes` flag for automated installs)
- [ ] Uninstall instructions in comments at top of script
- [ ] Script is idempotent (safe to run again)

## Dependencies

- IF-007 (daemon must be functional)
