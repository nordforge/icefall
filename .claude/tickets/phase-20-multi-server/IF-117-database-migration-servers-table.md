# IF-117: Database migration — servers table and app server_id

**Phase:** 20A — Multi-Server Foundation
**Priority:** Critical
**Estimate:** M

## Description

Create the foundational database schema for multi-server support. This includes a new `servers` table to track worker nodes, a `server_metrics_history` table for time-series metrics, and foreign key columns on the existing `apps` and `deploys` tables linking them to a server. The migration auto-creates a control-plane server record and backfills all existing apps to point at it, ensuring zero disruption for single-server installations.

## Acceptance Criteria

### Servers Table
- [ ] New `servers` table with columns:
  - `id` (TEXT PRIMARY KEY, ULID)
  - `name` (TEXT NOT NULL)
  - `host` (TEXT NOT NULL — IP or hostname)
  - `role` (TEXT NOT NULL — 'control-plane' or 'worker')
  - `status` (TEXT NOT NULL — 'online', 'offline', 'enrolling', 'draining')
  - `token_hash` (TEXT — SHA-256 hash of worker token)
  - `agent_version` (TEXT)
  - `labels` (TEXT — JSON object for user-defined tags)
  - `resources` (TEXT — JSON object: CPU cores, RAM total, disk total)
  - `public_key` (TEXT — X25519 public key, base64)
  - `last_heartbeat_at` (TEXT)
  - `registered_at` (TEXT)
  - `created_at` (TEXT NOT NULL)
  - `updated_at` (TEXT NOT NULL)

### Server Metrics History Table
- [ ] New `server_metrics_history` table with columns:
  - `id` (TEXT PRIMARY KEY, ULID)
  - `server_id` (TEXT NOT NULL, FK → servers.id)
  - `cpu_percent` (REAL)
  - `ram_used_bytes` (INTEGER)
  - `ram_total_bytes` (INTEGER)
  - `disk_used_bytes` (INTEGER)
  - `disk_total_bytes` (INTEGER)
  - `load_average` (TEXT — JSON array of 1m/5m/15m)
  - `recorded_at` (TEXT NOT NULL)
- [ ] Index on `(server_id, recorded_at)` for time-range queries

### Schema Alterations
- [ ] `ALTER TABLE apps ADD COLUMN server_id TEXT REFERENCES servers(id)`
- [ ] `ALTER TABLE deploys ADD COLUMN server_id TEXT REFERENCES servers(id)`

### Auto-Seed on Migration
- [ ] Migration auto-creates a control-plane server record with role = 'control-plane', status = 'online'
- [ ] All existing apps have `server_id` set to the control-plane server's ID
- [ ] All existing deploys have `server_id` set to the control-plane server's ID

### Database Trait Methods
- [ ] `create_server(server: &Server) -> Result<Server>`
- [ ] `get_server(id: &str) -> Result<Option<Server>>`
- [ ] `get_server_by_token_hash(hash: &str) -> Result<Option<Server>>`
- [ ] `list_servers() -> Result<Vec<Server>>`
- [ ] `update_server(id: &str, update: &ServerUpdate) -> Result<Server>`
- [ ] `delete_server(id: &str) -> Result<()>`
- [ ] `update_server_heartbeat(id: &str) -> Result<()>`
- [ ] `update_server_status(id: &str, status: &str) -> Result<()>`

## Technical Notes

- Follow the existing migration pattern in `src/db/migrations/`
- Use ULID for server IDs (consistent with existing ID generation)
- `labels` and `resources` stored as JSON TEXT columns (SQLite does not have a native JSON type, but queries can use `json_extract`)
- The control-plane server record uses a well-known ID or a generated ULID — either way, store it in a constant for easy lookup
- `token_hash` is nullable because the control-plane server does not have an enrollment token

## Out of Scope

- Server grouping / clustering (future phase)
- Multi-region support or latency-aware placement
- Database replication between servers (SQLite stays on control plane only)

## Dependencies

- None (foundational ticket — many Phase 20 tickets depend on this)
