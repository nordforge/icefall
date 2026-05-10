# Icefall Self-Update System — Technical Design

> Status: Draft
> Author: Nick Bevers
> Date: 2026-05-10
> Tickets: IF-097 through IF-104 (Phase 16)

---

## 1. Overview

Icefall's self-update system replaces the running binary and dashboard assets with a newer version, handles database migrations, and restarts the daemon — all without stopping user containers, breaking user sessions, or requiring manual intervention beyond a single click.

**Core principle:** Icefall is a control plane, not a data plane. User containers run via Docker and are completely independent of the Icefall process. The update replaces exactly one binary (plus dashboard assets), restarts one systemd service, and life goes on.

### What Makes This Different From Coolify

| Aspect | Coolify | Icefall |
|--------|---------|---------|
| Update mechanism | Docker image pull + container restart | Binary swap + systemd restart |
| Progress visibility | "Step 1 of 4" — vague, no detail | 7 named steps with real-time progress |
| User containers | Can be disrupted | Never touched |
| Sessions | May be lost | Always preserved (SQLite) |
| Rollback | Manual, often broken | Automatic on failure |
| Integrity verification | Trust Docker Hub TLS only | SHA-256 + Ed25519 signature chain |
| Dashboard during update | Dead until container rebuilds | ~10 second gap with reconnection overlay |

---

## 2. Architecture

### Update Flow (Happy Path)

```
Discovery          Download          Apply              Restart
─────────          ────────          ─────              ───────
Check GitHub   →   Stream tarball →  Backup binary   →  systemd restart
Releases API       to disk           Backup database     (socket activation
                                     Run migrations      holds connections)
Verify manifest →  Verify SHA-256    Atomic rename    →  Health check
signature          against manifest  of new binary       Delete marker
                                                         Clean up
```

### Component Breakdown

```
src/update/
├── mod.rs              # Module root, UpdateManager struct
├── discovery.rs        # GitHub API check, manifest parsing, version comparison
├── download.rs         # Streaming download with progress, SHA-256 verification
├── verify.rs           # Ed25519 signature verification, trusted key management
├── apply.rs            # Backup, migration, binary swap, restart trigger
├── rollback.rs         # Automatic + manual rollback logic
├── scheduler.rs        # Auto-update maintenance window scheduling
├── manifest.rs         # Manifest JSON types and parsing
└── keys.rs             # Embedded public keys for signature verification

dashboard/src/islands/update/
├── UpdatePill/         # Sidebar notification
├── UpdateDialog/       # Modal with step progress
├── UpdateStep/         # Individual step row component
├── UpdateSettings/     # Settings page section
└── ReconnectOverlay/   # Full-viewport reconnection overlay

dashboard/src/stores/
└── update.ts           # Nanostores: $updateInfo, $updateStatus
```

---

## 3. Update Discovery

### Source: GitHub Releases API

Single source of truth. No custom update server — unnecessary operational overhead for a self-hosted project.

```
GET https://api.github.com/repos/{owner}/icefall/releases/latest
```

### Check Frequency

- **Background check**: every 6 hours
- **On dashboard load**: if last check > 1 hour ago, trigger refresh
- **Manual**: "Check for updates" button

### Channel Model

| Channel | GitHub Release Property | Example Tag |
|---------|------------------------|-------------|
| Stable | `prerelease: false` | `v1.4.0` |
| Beta | `prerelease: true`, tag `-beta`/`-rc` | `v1.5.0-beta.2` |

### Version Comparison

Strict semver via `semver` crate. Current version embedded at compile time:

```rust
const VERSION: &str = env!("CARGO_PKG_VERSION");
```

**Monotonicity enforcement:** The client tracks `highest_seen_version` in SQLite. Once a version is seen, the client never accepts an equal or lower version. Updated after manifest verification, before download.

---

## 4. Secure Distribution

### Release Artifacts

```
icefall-v{version}-x86_64-linux.tar.gz
icefall-v{version}-x86_64-linux.tar.gz.sha256
icefall-v{version}-aarch64-linux.tar.gz
icefall-v{version}-aarch64-linux.tar.gz.sha256
icefall-v{version}-manifest.json
icefall-v{version}-manifest.json.sig
```

### Verification Chain (Two Layers)

```
Embedded Ed25519    →  Verifies manifest  →  Manifest contains  →  Verifies
public key             signature              SHA-256 hashes        downloaded
(compile-time)                                                      tarball
```

1. **Ed25519 signature** on the manifest proves the Icefall project signed this release
2. **SHA-256 hash** in the verified manifest proves the tarball is what was signed

This two-layer approach means a single signing operation protects all artifacts.

### Key Management

```
Private key: GitHub Actions secret (ICEFALL_RELEASE_SIGNING_KEY)
Public key:  Embedded in binary at compile time + published in repo
```

**Rotation support:** The binary embeds a list of trusted keys (not just one). To rotate: add new key to the list, release with old key, switch CI to new key.

```rust
pub const TRUSTED_RELEASE_KEYS: &[TrustedKey] = &[
    TrustedKey {
        id: "icefall-release-2026",
        fingerprint: "sha256:...",
        public_key_b64: "MCowBQYDK2VwAyEA...",
        not_before: "2026-01-01T00:00:00Z",
        not_after: None,
    },
];
```

---

## 5. Binary Replacement Strategy

### Why Not Docker-Based Updates?

Coolify updates by pulling a Docker image. This couples updates to Docker availability — if Docker is wedged, you can't update the tool that manages Docker. A binary swap is independent of Docker.

### The Swap Sequence

Every step is idempotent and crash-safe.

```
1. BACKUP     cp icefall → icefall.rollback
              SQLite online backup → icefall-{ts}-pre-update.db
              cp dashboard/dist → dashboard/dist.bak

2. MARKER     Write /var/lib/icefall/updates/pending_update (JSON)

3. MIGRATE    Run new SQLite migrations in a single transaction
              busy_timeout(30s) for concurrent write locks
              If fails → transaction rolls back → abort

4. SWAP       Copy new binary next to target (same filesystem)
              chmod 755
              Atomic rename() over current binary

5. RESTART    spawn("systemctl restart icefall") — non-blocking
              Graceful shutdown: drain requests, close DB pool

6. VERIFY     New binary reads pending_update marker
              Self-test: DB, Docker, user containers still running
              sd_notify(READY) on success
              Delete marker → update complete
```

### systemd Socket Activation (Zero-Downtime)

systemd holds the listening socket. During restart, incoming connections queue at the kernel level — no 502 errors, no dropped connections. The gap is invisible to users.

```ini
# icefall.socket
[Socket]
ListenStream=0.0.0.0:8443
FileDescriptorStoreMax=1

# icefall.service
[Service]
Type=notify
Requires=icefall.socket
WatchdogSec=60
TimeoutStopSec=30
Restart=on-failure
ExecStopPost=-/var/lib/icefall/updates/icefall.rollback rollback --check
```

### Graceful Shutdown

On SIGTERM:
1. Stop accepting new connections (systemd queues via socket)
2. Cancel SSE streams via `CancellationToken`
3. Wait up to 10s for in-flight requests
4. Close DB connection pool
5. Exit

---

## 6. Database Migrations

### Hard Rule: Migrations Must Be Additive

Between version N and N+1, migrations can:
- Add new tables
- Add new columns with default values
- Add new indexes
- Insert new seed data

Migrations CANNOT:
- Drop/rename columns
- Change column types
- Drop tables

This ensures version N's code works against version N+1's schema (critical for rollback).

### Execution

```rust
let tx = conn.transaction()?;
for migration in pending_migrations {
    tx.execute_batch(&migration.sql)?;
    tx.execute(
        "INSERT INTO _migrations (version, name, checksum) VALUES (?1, ?2, ?3)",
        params![migration.version, migration.name, migration.checksum],
    )?;
}
tx.commit()?;
```

Single transaction. If any migration fails, everything rolls back. The old binary runs against the unchanged schema.

---

## 7. Rollback

### Automatic (Crash Detection)

`ExecStopPost` in the systemd unit calls the PREVIOUS binary's `rollback --check`:

1. Read `pending_update` marker
2. If marker exists and < 5 minutes old → the new binary crashed → trigger rollback
3. Rollback: restore binary, restore DB backup, restart

### systemd Watchdog

- `WatchdogSec=60`: daemon pings every 30s
- `StartLimitBurst=3`: after 3 crashes in 5 minutes, give up
- Each failed start triggers `ExecStopPost` → rollback check

### Manual

```bash
icefall update rollback
```

Or via dashboard: "Rollback to v{previous}" button (visible for 24 hours post-update).

---

## 8. Auto-Update

**Off by default.** Explicit opt-in.

### Behavior

1. Discovery finds new version → pre-download immediately (during normal hours)
2. 30 minutes before maintenance window → notification to all configured channels
3. During window: check no active deploys → apply update
4. If deploy running: wait, retry every 30s until window closes
5. If window closes: skip, try next window

### Breaking Changes

If manifest has `breaking: true`: auto-update is SKIPPED. Admin must manually review and apply.

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_update_enabled` | `false` | Master toggle |
| `auto_update_channel` | `stable` | Which releases to track |
| `auto_update_window_start` | `03:00` | Local time |
| `auto_update_window_end` | `05:00` | Local time |
| `auto_update_notify_before_minutes` | `30` | Advance notice |

---

## 9. Dashboard UX

### Notification: Sidebar Update Pill

A compact pill in the sidebar footer (bottom-left): `↑ v0.4.0 available`
- Tabler `IconArrowUp`, primary color, subtle background
- Only visible to admin users
- Not dismissable — stays until applied or superseded
- Clicking opens the update dialog

### Update Dialog: 7-Step Progress

```
┌─────────────────────────────────────────┐
│  Updating to v0.4.0                     │
│─────────────────────────────────────────│
│  ✓  Checking compatibility       0.8s   │
│  ✓  Creating backup              4.2s   │
│  ●  Downloading update           62%    │
│  ○  Verifying integrity                 │
│  ○  Applying database migrations        │
│  ○  Restarting Icefall                  │
│  ○  Verifying health                    │
└─────────────────────────────────────────┘
```

Download step has a determinate progress bar. All others are indeterminate spinners.

### Reconnection Overlay

During the restart step, SSE drops. The dashboard shows "Reconnecting to Icefall..." with a three-dot animation. Polls `/api/v1/server/status` every 2 seconds. On reconnection, verifies the new version, fades out the overlay, shows success toast.

### Settings > Updates

- Current version + manual check button
- Update channel (Stable/Beta)
- Auto-update toggle + maintenance window picker
- Update history table

---

## 10. CLI Update

```bash
icefall update              # Interactive check + apply
icefall update --check      # Check only (exit code 0=current, 1=available)
icefall update --yes        # Skip confirmation
icefall update rollback     # Roll back to previous version
icefall update --from-file  # Offline update from local tarball
```

Progress display mirrors dashboard: 7 steps with terminal spinners, progress bar for download, green checkmarks for completion.

---

## 11. Offline / Air-Gapped Updates

```bash
# On a machine with internet
curl -LO .../icefall-v1.2.0-x86_64-linux.tar.gz
curl -LO .../icefall-v1.2.0-manifest.json
curl -LO .../icefall-v1.2.0-manifest.json.sig

# Transfer to air-gapped server
scp icefall-v1.2.0-* server:/tmp/

# On the server
icefall update --from-file /tmp/icefall-v1.2.0-x86_64-linux.tar.gz \
               --manifest /tmp/icefall-v1.2.0-manifest.json \
               --signature /tmp/icefall-v1.2.0-manifest.json.sig
```

Full verification chain still applies. Only the download source changes.

---

## 12. Rust Dependencies

| Component | Crate | Already in Cargo.toml? |
|-----------|-------|------------------------|
| HTTP client | `reqwest` (rustls, stream) | Yes |
| Version parsing | `semver` | No — add |
| SHA-256 | `sha2` | Yes |
| Ed25519 | `ed25519-dalek` | No — add |
| Tar extraction | `flate2` + `tar` | No — add |
| systemd notify | `sd-notify` | No — add (behind feature flag) |
| Socket activation | `listenfd` | No — add |
| SQLite backup | `rusqlite` (backup feature) | Partial — verify feature |
| Embedded assets | `rust-embed` | No — evaluate (vs current ServeDir) |
| CLI progress | `indicatif` | No — add |
| CLI prompts | `dialoguer` | No — add |

---

## 13. API Endpoints Summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/system/update/check` | Trigger check, return availability |
| `GET` | `/api/v1/system/update/status` | Current operation state |
| `POST` | `/api/v1/system/update/download` | Start downloading |
| `POST` | `/api/v1/system/update/apply` | Begin update process |
| `POST` | `/api/v1/system/update/rollback` | Roll back to previous version |
| `POST` | `/api/v1/system/update/skip` | Skip a specific version |
| `GET` | `/api/v1/system/update/preferences` | Get update settings |
| `PATCH` | `/api/v1/system/update/preferences` | Update settings |
| `GET` | `/api/v1/system/update/history` | Past update attempts |

All endpoints require `admin` role.

---

## 14. SSE Events

| Event | When |
|-------|------|
| `system.update.available` | New version detected |
| `system.update.step` | Each step transition during update |
| `system.update.download_progress` | Download percentage updates |
| `system.update.complete` | Update successful |
| `system.update.failed` | Update failed |
| `system.update.scheduled` | Auto-update notification (30min before window) |

Admin connections only.

---

## 15. Failure Mode Matrix

| Failure | Detection | Recovery | User Impact |
|---------|-----------|----------|-------------|
| Network during download | HTTP error / timeout | Delete partial, retry | None |
| Disk full | `ENOSPC` on write | Abort, report space needed | None |
| SHA-256 mismatch | Hash comparison | Delete download, alert | None |
| Signature invalid | Ed25519 verify fails | Reject, log warning | None |
| Migration fails | Transaction error | Rollback transaction | None |
| New binary won't start | systemd restart fails 3x | Auto-rollback via ExecStopPost | ~30s downtime |
| New binary crashes after minutes | Watchdog timeout | systemd restart → rollback check | Brief restart |
| Power loss during swap | `rename()` is atomic | Either old or new binary on disk | systemd restarts whichever is there |
| Power loss during dashboard swap | Directory half-replaced | `.bak` directory available for manual recovery | Dashboard may be broken; binary OK |

---

## 16. Ticket Dependency Graph

```
IF-097 (Release Pipeline)
  ├── IF-098 (Discovery)
  │     ├── IF-099 (Download)
  │     │     └── IF-100 (Apply)
  │     │           ├── IF-101 (Rollback)
  │     │           ├── IF-102 (Dashboard UI)
  │     │           └── IF-103 (Auto-Update)
  │     └── IF-102 (Dashboard UI)
  └── IF-104 (CLI)
        ├── IF-098 (Discovery)
        ├── IF-099 (Download)
        ├── IF-100 (Apply)
        └── IF-101 (Rollback)
```

### Recommended Implementation Order

1. **IF-097** — Release pipeline (foundation, everything depends on it)
2. **IF-098** — Update discovery (can test against real GitHub releases)
3. **IF-099** — Download & verify (needs releases to download)
4. **IF-100** — Apply & restart (the core swap mechanism)
5. **IF-101** — Rollback (safety net before shipping to users)
6. **IF-102** — Dashboard UI (can develop in parallel with 100/101)
7. **IF-104** — CLI command (can develop in parallel with 102)
8. **IF-103** — Auto-update scheduling (last — needs everything else working)

---

## 17. Security Considerations

1. **Supply chain**: Ed25519 signature is the trust root. Compromised GitHub ≠ compromised users (need the signing key).
2. **Downgrade attacks**: Version monotonicity enforcement. Client rejects `version <= highest_seen`.
3. **MITM**: Signature verification is the real protection (not just TLS). No certificate pinning — fragile for third-party hosts.
4. **Config preservation**: Updates NEVER overwrite `config.toml`. Only the binary and dashboard assets are replaced.
5. **Permissions**: All update endpoints require admin role. Non-admin users cannot trigger or see updates.
6. **Active deploys**: Update checks for running deploys and blocks/waits to avoid disrupting user workloads.

---

## 18. What We Explicitly Do NOT Build

| Feature | Rationale |
|---------|-----------|
| Custom CDN | GitHub Releases is sufficient |
| Certificate pinning | More outages than attacks prevented |
| Differential updates | Binary is small; full download is fast |
| Reproducible builds | High effort, low impact at this scale |
| Telemetry | Self-hosted users chose privacy |
| Multi-instance coordination | Single-instance only for v1 |
| Auto-downgrade | Dangerous; CLI rollback is the escape hatch |
| SLSA provenance | Nice-to-have for v2 |
