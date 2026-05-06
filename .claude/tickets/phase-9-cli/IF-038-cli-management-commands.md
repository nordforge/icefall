# IF-038: CLI management commands

**Phase:** 9 — CLI
**Priority:** High
**Estimate:** M

## Description

All non-deploy CLI commands for managing apps, env vars, databases, domains, logs, and server status.

## Acceptance Criteria

- [ ] App commands:
  - `icefall apps list` — table of apps (name, status, domain, last deploy)
  - `icefall apps info <app>` — detailed app info
  - `icefall apps stop <app>` — stop container
  - `icefall apps start <app>` — start container
  - `icefall apps restart <app>` — restart container
  - `icefall apps delete <app>` — delete app (with confirmation prompt)
- [ ] Env var commands:
  - `icefall env list <app>` — table of env vars (masked values)
  - `icefall env list <app> --reveal` — show actual values
  - `icefall env set <app> KEY=val [KEY2=val2 ...]` — set one or more vars
  - `icefall env unset <app> KEY [KEY2 ...]` — remove vars
  - `icefall env import <app> <file>` — import from .env file
- [ ] Domain commands:
  - `icefall domains list <app>` — list domains
  - `icefall domains add <app> <domain>` — add custom domain
  - `icefall domains remove <app> <domain>` — remove domain
  - `icefall domains verify <app> <domain>` — trigger DNS verification
- [ ] Database commands:
  - `icefall db list` — list databases
  - `icefall db create <type> [--name <name>] [--link <app>]` — provision
  - `icefall db info <db>` — details + connection string
  - `icefall db backup <db>` — trigger manual backup
  - `icefall db delete <db>` — delete (with confirmation)
- [ ] Log commands:
  - `icefall logs <app>` — stream logs (tail -f style)
  - `icefall logs <app> --search "term"` — search logs
  - `icefall logs <app> --lines 100` — last N lines
- [ ] Server commands:
  - `icefall status` — server overview (CPU, RAM, disk, app count, DB count)
- [ ] All commands use stored auth from `icefall login`
- [ ] Colored terminal output, table formatting
- [ ] JSON output option (`--json`) for scripting

## Dependencies

- IF-001, IF-035
