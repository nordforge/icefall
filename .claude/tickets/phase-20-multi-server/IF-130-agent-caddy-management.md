# IF-130: Agent Caddy management

**Phase:** 20B — Agent Core
**Priority:** High
**Estimate:** M

## Description

The agent manages the local Caddy reverse proxy on the worker server. It handles route manipulation commands from the control plane — adding, updating, and removing routes — by calling the Caddy admin API on localhost. This allows the control plane to configure TLS termination and reverse proxy routing on remote servers as part of the deploy pipeline.

## Acceptance Criteria

### Caddy Route Handlers
- [ ] `caddy.add_route` — adds a new route to Caddy's configuration
  - Parameters: route JSON (same format as control plane's CaddyClient)
  - Calls Caddy admin API: `POST http://localhost:2019/config/apps/http/servers/srv0/routes`
  - Returns success/failure with Caddy's response
- [ ] `caddy.update_route` — updates an existing route by ID
  - Parameters: route_id, route JSON
  - Calls Caddy admin API with the appropriate PATCH/PUT endpoint
  - Returns success/failure
- [ ] `caddy.remove_route` — removes a route by ID
  - Parameters: route_id
  - Calls Caddy admin API: `DELETE` on the route path
  - Returns success/failure
- [ ] `caddy.list_routes` — lists all configured routes
  - Calls Caddy admin API: `GET http://localhost:2019/config/apps/http/servers/srv0/routes`
  - Returns the route list

### Route Format Compatibility
- [ ] Uses the same CaddyRoute JSON structure from `icefall-common`
- [ ] Domain-based matching: route matches on `Host` header
- [ ] Upstream: reverse proxy to `localhost:{container_port}`
- [ ] TLS: Caddy handles ACME certificate provisioning automatically

### File Server Routes
- [ ] Support for static file serving routes (native static deploys)
- [ ] Route config includes `file_server` directive with root path
- [ ] Used when deploying static sites to worker servers

### Error Handling
- [ ] Caddy not running: return clear error "Caddy admin API unreachable"
- [ ] Invalid route config: return Caddy's error message
- [ ] Route not found (on update/remove): return appropriate error
- [ ] Timeout: 5-second timeout on all Caddy API calls

### Caddy Health
- [ ] Agent checks Caddy reachability on startup
- [ ] Logs warning if Caddy is not running (does not prevent agent from starting)

## Technical Notes

- Use `reqwest::Client` to call the Caddy admin API at `http://localhost:2019`
- Caddy's admin API is JSON-based and well-documented at https://caddyserver.com/docs/api
- The route ID can be a `@id` matcher or positional — use `@id` for reliable updates/deletes
- Caddy automatically handles ACME (Let's Encrypt) for any domain in a route — no extra config needed
- The `CaddyRoute` type in `icefall-common` should be the single source of truth for route structure

## Out of Scope

- Caddy installation or upgrades (covered by the install script in IF-123)
- Custom Caddy modules or plugins
- Load balancing across multiple upstream containers
- Caddy metrics collection (Caddy's built-in Prometheus endpoint can be used separately)

## Dependencies

- IF-121 (agent binary skeleton with reqwest dependency and message handlers)
