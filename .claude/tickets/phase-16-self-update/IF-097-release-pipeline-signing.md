# IF-097: Release pipeline & binary signing

**Phase:** 16 — Self-Update
**Priority:** Critical
**Estimate:** L

## Description

Build the CI/CD release pipeline that produces signed, multi-architecture Icefall binaries with dashboard assets. This is the foundation for every other update ticket — without signed artifacts, there is nothing to update to. The pipeline must produce static musl binaries for x86_64 and aarch64 Linux, bundle the pre-built Astro dashboard, compute checksums, sign a release manifest with Ed25519, and publish everything as a GitHub Release.

## Acceptance Criteria

### Ed25519 Signing Key Setup
- [ ] Generate an Ed25519 keypair for release signing (offline, by maintainer)
- [ ] Public key embedded in the Icefall binary at compile time:
  ```rust
  pub const TRUSTED_RELEASE_KEYS: &[TrustedKey] = &[...];
  ```
- [ ] Private key stored as `ICEFALL_RELEASE_SIGNING_KEY` GitHub Actions secret
- [ ] Public key published in `keys/release-signing.pub` in the repo
- [ ] Key structure supports future rotation (list of trusted keys with fingerprints, `not_before`/`not_after` fields)

### GitHub Actions Release Workflow
- [ ] Triggered on push of tags matching `v[0-9]+.[0-9]+.[0-9]+*`
- [ ] Validates that `Cargo.toml` version matches the tag (strip `v` prefix)
- [ ] Build matrix: `x86_64-unknown-linux-musl` + `aarch64-unknown-linux-musl`
- [ ] Uses `cross` for cross-compilation with musl (static linking, zero runtime deps)
- [ ] Builds dashboard: `bun install --frozen-lockfile && bun run build`
- [ ] Packages tarball per architecture:
  ```
  icefall-v{version}-{arch}-linux.tar.gz
  ├── icefall          (binary)
  └── dashboard/       (pre-built Astro assets)
  ```
- [ ] Computes SHA-256 checksum per tarball → `.sha256` file
- [ ] All GitHub Actions pinned to commit SHAs, not tags

### Release Manifest
- [ ] JSON manifest per release:
  ```json
  {
    "schema_version": 1,
    "version": "1.2.0",
    "release_date": "...",
    "min_supported_version": "1.0.0",
    "channel": "stable",
    "requires_migration": true,
    "breaking": false,
    "breaking_changes": null,
    "artifacts": {
      "x86_64-linux": { "url": "...", "sha256": "...", "size_bytes": ... },
      "aarch64-linux": { "url": "...", "sha256": "...", "size_bytes": ... }
    },
    "signed_by": "sha256:...",
    "signature_timestamp": "..."
  }
  ```
- [ ] Manifest signing: canonicalize JSON, sign with Ed25519, output `.sig` file (base64-encoded 64-byte signature)
- [ ] Signing script in `scripts/build-manifest.py` (or Rust tool in workspace)

### GitHub Release Creation
- [ ] Creates GitHub Release with auto-generated release notes
- [ ] Uploads all artifacts: tarballs, checksums, manifest, manifest signature
- [ ] Pre-release flag set for tags containing `-beta`, `-rc`, or `-nightly`

### Build Metadata
- [ ] `build.rs` embeds at compile time: version, target triple, git commit hash, build timestamp
- [ ] `SOURCE_DATE_EPOCH=0` set in CI for timestamp determinism
- [ ] `icefall --version` prints: `icefall 1.2.0 (abc1234 x86_64-unknown-linux-musl 2026-05-10)`

## Technical Notes

- Use `ed25519-dalek` for signing (CI script or Rust workspace binary)
- `cross` handles musl toolchains in Docker containers — no manual toolchain setup
- All Actions pinned to SHA for supply chain security: `actions/checkout@<sha>`, etc.
- `cargo-deny` or `cargo-audit` should run as part of CI (already in place — keep it)
- Manifest `schema_version` field allows protocol evolution without breaking old clients

## Out of Scope

- Reproducible builds (future — high effort, low impact at this scale)
- SLSA provenance generation (nice-to-have for v2)
- Update channels beyond stable (beta/nightly infrastructure deferred to IF-103)
- Signing the Git tag itself (GitHub's commit signing is separate)

## Dependencies

- None (foundational ticket — all other phase-16 tickets depend on this)
