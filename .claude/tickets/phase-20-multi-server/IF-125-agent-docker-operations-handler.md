# IF-125: Agent Docker operations handler

**Phase:** 20B — Agent Core
**Priority:** Critical
**Estimate:** L

## Description

Implement the Docker operations handler in the agent that processes all container, image, volume, and network commands received from the control plane. The handler translates the control plane's `ContainerConfig` into bollard API calls against the local Docker socket and reports results back as Response messages. This is the core capability that allows the control plane to manage containers on remote servers.

## Acceptance Criteria

### Container Methods
- [ ] `container.create` — creates a container from a ContainerConfig
  - Maps ContainerConfig fields to `bollard::container::Config`
  - Sets image, env vars, ports, volumes, labels, restart policy, resource limits
  - Returns container ID on success
- [ ] `container.start` — starts a container by ID
- [ ] `container.stop` — stops a container by ID with configurable timeout (default 10s)
- [ ] `container.remove` — removes a container by ID (force optional)
- [ ] `container.list` — lists containers with optional filters (all, running, by label)
- [ ] `container.inspect` — returns full container details by ID
- [ ] `container.exec` — executes a command in a running container, returns stdout/stderr and exit code

### Image Methods
- [ ] `image.pull` — pulls an image by name:tag, streams progress events back to control plane
- [ ] `image.load` — loads an image from a tar stream (used for image transfers)
- [ ] `image.build` — builds an image from a Dockerfile context (tar stream), streams build output
- [ ] `image.list` — lists local images
- [ ] `image.remove` — removes an image by name or ID

### Volume Methods
- [ ] `volume.create` — creates a named volume with optional driver and options
- [ ] `volume.remove` — removes a volume by name
- [ ] `volume.list` — lists volumes with optional filters

### Network Methods
- [ ] `network.create` — creates a network with optional driver and options
- [ ] `network.remove` — removes a network by name or ID
- [ ] `network.list` — lists networks
- [ ] `network.connect` — connects a container to a network
- [ ] `network.disconnect` — disconnects a container from a network

### Error Handling
- [ ] All methods return structured errors: Docker daemon unreachable, image not found, container conflict, permission denied
- [ ] Errors include the original Docker API error message
- [ ] Response messages use the same request ID for correlation

### Handler Registration
- [ ] All `container.*`, `image.*`, `volume.*`, and `network.*` methods registered in the agent's message dispatcher
- [ ] Unknown methods within these namespaces return "method not found" error

## Technical Notes

- Use `bollard` crate connected to `/var/run/docker.sock` (Unix socket)
- `bollard::Docker::connect_with_local_defaults()` is the standard connection method
- For `image.pull` and `image.build`, stream progress via Event messages (not blocking the Response)
- ContainerConfig from `icefall-common` should map cleanly to `bollard::container::Config` — if fields diverge, add a conversion trait
- Resource limits (CPU, memory) use Docker's `HostConfig` — ensure the mapping covers `NanoCpus` and `Memory`

## Out of Scope

- Docker Compose support (single containers only)
- Docker Swarm integration
- Container health checks (covered separately in IF-128)
- Log streaming (covered separately in IF-126)

## Dependencies

- IF-121 (agent binary skeleton with message loop and bollard dependency)
