# IF-003: Configuration system

**Phase:** 1 — Foundation
**Priority:** Critical
**Estimate:** S

## Description

Implement the daemon's configuration system. Config is loaded from a TOML file (`/etc/icefall/config.toml` or `~/.config/icefall/config.toml`) with environment variable overrides.

## Acceptance Criteria

- [ ] Config struct defined with serde deserialization
- [ ] Settings: listen address/port, data directory, SQLite path, Docker socket path, Caddy admin URL, base domain, SMTP settings, backup settings
- [ ] TOML file loading with sensible defaults
- [ ] Environment variable overrides (`ICEFALL_PORT`, `ICEFALL_DATA_DIR`, etc.)
- [ ] Config validation on startup (check Docker socket exists, data dir writable, etc.)
- [ ] `icefall init` generates a default config file interactively

## Dependencies

- IF-001
