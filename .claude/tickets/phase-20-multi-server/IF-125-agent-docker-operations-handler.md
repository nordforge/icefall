# IF-125: Agent Docker operations handler

**Phase:** 20B — Agent Core
**Priority:** Critical
**Estimate:** L

## Description

Implement the Docker operations handler in the agent that processes all container, image, volume, and network commands received from the control plane. The agent handles the **full build pipeline locally**: git clone, framework detection, Dockerfile generation, and `docker build` — no image transfer from the control plane. The handler translates the control plane's `ContainerConfig` into bollard API calls against the local Docker socket and reports results back as Response messages. This is the core capability that allows the control plane to manage containers on remote servers.

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

### Build Pipeline Methods
- [ ] `build.run` — full build pipeline on the agent:
  1. `git clone` the repository (URL + branch/commit provided by control plane)
  2. Framework detection via `icefall-common::build::detect` (reads project files, identifies framework)
  3. Dockerfile generation via `icefall-common::build::dockerfile` (generates optimized Dockerfile for detected framework)
  4. `docker build` from the generated Dockerfile, streams build output as Events
  5. Cleans up cloned repo after build completes
- [ ] Build output streamed line-by-line back to control plane as Event messages
- [ ] Build context (repo URL, branch, commit SHA, env vars, build args) provided by control plane in the build command

### Image Methods
- [ ] `image.pull` — pulls an image by name:tag, streams progress events back to control plane
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
- For `image.pull` and `build.run`, stream progress via Event messages (not blocking the Response)
- ContainerConfig from `icefall-common` should map cleanly to `bollard::container::Config` — if fields diverge, add a conversion trait
- Resource limits (CPU, memory) use Docker's `HostConfig` — ensure the mapping covers `NanoCpus` and `Memory`
- Build logic (`detect.rs`, `dockerfile.rs`) comes from `icefall-common` — the agent uses the same detection and generation code as the control plane
- Agent needs `git` available on the worker (installed by the setup script)
- `image.load` and `image.build` removed — the agent handles builds end-to-end via `build.run`, not via image transfer

## Out of Scope

- Docker Compose support (single containers only)
- Docker Swarm integration
- Container health checks (covered separately in IF-128)
- Log streaming (covered separately in IF-126)

## Dependencies

- IF-121 (agent binary skeleton with message loop and bollard dependency)
