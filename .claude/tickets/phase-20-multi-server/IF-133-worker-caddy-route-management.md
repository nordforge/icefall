# IF-133: Worker Caddy route management during deploys

**Phase:** 20C — Deploy Pipeline
**Priority:** High
**Estimate:** M

## Description

Integrate Caddy route management into the remote deploy pipeline. When an app is deployed to a worker server, the control plane instructs the worker's agent to configure Caddy for domain-to-container routing. The worker's Caddy instance handles TLS via ACME. For wildcard base domains, the control plane's Caddy acts as a reverse proxy to the worker's IP.

## Acceptance Criteria

### Route Configuration on Deploy
- [ ] On successful deploy to a worker: control plane sends `caddy.add_route` to the agent
- [ ] Route maps the app's domain to `localhost:{container_port}` on the worker
- [ ] On redeploy (new container, new port): send `caddy.update_route` to update the upstream
- [ ] On app removal: send `caddy.remove_route` to clean up

### TLS on Worker
- [ ] Worker's Caddy handles ACME certificate provisioning for the app's domain
- [ ] Caddy automatically renews certificates
- [ ] DNS for the domain must point to the worker's IP (user responsibility, documented)

### Wildcard Base Domain Routing
- [ ] If the app uses a subdomain of the configured base domain (e.g., `app.example.com` under `*.example.com`):
  - Control plane's Caddy receives the wildcard traffic
  - Control plane's Caddy reverse-proxies to the worker's IP on the app's port
  - Worker's Caddy is not involved (traffic terminates at control plane Caddy, proxied to worker)
- [ ] Control plane adds a route entry: subdomain → `http://{worker_ip}:{container_port}`
- [ ] On worker disconnect: control plane Caddy route returns 502

### Custom Domain Routing
- [ ] If the app has a custom domain (not under base domain):
  - DNS points directly to the worker's IP
  - Worker's Caddy handles TLS and routing
  - Control plane Caddy is not involved

### Route Cleanup
- [ ] On app delete: remove routes from both worker Caddy and control plane Caddy (as applicable)
- [ ] On server removal: remove all control plane Caddy routes that proxy to that server
- [ ] On deploy rollback: restore the previous route configuration

## Technical Notes

- Two routing modes create different network paths — the control plane must track which mode each app uses
- Wildcard mode adds latency (extra hop through control plane) but simplifies DNS setup
- Custom domain mode is more performant but requires the user to manage DNS per app
- The app model may need a `routing_mode` field: 'wildcard' or 'direct'
- Control plane Caddy routes to workers should use the worker's public IP, not internal hostname

## Out of Scope

- DNS management or automation (user manages DNS records)
- Load balancing across multiple workers for the same app
- CDN integration
- HTTP/3 or QUIC configuration

## Dependencies

- IF-130 (agent Caddy management handler for receiving route commands)
- IF-131 (server-aware deploy manager triggers route configuration)
