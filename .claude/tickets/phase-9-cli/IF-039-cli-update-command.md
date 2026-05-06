# IF-039: CLI self-update command

**Phase:** 9 — CLI
**Priority:** Medium
**Estimate:** S

## Description

`icefall update` command that checks for new versions and updates the binary in-place.

## Acceptance Criteria

- [ ] `icefall update` — check for latest version, download if newer, replace binary
- [ ] `icefall update --check` — only check, don't download
- [ ] Version check: fetch latest release from GitHub API (or custom update server)
- [ ] Download: architecture-appropriate binary (x86_64, aarch64)
- [ ] Replace: download to temp, verify checksum, atomic rename over current binary
- [ ] Daemon restart: prompt user to restart daemon after update (`icefall daemon restart`)
- [ ] Current version: `icefall --version`
- [ ] Dashboard integration: daemon API endpoint returns current + latest version for UI banner

## Dependencies

- IF-001
