# IF-011: Container deployment and lifecycle

**Phase:** 3 — Deployment Pipeline
**Priority:** Critical
**Estimate:** M

## Description

Deploy a built image as a running container with proper networking, resource limits, and restart policies. Handle zero-downtime deploys by starting the new container before stopping the old one.

## Acceptance Criteria

- [ ] Deploy module that takes a built image and creates/starts a container
- [ ] Container configuration:
  - Environment variables injected from app + environment scope
  - Port mapping (container port → random host port, Caddy handles external routing)
  - Resource limits (memory, CPU) from app settings or defaults
  - Restart policy (default: `unless-stopped`)
  - Labels for identification (`icefall.app`, `icefall.environment`, `icefall.deploy-id`)
- [ ] Per-project Docker network created if not exists
- [ ] Container connected to project network
- [ ] Zero-downtime deploy:
  1. Start new container
  2. Wait for health check to pass
  3. Update Caddy route to point to new container
  4. Stop and remove old container
- [ ] Rollback on failed health check: keep old container running, remove new one
- [ ] Deploy status tracking in database (pending → building → deploying → running / failed)
- [ ] Resource check before deploy: reject if insufficient server resources
- [ ] Container stop: graceful (SIGTERM + timeout, then SIGKILL)

## Dependencies

- IF-004, IF-005, IF-010, IF-002
