# IF-132: Image transfer to workers

**Phase:** 20C — Deploy Pipeline
**Priority:** High
**Estimate:** L

## Description

Implement the mechanism for getting Docker images to worker servers. The primary strategy builds the image on the control plane, exports it, transfers it over the WebSocket connection, and loads it on the worker. An alternative strategy sends a build command to the agent with the repository URL so the worker builds locally. Both strategies include integrity verification and progress reporting.

## Acceptance Criteria

### Strategy A: Build on Control Plane, Transfer to Worker (Default)
- [ ] Control plane builds the Docker image locally (existing build pipeline)
- [ ] `docker save` exports the image as a tar stream
- [ ] Tar stream is gzip-compressed before transfer
- [ ] Compressed image sent to agent via `image.load` command
- [ ] Agent runs `docker load` to import the image
- [ ] SHA-256 hash of the compressed tar verified on the agent side

### Strategy B: Remote Build on Worker (Alternative)
- [ ] Control plane sends `image.build` command to agent with:
  - Git repository URL + branch/commit
  - Dockerfile path
  - Build args
- [ ] Agent clones the repo (or receives the build context) and builds locally
- [ ] Build output streamed back to control plane as Events

### Progress Reporting
- [ ] Transfer progress reported as Events: bytes sent / total bytes
- [ ] Control plane relays progress to EventBus for dashboard display
- [ ] Deploy status shows "transferring" with percentage during transfer
- [ ] Build progress (for remote builds) streamed line-by-line

### Integrity Verification
- [ ] SHA-256 hash computed on control plane before transfer
- [ ] Hash sent alongside the image data
- [ ] Agent verifies hash after receiving the complete image
- [ ] Hash mismatch: abort deploy, report error

### Strategy Selection
- [ ] Default: Strategy A (control plane build + transfer)
- [ ] App-level config: `build_on_worker: bool` flag (future, defaults to false)
- [ ] Automatic fallback: if transfer fails, retry once

### Chunked Transfer
- [ ] Large images split into chunks for WebSocket transmission
- [ ] Chunk size: 256 KB per WebSocket message
- [ ] Agent reassembles chunks and writes to a temporary file before `docker load`
- [ ] Temporary files cleaned up after successful load

## Technical Notes

- `docker save` via bollard: `bollard::image::CreateImageOptions` and the export API
- Gzip compression: use `flate2` crate for streaming compression
- For WebSocket transfer: binary frames are more efficient than base64-encoded JSON
- Consider a separate binary channel or multiplexing to avoid blocking the JSON control channel
- Image sizes can be large (500 MB+) — the chunked approach prevents memory issues
- Strategy B requires the worker to have git and network access to the repository

## Out of Scope

- Container registry push/pull (not using a registry for now)
- Image layer deduplication (transfer full images, not individual layers)
- P2P image distribution between workers
- Image caching policies on workers

## Dependencies

- IF-125 (agent Docker operations handler for `image.load` and `image.build`)
- IF-131 (server-aware deploy manager triggers the transfer)
