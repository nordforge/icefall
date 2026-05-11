# IF-132: Agent build pipeline

**Phase:** 20C — Deploy Pipeline
**Priority:** High
**Estimate:** L

## Description

Implement the build pipeline on the agent. **Images are built on the worker, not transferred from the control plane.** When a deploy is triggered, the control plane sends a `build.run` command to the agent with the repository URL, branch, and configuration. The agent clones the repository, uses `icefall-common` build logic to detect the framework and generate a Dockerfile, then runs `docker build` locally. Build output is streamed back to the control plane as Event messages for real-time dashboard updates.

## Acceptance Criteria

### Build Command
- [ ] Agent receives `build.run` command from control plane containing:
  - Git repository URL
  - Branch or commit SHA
  - Environment variables for the build
  - Build args (optional overrides)
  - App configuration (name, resource limits)
- [ ] Command validated before execution (URL format, required fields)

### Git Clone
- [ ] Agent clones the repository to a temporary build directory
- [ ] Supports branch, tag, or specific commit SHA checkout
- [ ] Shallow clone (`--depth 1`) by default for speed
- [ ] Clone progress reported as Event messages
- [ ] Authentication: supports deploy keys or token-based auth (credentials provided in the build command)

### Framework Detection
- [ ] Uses `icefall-common::build::detect` to analyze the cloned project
- [ ] Detects framework type, version, package manager, build commands
- [ ] Detection result included in the build Event stream (so dashboard can display what was detected)
- [ ] If detection fails: returns error with guidance ("unsupported project type" or "no Dockerfile found")

### Dockerfile Generation
- [ ] Uses `icefall-common::build::dockerfile` to generate an optimized Dockerfile
- [ ] Multi-stage builds for supported frameworks
- [ ] Respects existing Dockerfile if present in the repo (skip generation, use as-is)
- [ ] Generated Dockerfile logged in build output for transparency

### Docker Build
- [ ] Runs `docker build` using bollard against the cloned repo directory
- [ ] Build output streamed line-by-line back to control plane as Event messages
- [ ] Image tagged with app name and deploy ID
- [ ] Build cache utilized across deploys (Docker layer caching)
- [ ] Resource limits applied during build (memory limit, no-cache option)

### Progress Reporting
- [ ] Build progress streamed as Events: cloning → detecting → generating → building → complete
- [ ] Control plane relays progress to EventBus for dashboard display
- [ ] Each phase reports start/end timestamps
- [ ] Build logs stored in the deploy record (same as local builds)

### Cleanup
- [ ] Cloned repo directory removed after build completes (success or failure)
- [ ] Old images pruned based on retention policy (keep last N images per app)
- [ ] Temporary files cleaned up on build failure

### Error Handling
- [ ] Git clone failure: report error with git output
- [ ] Detection failure: report unsupported project type
- [ ] Build failure: report docker build output with error context
- [ ] Disk space check before build: fail early if insufficient space
- [ ] Each error includes the phase where it occurred for debugging

## Technical Notes

- Build logic (`detect.rs`, `dockerfile.rs`) comes from `icefall-common` crate — same code the control plane uses for local builds
- Agent needs `git` installed on the worker (ensured by the setup script, IF-123)
- Build directory: `/tmp/icefall-builds/{deploy_id}/` — cleaned up after each build
- Docker build context is the cloned repo directory (not a tar stream)
- `bollard::image::BuildImageOptions` with `dockerfile` pointing to the generated or existing Dockerfile
- Consider limiting concurrent builds per worker (default: 1, configurable)
- No image transfer, no `docker save`/`docker load`, no chunked binary transfer over WebSocket

## Out of Scope

- Container registry push/pull (not using a registry)
- Image transfer from control plane to worker (builds happen locally)
- P2P image distribution between workers
- Custom buildpacks or Nix-based builds
- Building on the control plane and shipping to worker

## Dependencies

- IF-120 (icefall-common crate with `build/detect.rs` and `build/dockerfile.rs`)
- IF-125 (agent Docker operations handler for `docker build` execution)
- IF-131 (server-aware deploy manager sends the `build.run` command)
