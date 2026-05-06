# IF-004: Docker Engine client

**Phase:** 1 — Foundation
**Priority:** Critical
**Estimate:** M

## Description

Implement the Docker Engine API client using the `bollard` crate. This is the core abstraction for all container operations — no Docker CLI usage anywhere.

## Acceptance Criteria

- [ ] Docker client module wrapping `bollard`
- [ ] Connection to Docker Engine via Unix socket (`/var/run/docker.sock`)
- [ ] Core operations:
  - Pull image by name/tag
  - Build image from Dockerfile (with build context tar)
  - Create container with config (env vars, ports, volumes, resource limits, restart policy)
  - Start / stop / restart / remove container
  - List containers (with filtering by label)
  - Inspect container (get status, IP, ports)
  - Stream container logs (stdout/stderr)
  - Get container stats (CPU, memory, network)
- [ ] Network operations:
  - Create Docker network (per-project)
  - Connect/disconnect container to network
  - Remove network
- [ ] Volume operations:
  - Create named volume
  - Remove volume
  - List volumes
- [ ] Resource limit enforcement (memory, CPU) via container create config
- [ ] All operations return typed results, not raw JSON
- [ ] Error types map Docker API errors to user-friendly messages
- [ ] Integration tests against a real Docker daemon

## Dependencies

- IF-001
