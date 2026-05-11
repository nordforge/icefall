# IF-118: Server CRUD API endpoints

**Phase:** 20A — Multi-Server Foundation
**Priority:** Critical
**Estimate:** M

## Description

Expose RESTful API endpoints for managing servers in the Icefall control plane. These endpoints allow admins to register new servers, list and inspect existing ones, update metadata, remove servers, and regenerate enrollment tokens. All endpoints are admin-only. The setup endpoint serves the install script that workers use during enrollment.

## Acceptance Criteria

### Create Server
- [ ] `POST /api/v1/servers` — creates a server record and generates an enrollment token
- [ ] Request body: `{ name, host }` (labels optional)
- [ ] Response includes the server record and a plaintext enrollment token (shown once)
- [ ] Enrollment token is cryptographically random, 32 bytes, base64url-encoded
- [ ] Token hash (SHA-256) stored in the server record; plaintext is not persisted

### List Servers
- [ ] `GET /api/v1/servers` — returns all servers with status and resource info
- [ ] Response includes: id, name, host, role, status, agent_version, labels, resources, app count, last_heartbeat_at

### Get Server
- [ ] `GET /api/v1/servers/{id}` — returns full server details
- [ ] Includes everything from list plus registered_at and timestamps

### Update Server
- [ ] `PUT /api/v1/servers/{id}` — updates name, host, labels
- [ ] Cannot change role or status through this endpoint
- [ ] Returns the updated server record

### Delete Server
- [ ] `DELETE /api/v1/servers/{id}` — disconnects and removes a worker server
- [ ] If apps are still assigned: returns 409 Conflict unless `?force=true` query param is set
- [ ] Force remove: reassigns apps to control-plane server, then deletes
- [ ] Cannot delete the control-plane server (returns 403)

### Regenerate Token
- [ ] `POST /api/v1/servers/{id}/token` — regenerates the enrollment token
- [ ] Invalidates the previous token
- [ ] Returns the new plaintext token (shown once)

### Setup Script
- [ ] `GET /api/v1/servers/setup` — serves the install shell script
- [ ] Content-Type: `text/x-shellscript`
- [ ] Script content generated from a template with the control plane URL baked in

### Auth & Permissions
- [ ] All endpoints require admin role
- [ ] Non-admin users receive 403 Forbidden

## Technical Notes

- Follow the existing API route pattern in `src/api/routes/`
- Add a new `servers.rs` route module, register in `mod.rs`
- Enrollment token generation: use `rand::thread_rng().gen::<[u8; 32]>()` + base64url encoding
- Setup script endpoint does not require authentication (the token inside the script provides auth)
- Use the standard Icefall API response envelope: `{ data, error, meta }`

## Out of Scope

- Server health check endpoint (covered by WebSocket heartbeat in IF-119)
- Server metrics API (covered in IF-127)
- Bulk operations (add/remove multiple servers at once)

## Dependencies

- IF-117 (servers table and database trait methods)
