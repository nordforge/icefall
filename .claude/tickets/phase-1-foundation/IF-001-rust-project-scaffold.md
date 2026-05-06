# IF-001: Rust project scaffold

**Phase:** 1 — Foundation
**Priority:** Critical
**Estimate:** S

## Description

Initialize the Rust workspace with Cargo. Set up the binary crate for the daemon/CLI dual-mode binary. Configure workspace dependencies for core crates (`tokio`, `axum`, `bollard`, `sqlx`, `serde`, `clap`).

## Acceptance Criteria

- [ ] `Cargo.toml` workspace at project root
- [ ] Binary crate `icefall` with `main.rs` that parses subcommands via `clap`
- [ ] Subcommand skeleton: `daemon start`, `daemon stop`, `init`, `deploy`, `apps`, `logs`, `env`, `domains`, `db`, `migrate`, `update`, `status`
- [ ] `cargo build` compiles successfully
- [ ] `cargo clippy` passes with no warnings
- [ ] Basic CI-ready structure (src/main.rs, src/lib.rs for shared logic)

## Dependencies

None — this is the first ticket.
