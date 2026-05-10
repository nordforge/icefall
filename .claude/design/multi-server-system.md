# Icefall Multi-Server System — Technical Design

> Status: Confirmed
> Author: Nick Bevers
> Date: 2026-05-10
> Phase: 20
> Decisions confirmed: 2026-05-10

---

## 1. Overview

Icefall adds multi-server support to allow deploying apps across multiple servers from a single dashboard. The control plane runs on one server; lightweight agents run on worker servers. Workers connect outbound to the control plane via WebSocket — no inbound ports needed, works across cloud providers and through NAT/firewalls.

### Core Principles

1. **Single-server users notice nothing** — multi-server is invisible until a second server is added
2. **Workers are cattle** — stateless, replaceable, minimal footprint (~8MB binary, ~10MB RAM)
3. **Workers phone home** — all connections are outbound from worker to control plane
4. **One source of truth** — SQLite on the control plane stores all state
5. **Simple setup** — one `curl | sh` command to add a server

### What Coolify Gets Wrong

| Issue | Coolify | Icefall |
|-------|---------|---------|
| Communication | SSH to workers (flaky, no push) | WebSocket (persistent, bidirectional) |
| Worker setup | Full Coolify installation | 7MB static binary |
| Real-time feedback | None during builds | Streaming logs/metrics |
| Firewall requirements | Inbound SSH on workers | Zero inbound ports on workers |
| State sync | Can drift silently | Heartbeat-based reconciliation |

---

## 2. Architecture

```
                    ┌─────────────────────────────┐
                    │     Control Plane (Server A)  │
                    │                               │
                    │  ┌─────────┐  ┌───────────┐  │
                    │  │ Icefall │  │  SQLite    │  │
                    │  │ Binary  │  │  Database  │  │
                    │  └────┬────┘  └───────────┘  │
                    │       │                       │
                    │  ┌────┴────┐  ┌───────────┐  │
                    │  │ Axum    │  │  Docker    │  │
                    │  │ + WS    │  │  Engine    │  │
                    │  └────┬────┘  └───────────┘  │
                    │       │                       │
                    │  ┌────┴────┐                  │
                    │  │ Caddy   │                  │
                    │  └─────────┘                  │
                    └───────┬───────────────────────┘
                            │ wss:// (port 443)
              ┌─────────────┼─────────────┐
              │             │             │
    ┌─────────▼──┐  ┌──────▼─────┐  ┌────▼───────┐
    │  Worker B   │  │  Worker C   │  │  Worker D   │
    │             │  │             │  │             │
    │ icefall-    │  │ icefall-    │  │ icefall-    │
    │ agent       │  │ agent       │  │ agent       │
    │ (7MB)       │  │ (7MB)       │  │ (7MB)       │
    │             │  │             │  │             │
    │ Docker      │  │ Docker      │  │ Docker      │
    │ Caddy       │  │ Caddy       │  │ Caddy       │
    └─────────────┘  └─────────────┘  └─────────────┘
```

### Control Plane (existing Icefall binary)

Everything it does today, plus:
- **Agent WebSocket endpoint** at `/api/v1/agent/ws`
- **Agent registry** — in-memory map of connected workers
- **Server-aware deploy manager** — routes deploys to the correct server
- **Wildcard proxy** — proxies `*.apps.icefall.dev` traffic to correct worker
- **Aggregate metrics** — collect and display metrics from all servers
- **Orchestrator-only mode** — optional toggle to prevent app deployments to the CP itself

### Worker Node (new `icefall-agent` binary)

Minimal responsibilities:
- Maintain persistent WebSocket connection to control plane
- Execute Docker operations (create, start, stop, logs, stats, exec)
- Manage local Caddy routes
- Report metrics (CPU, RAM, disk, container states)
- Self-update when control plane pushes new version

**No database. No configuration beyond a single TOML file. No inbound ports.**

---

## 3. Worker Agent

### Binary Design

Single static musl binary, ~8MB stripped. Separate Cargo workspace member, NOT the full Icefall binary. **Includes build logic** (framework detection + Dockerfile generation) via the shared `icefall-common` crate, so workers build apps locally without needing the control plane to generate Dockerfiles.

**Key crates:**
- `tokio` (subset features) — async runtime
- `tokio-tungstenite` + `rustls` — WebSocket client
- `bollard` — Docker operations (same as control plane)
- `reqwest` (minimal) — Caddy admin API + health checks
- `sysinfo` — server metrics
- `serde` + `serde_json` + `toml` — serialization
- `ed25519-dalek` + `sha2` — binary verification

**Shared via `icefall-common`:** framework detection (`build/detect`), Dockerfile generation (`build/dockerfile`), protocol types.

**Not included:** axum, sqlx, lettre, clap, argon2, utoipa — no HTTP server, no database, no email, no auth hashing.

### Resource Footprint

| Metric | Value |
|--------|-------|
| Binary size | ~8 MB (stripped, LTO, musl, with build logic) |
| RAM idle | ~10 MB |
| RAM under load | ~30 MB |
| CPU idle | < 0.1% |
| Open FDs | 5-10 |

### Workspace Structure

```
icefall/
  Cargo.toml          (workspace root)
  src/                 (control plane binary)
  agent/
    Cargo.toml         (icefall-agent binary)
    src/
      main.rs
      config.rs
      connection.rs
      protocol.rs
      handlers/
        container.rs
        image.rs
        caddy.rs
        terminal.rs
        metrics.rs
  common/
    Cargo.toml         (shared types library)
    src/
      lib.rs
      protocol.rs      # AgentMessage, method names
      container.rs     # ContainerConfig, ContainerInfo
      stats.rs         # ContainerStats, ServerMetrics
```

---

## 4. Communication Protocol

### WebSocket + JSON-RPC

Agent connects outbound to `wss://control-plane.example.com/api/v1/agent/ws` with bearer token auth.

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
enum AgentMessage {
    // Control plane → Agent
    Request { id: String, method: String, params: Value },
    // Agent → Control plane
    Response { id: String, result: Option<Value>, error: Option<AgentError> },
    // Agent → Control plane (unsolicited)
    Event { event: String, data: Value },
    // Bidirectional
    Ping { timestamp: String },
    Pong { timestamp: String },
}
```

### Methods (Control Plane → Agent)

| Method | Description |
|--------|-------------|
| `container.create` | Create a container |
| `container.start` | Start a container |
| `container.stop` | Stop a container |
| `container.remove` | Remove a container |
| `container.list` | List containers |
| `container.exec` | Execute command |
| `container.logs.subscribe` | Start log streaming |
| `container.logs.unsubscribe` | Stop log streaming |
| `image.pull` | Pull from registry |
| `image.load` | Load from tar stream |
| `image.build` | Build from context |
| `volume.create/remove/list` | Volume management |
| `network.create/remove/connect` | Network management |
| `caddy.add_route` | Add Caddy route |
| `caddy.update_route` | Update Caddy route |
| `caddy.remove_route` | Remove Caddy route |
| `terminal.open/input/resize/close` | Terminal proxy |
| `health.check` | HTTP health probe |
| `system.info` | Agent version, capabilities |
| `system.update` | Apply agent update |

### Events (Agent → Control Plane)

| Event | Interval | Description |
|-------|----------|-------------|
| `heartbeat` | 15s | Server metrics summary |
| `metrics` | 10s | Detailed container + server metrics |
| `container.logs` | Streaming | Log lines for subscribed containers |
| `container.state_change` | On change | Container started/stopped/died |
| `terminal.output` | Streaming | TTY output bytes |

### Connection Management

- Agent reconnects with exponential backoff (1s → 300s max)
- Heartbeat every 15s
- **Offline threshold: 12 missed heartbeats (3 minutes)** — avoids false alarms from brief network blips
- Single multiplexed connection for all operations
- `id` field correlates requests with responses
- On reconnect: agent reports all container state changes that occurred during outage (Docker restart policy handles crashes autonomously; agent reconciles on reconnect)

---

## 5. Security

### Authentication

**Token-based over TLS. No mTLS.**

1. Admin generates a one-time enrollment token (15-minute TTL, single-use)
2. Worker agent sends token to `POST /api/v1/agent/enroll`
3. Control plane validates, returns a long-lived worker token (`agt_` prefix)
4. Worker stores token in `/etc/icefall-agent/config.toml` (chmod 600)
5. Token is SHA-256 hashed in the control plane database
6. Each worker has a unique token — compromise of one doesn't affect others

**Revocation:** Delete token hash from DB → next heartbeat fails → agent enters disconnected state within 15 seconds. Control plane also closes the WebSocket immediately.

### Transport

- All traffic over TLS (wss://)
- Control plane TLS via Caddy + Let's Encrypt (existing)
- Workers validate control plane certificate via system trust store
- No certificate pinning (Let's Encrypt rotates every 90 days)
- No custom CA needed

### Secret Envelope

When deploying, env vars are encrypted per-deploy:
1. Each worker generates an X25519 keypair on enrollment
2. Control plane encrypts env vars with per-deploy AES-256-GCM key
3. AES key is encrypted with worker's X25519 public key
4. Worker decrypts with its private key, passes env vars to Docker
5. Env vars are never written to disk on the worker

### Compromise Scenarios

| Scenario | Blast Radius | Response |
|----------|-------------|----------|
| Worker compromised | Containers + env vars on that worker only | Revoke token, redeploy apps elsewhere |
| Control plane compromised | Full access to everything | Harden with 2FA, SSH keys, OS-level security |
| Network intercepted | Nothing (TLS + secret envelope) | N/A |
| Rogue worker joins | Cannot without valid enrollment token (15-min TTL) | Token is single-use |
| Control plane offline | No new deploys; existing containers keep running | Workers auto-reconnect when CP returns |

---

## 6. Server Registration Flow

### Dashboard UX

1. User clicks "Add Server" → inline panel with name field
2. Clicks "Generate setup command" → one-liner with enrollment token
3. User runs command on worker via SSH
4. Dashboard shows real-time progress (agent connected → Docker check → registered)
5. Server appears in list within 30 seconds

### Setup Command

```bash
curl -fsSL https://icefall.example.com/install | sh -s -- --token agt_abc123
```

The script:
1. Detects architecture (x86_64/aarch64)
2. Downloads agent binary from control plane
3. Verifies SHA-256 checksum
4. Writes config to `/etc/icefall-agent/config.toml`
5. Creates systemd service
6. Starts agent → connects to control plane

### Install Script Security

- Binary downloaded over HTTPS from control plane
- SHA-256 verified before installation
- Config file chmod 600 (owner-read only)
- Systemd service hardened: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`

---

## 7. Deployment Across Servers

### Server Selection

**V1: Manual selection with visual capacity display.** The app creation wizard gains a "Server" step when 2+ servers exist. Each server card shows:
- Name, IP, status
- CPU, RAM, and disk usage bars
- Current app count
- **"Recommended" tag** on the server with the best composite score (CPU + RAM + Disk + app count)

The user always makes the final choice — no auto-placement. Default is the control plane server.

### Deploy Flow (Remote Worker — Build on Worker)

```
Control Plane                          Agent
     |                                   |
     |-- build command ----------------→|
     |   (repo URL, branch, config)     |
     |                                   |-- git clone
     |                                   |-- detect framework (shared code)
     |                                   |-- generate Dockerfile (shared code)
     |                                   |-- docker build
     |←-- build output (streamed) ------|
     |←-- build complete ---------------|
     |                                   |
     |-- container.create + start -----→|
     |←-- Response: container_id -------|
     |-- health.check -----------------→|
     |←-- Response: healthy ------------|
     |-- caddy.add_route --------------→|
     |←-- Response: ok ----------------|
     |-- container.stop (old) ---------→|  (if replacing)
```

The agent builds locally — no image transfer needed. Workers need outbound internet access for git clone and base image pulls.

### App Migration Between Servers

Blue-green across servers:
1. Build/pull image on target server
2. Start new container on target
3. Health check passes
4. Update Caddy on target server
5. Remove Caddy route on source server
6. Stop old container on source
7. Update `app.server_id` in database

---

## 8. Networking

### Caddy Per Server

Each server runs its own Caddy instance. When an app deploys to Worker B:
- Caddy on Worker B gets the route configuration
- DNS for the app's domain points to Worker B's IP
- Caddy handles TLS via ACME (Let's Encrypt)

### Custom Domains

DNS points directly to the server running the app. The dashboard shows: "Point app.example.com A record to {server_ip}."

### Wildcard Base Domain

For `*.apps.icefall.dev`: DNS wildcard points to the control plane. Control plane Caddy proxies to the correct worker based on subdomain → app → server mapping.

### Database Placement

**Databases co-locate with their linked app's server.** When an app on Worker B has a linked Postgres, the Postgres container runs on Worker B too. Connection is via `localhost` — fast, no cross-server traffic, no security concerns.

If an app migrates to another server, its linked database stays on the original server (manual move). The dashboard warns about this during migration.

### Cross-Server Communication

Apps on different servers communicate via public domains (standard HTTP). No built-in service mesh or overlay network in V1.

---

## 9. Database Changes

### New Tables

```sql
CREATE TABLE servers (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    host TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker',
    status TEXT NOT NULL DEFAULT 'pending',
    token_hash TEXT NOT NULL,
    agent_version TEXT,
    labels TEXT,         -- JSON
    resources TEXT,      -- JSON: last reported metrics
    public_key TEXT,     -- X25519 for secret envelope
    last_heartbeat_at TEXT,
    registered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE server_metrics_history (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(id),
    cpu_percent REAL,
    memory_used_bytes INTEGER,
    memory_total_bytes INTEGER,
    disk_used_bytes INTEGER,
    disk_total_bytes INTEGER,
    recorded_at TEXT NOT NULL
);
```

### Schema Changes

```sql
ALTER TABLE apps ADD COLUMN server_id TEXT REFERENCES servers(id);
ALTER TABLE deploys ADD COLUMN server_id TEXT REFERENCES servers(id);
```

### Migration Strategy

On upgrade, auto-create a "control-plane" server record and set all existing apps' `server_id` to it. Fully backward compatible.

---

## 10. Dashboard Changes

### Sidebar

- Single server: "Server" (singular), links to detail view
- Multiple servers: "Servers" (plural), links to list view

### Server List Page (`/servers`)

Card grid showing each server: name, IP, status dot, app count, CPU/RAM bars. "Add server" button.

### Server Detail Page (`/servers/{id}`)

Tabs: Overview | Apps | Metrics | Settings
- Overview: resource metrics, sparklines, connection info
- Apps: list of apps on this server
- Metrics: detailed CPU/RAM/disk graphs
- Settings: name, labels, danger zone (disconnect/force remove)

### App Changes

- AppCard: subtle server name label (hidden on single-server)
- AppHeader: "on {server}" link below app name
- App Settings: "Server placement" section with migration option
- App Create: server selection step (hidden on single-server)

### Dashboard Home

- ServerStats: aggregate metrics across all servers
- Health strip: inline server status indicators below metrics
- AppGrid: no grouping by server (apps are the primary mental model)

### New Statuses

- Server: `online`, `degraded`, `offline`, `connecting`
- App: `unreachable` (server offline), `migrating`

---

## 11. CLI Changes

### New Commands

```bash
icefall server list                    # List all servers
icefall server add --name worker-2     # Generate setup command
icefall server info <name>             # Show server details
icefall server remove <name>           # Disconnect server
icefall server remove <name> --force   # Force remove with apps
```

### Agent Binary

```bash
icefall-agent                          # Start agent (reads config)
icefall-agent --version                # Show version
```

---

## 12. Implementation Phases

### Phase 20A: Foundation (8 tickets)

Database migration, server CRUD, agent binary skeleton, WebSocket endpoint, enrollment flow.

### Phase 20B: Agent Core (6 tickets)

Docker operations via agent, log streaming, metrics forwarding, health checks, terminal proxy.

### Phase 20C: Deploy Pipeline (5 tickets)

Server-aware deploys, image transfer, Caddy routing on workers, app migration.

### Phase 20D: Dashboard UI (6 tickets)

Servers page, add server flow, app creation update, server indicators, aggregate metrics.

### Phase 20E: Polish & Security (5 tickets)

Secret envelope, agent auto-update, offline handling, audit logging, setup script hardening.

---

## 13. Confirmed Architectural Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Image builds | **Build on worker** | No image transfer (~100MB+ saved). Agent includes shared build logic. Workers need outbound internet. |
| 2 | Binary structure | **Separate Cargo workspace** | `icefall` (~15MB), `icefall-agent` (~8MB), `icefall-common` (shared). Keeps agent lean. |
| 3 | App placement | **Manual with visual capacity + "Recommended" tag** | Composite score: CPU + RAM + Disk + app count. User always confirms. No auto-select. |
| 4 | Wildcard DNS | **Control plane proxies** | `*.apps.icefall.dev` → CP → reverse proxy to correct worker. Custom domains go direct. |
| 5 | Offline threshold | **12 missed heartbeats (3 minutes)** | Avoids false alarms from brief blips. Then show "unreachable" + suggest migration. |
| 6 | Database placement | **Co-locate with linked app** | DB runs on same server as app. `localhost` connection = fast + secure. |
| 7 | Agent autonomy | **Docker restart + report on reconnect** | Docker `unless-stopped` handles crashes. Agent reports state changes on reconnect. No agent-level health loop. |
| 8 | Control plane role | **Both by default, optional orchestrator-only** | CP runs apps like today. Toggle in settings to prevent new deployments to CP. |
| 9 | Build logic in agent | **Included (shared crate)** | Agent has framework detection + Dockerfile generation. Self-contained builds. ~1MB extra. |
| 10 | Recommendation metric | **CPU + RAM + Disk + app count** | Simple composite score for the "Recommended" tag. No historical analysis in V1. |

---

## 14. What We Don't Build (V1)

| Feature | Rationale |
|---------|-----------|
| mTLS | Operational complexity doesn't match audience |
| WireGuard mesh | Wrong abstraction layer |
| Automatic server selection | Manual is sufficient for 2-5 servers |
| App replicas across servers | Requires load balancer, shared state |
| Built-in service mesh | Users can add Tailscale/WireGuard themselves |
| Container image signing | Trust boundary is the control plane |
| Per-worker RBAC | All workers are trusted equally |
| Volume backup from workers | Future enhancement |
| Automatic app placement | Manual with recommendations is sufficient for 2-5 servers |
| Cross-server database links | Databases co-locate with their app |
| Agent-level health loop | Docker restart policy is sufficient; agent reports on reconnect |
| Auto-failover on server offline | Show unreachable + suggest migration (user-initiated) |
| Image transfer from CP to worker | Workers build locally (shared build logic in agent) |
