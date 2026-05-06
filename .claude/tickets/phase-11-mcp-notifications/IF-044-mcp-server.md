# IF-044: MCP server for AI agent integration

**Phase:** 11 — MCP & Notifications
**Priority:** Medium
**Estimate:** M

## Description

Built-in MCP (Model Context Protocol) server that wraps the REST API, enabling AI agents to deploy, monitor, and manage apps.

## Acceptance Criteria

- [ ] MCP server integrated into the daemon (no separate process)
- [ ] Transport: stdio (for local agents) and SSE (for remote agents)
- [ ] Authentication: API token passed as config to the MCP client
- [ ] Tools exposed:
  - `list_apps` — list all apps with status
  - `get_app` — detailed app info
  - `deploy_app` — trigger deploy for an app
  - `get_deploy_status` — current deploy status and recent history
  - `get_logs` — retrieve recent logs (with search)
  - `set_env_var` — set environment variable
  - `get_env_vars` — list env vars for an app
  - `create_database` — provision a managed database
  - `list_databases` — list databases
  - `get_health_status` — health check status for an app
  - `get_server_status` — server resource overview
  - `add_domain` — add custom domain to app
  - `restart_app` — restart an app's container
- [ ] Tool permissions scoped by API token role (viewer can only use read tools)
- [ ] MCP tool descriptions include parameter schemas and examples
- [ ] Configuration example for Claude Code (`settings.json` MCP server entry)
- [ ] Configuration example for other MCP clients
- [ ] Error responses in MCP format with actionable messages

## Dependencies

- IF-006, IF-035
