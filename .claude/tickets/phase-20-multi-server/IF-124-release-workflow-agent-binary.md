# IF-124: Release workflow — build agent binary

**Phase:** 20A — Multi-Server Foundation
**Priority:** High
**Estimate:** M

## Description

Extend the existing GitHub Actions release workflow (established in IF-097) to also build and publish the `icefall-agent` binary. Both binaries are built for x86_64 and aarch64 Linux musl targets, included in release artifacts, and signed with the same Ed25519 key. The release manifest is updated to include agent binary metadata.

## Acceptance Criteria

### Build Matrix Extension
- [ ] Release workflow builds `icefall-agent` in addition to `icefall`
- [ ] Both binaries built for: `x86_64-unknown-linux-musl` and `aarch64-unknown-linux-musl`
- [ ] Uses the same `cross` toolchain setup as the control plane binary
- [ ] Agent binary uses release profile: `lto = true`, `codegen-units = 1`, `strip = true`

### Release Artifacts
- [ ] Agent binary tarballs:
  ```
  icefall-agent-v{version}-x86_64-linux.tar.gz
  icefall-agent-v{version}-aarch64-linux.tar.gz
  ```
- [ ] SHA-256 checksum file per agent tarball (`.sha256`)
- [ ] Both agent tarballs uploaded to the GitHub Release alongside control plane tarballs

### Release Manifest Update
- [ ] Manifest includes agent artifacts section:
  ```json
  {
    "agent_artifacts": {
      "x86_64-linux": { "url": "...", "sha256": "...", "size_bytes": ... },
      "aarch64-linux": { "url": "...", "sha256": "...", "size_bytes": ... }
    }
  }
  ```
- [ ] Manifest signature covers agent artifacts (re-signed after adding)

### Binary Signing
- [ ] Agent binary signed with the same Ed25519 key as the control plane binary
- [ ] Signature file included in release artifacts: `icefall-agent-v{version}-{arch}-linux.tar.gz.sig`

### Build Metadata
- [ ] Agent `build.rs` embeds: version, target triple, git commit hash, build timestamp
- [ ] `icefall-agent --version` prints: `icefall-agent 1.2.0 (abc1234 x86_64-unknown-linux-musl 2026-05-10)`

## Technical Notes

- The workspace build means `cross` builds both binaries in one pass (or two targeted builds)
- Consider caching the workspace build artifacts between the two binary builds
- Agent binary should be significantly smaller than the control plane binary (no dashboard assets)
- Verify agent binary size is under 8 MB stripped — if not, audit dependencies

## Out of Scope

- Separate release cadence for agent vs. control plane (they share a version for now)
- Agent-only releases (both binaries are always released together)
- Container images for the agent (binary-only distribution)

## Dependencies

- IF-120 (Cargo workspace must exist to build both binaries)
- IF-121 (agent binary crate must exist)
