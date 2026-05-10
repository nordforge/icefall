# IF-104: CLI update command

**Phase:** 16 — Self-Update
**Priority:** Medium
**Estimate:** M

## Description

Implement the `icefall update` CLI command for server-side update management. This is the primary update path for headless servers and the escape hatch when the dashboard is unreachable. Includes version checking, interactive update with progress, offline update from local files, and rollback.

## Acceptance Criteria

### `icefall update` (Interactive Update)
- [ ] Check for available updates (calls the same discovery logic as the API)
- [ ] Display pre-update summary:
  ```
  Icefall v0.3.2 → v0.4.0

  What's new:
    • Zero-downtime deploys for container apps
    • PostgreSQL 17 support
    • Fix: memory leak in SSE connections

  Continue? [Y/n]
  ```
- [ ] If breaking changes present, show warning:
  ```
  ⚠ Breaking changes:
    Caddy config format updated. Your existing
    Caddyfile will be migrated automatically.
  ```
- [ ] Seven progress steps with terminal UI:
  ```
  ✓ Checking compatibility              0.3s
  ✓ Creating backup                     4.1s
  ● Downloading update                  [████████████░░░░░░░░] 62%
  ○ Verifying integrity
  ○ Applying database migrations
  ○ Restarting Icefall
  ○ Verifying health
  ```
  - Completed: green `✓` (ANSI color) + elapsed duration
  - Running: animated braille spinner + detail (download shows progress bar)
  - Pending: `○`
  - Failed: red `✗` + error message
- [ ] Download progress bar: 20 chars wide, Unicode block characters
- [ ] Final summary:
  ```
  Updated to v0.4.0 in 18.3s
  ```

### Subcommands & Flags
- [ ] `icefall update` — interactive check + update
- [ ] `icefall update --check` — check only, do not apply
  - Exit code 0: up to date
  - Exit code 1: update available
  - Prints: `Update available: v0.4.0 (current: v0.3.2)` or `Icefall is up to date (v0.3.2)`
- [ ] `icefall update --yes` — skip confirmation prompt (for scripting/cron)
- [ ] `icefall update --channel beta` — override configured channel for this update
- [ ] `icefall update rollback` — roll back to previous version
  - Shows confirmation: "Roll back from v{current} to v{previous}?"
  - `--yes` flag to skip confirmation
  - Executes rollback procedure from IF-101
- [ ] `icefall update --json` — output as JSON for machine consumption

### Offline Update
- [ ] `icefall update --from-file /path/to/icefall-v1.2.0-x86_64-linux.tar.gz`
  - Requires `--manifest /path/to/manifest.json` and `--signature /path/to/manifest.json.sig`
  - Skips download step
  - Still verifies manifest signature against embedded keys
  - Still verifies tarball hash against manifest
  - Still enforces version monotonicity
  - Same swap-and-verify procedure as online update
- [ ] Clear error messages for missing/invalid files

### Restart Handling
- [ ] After "Restarting Icefall" step, the CLI process detects it is about to be killed (systemd)
- [ ] The CLI update command should be separate from the daemon process:
  - If run while daemon is active: communicates via API (sends requests to localhost)
  - If run while daemon is stopped: operates directly on filesystem (emergency mode)
- [ ] After daemon restarts, CLI verifies by polling health endpoint
- [ ] Timeout: if daemon does not come up within 60 seconds, suggest `icefall update rollback`

### Error Handling
- [ ] Network errors: clear message with retry suggestion
- [ ] Permission errors: suggest running as root or fixing permissions
- [ ] Disk space: show required vs available
- [ ] Active deploy: "Cannot update while a deploy is in progress. Wait or cancel the deploy first."
- [ ] All errors include actionable next steps

### Update of IF-039 (CLI Self-Update Stub)
- [ ] Replace the existing stub in `src/cli/` with the full implementation
- [ ] IF-039 marked as superseded by IF-104

## Technical Notes

- Use `indicatif` crate for progress bars and spinners in the terminal
- Use `dialoguer` crate for confirmation prompts
- ANSI colors via `console` crate (already common in Rust CLIs)
- When communicating via API: the CLI is a client to the local Icefall daemon's HTTP API
- When operating directly: the CLI performs the same operations as the daemon's update module
- The `--json` flag outputs structured JSON for each step, suitable for piping to `jq`

## Out of Scope

- GUI/TUI interactive mode (a simple line-by-line progress display is sufficient)
- Remote server update via CLI (update applies to the local server only)
- Batch update of multiple servers

## Dependencies

- IF-097 (release pipeline — binary layout and signing)
- IF-098 (update discovery — version checking logic)
- IF-099 (download & verify — download pipeline)
- IF-100 (update apply — the actual update execution)
- IF-101 (rollback — for the rollback subcommand)
