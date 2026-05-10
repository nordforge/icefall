# IF-120: Cargo workspace setup — icefall-common crate

**Phase:** 20A — Multi-Server Foundation
**Priority:** Critical
**Estimate:** M

## Description

Restructure the project into a Cargo workspace with three members: `icefall` (the control plane binary), `icefall-agent` (the worker agent binary), and `icefall-common` (shared library). Extract types and protocol definitions that both binaries need into `icefall-common` to avoid duplication and ensure wire-format consistency. The existing control plane code must compile and function identically after this restructure.

## Acceptance Criteria

### Workspace Structure
- [ ] Root `Cargo.toml` converted to a workspace with members:
  ```
  [workspace]
  members = ["icefall", "agent", "common"]
  ```
- [ ] `icefall/` — control plane binary (existing code moved here)
- [ ] `agent/` — agent binary (skeleton, fleshed out in IF-121)
- [ ] `common/` — shared library crate (`icefall-common`)

### Shared Types in icefall-common
- [ ] `AgentMessage` protocol types: `Request`, `Response`, `Event` enums with serde serialization
- [ ] `ContainerConfig` — Docker container configuration struct
- [ ] `ServerMetrics` — CPU, RAM, disk, load average
- [ ] `CaddyRoute` — route configuration for Caddy API
- [ ] `ServerStatus` enum — online, offline, enrolling, draining
- [ ] `DeployStatus` enum (if not already shared)
- [ ] Version constants and build metadata types

### Build Logic in icefall-common
- [ ] `build/detect.rs` — framework detection logic (reads project files, identifies framework type, version, build commands)
- [ ] `build/dockerfile.rs` — Dockerfile generation from detected framework (templates per framework, multi-stage builds)
- [ ] Both modules shared between control plane and agent so build behavior is identical regardless of where the build runs

### Dependency Setup
- [ ] Both `icefall` and `icefall-agent` depend on `icefall-common`
- [ ] Shared dependencies (serde, serde_json, chrono, etc.) specified in `[workspace.dependencies]` with versions pinned once
- [ ] Each member crate inherits shared dependencies via `workspace = true`

### Build Integrity
- [ ] `cargo build` from workspace root builds all members
- [ ] `cargo test` from workspace root runs all tests
- [ ] Existing control plane binary compiles with zero functional changes
- [ ] All existing tests pass
- [ ] `cargo clippy` and `cargo fmt --check` pass

### CI Updates
- [ ] GitHub Actions workflow updated to build the full workspace
- [ ] CI builds both `icefall` and `icefall-agent` binaries
- [ ] Test step runs workspace-wide tests

## Technical Notes

- Move existing `src/` into `icefall/src/` — keep the same module structure
- The root `Cargo.toml` becomes a workspace manifest, not a package
- Use `[workspace.dependencies]` (Cargo 1.64+) to centralize dependency versions
- The `icefall-common` crate should be `#![no_std]`-compatible where possible (but `std` is fine for now)
- Keep the binary name as `icefall` (set `[[bin]] name = "icefall"` in `icefall/Cargo.toml`)

## Out of Scope

- Moving the dashboard into the workspace (it remains a separate Astro project)
- Splitting the control plane into further sub-crates (e.g., `icefall-api`, `icefall-db`)
- Publishing any crate to crates.io

## Dependencies

- None (structural change that does not depend on database or API changes)
