# IF-145: Audit logging for server operations

**Phase:** 20E — Polish & Security
**Priority:** Medium
**Estimate:** S

## Description

Add an audit log table that records significant server-related operations for security and compliance. Every enrollment, disconnection, removal, deploy dispatch, and secret access is logged with the actor, action, and details. Logs are retained for a configurable period (default 90 days) and viewable in the server detail page.

## Acceptance Criteria

### Audit Log Table
- [ ] New `audit_log` table:
  - `id` (TEXT PRIMARY KEY, ULID)
  - `server_id` (TEXT, FK → servers.id, nullable for system-wide events)
  - `user_id` (TEXT, FK → users.id, nullable for system-initiated events)
  - `action` (TEXT NOT NULL)
  - `details` (TEXT — JSON object with action-specific data)
  - `ip_address` (TEXT — source IP of the request)
  - `created_at` (TEXT NOT NULL)

### Logged Actions
- [ ] `server.enrolled` — agent successfully enrolled, details: { server_name, agent_version }
- [ ] `server.disconnected` — agent lost connection, details: { reason, last_heartbeat }
- [ ] `server.removed` — server deleted, details: { removed_by, force, app_count }
- [ ] `deploy.dispatched` — deploy sent to a remote server, details: { app_id, app_name, deploy_id, server_id }
- [ ] `secret.accessed` — encrypted env vars sent to a worker, details: { app_id, server_id, key_count }

### Database Trait Methods
- [ ] `create_audit_log(entry: &AuditLogEntry) -> Result<()>`
- [ ] `list_audit_logs(server_id: Option<&str>, limit: u32, offset: u32) -> Result<Vec<AuditLogEntry>>`
- [ ] `prune_audit_logs(older_than: DateTime) -> Result<u64>` — returns count of deleted rows

### Retention
- [ ] Default retention: 90 days
- [ ] Configurable via settings
- [ ] Background task prunes expired logs daily
- [ ] Pruning logged as a system event: `audit.pruned` with count

### API Endpoint
- [ ] `GET /api/v1/servers/{id}/audit-log` — returns audit logs for a server
- [ ] Query params: `limit` (default 50), `offset`, `action` (filter by action type)
- [ ] Admin-only endpoint
- [ ] `GET /api/v1/audit-log` — returns all audit logs (admin-only, server-wide view)

### Dashboard
- [ ] Server detail page: audit log section in the Settings or Overview tab
- [ ] Table with columns: timestamp, action, user, details
- [ ] Expandable rows to show full details JSON
- [ ] Pagination for long histories

## Technical Notes

- Audit logging should be non-blocking — use a channel/queue so the main request path is not slowed
- The `details` field is a JSON TEXT column for flexibility (different actions have different data)
- Index on `(server_id, created_at)` for efficient filtered queries
- Consider a helper macro or function: `audit!(action, server_id, user_id, details)` to reduce boilerplate
- Pruning can run as a tokio task on a daily interval

## Out of Scope

- Audit log export (CSV, JSON download)
- Real-time audit log streaming
- Audit log for non-server operations (app CRUD, user management — separate feature)
- Tamper-proof or append-only log storage

## Dependencies

- IF-117 (servers table — audit logs reference server_id)
