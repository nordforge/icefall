# IF-134: App migration between servers

**Phase:** 20C — Deploy Pipeline
**Priority:** Medium
**Estimate:** L

## Description

Allow moving an app from one server to another with minimal downtime using a blue-green strategy across servers. The migration builds the app on the target server, starts it, verifies health, updates routing, and then stops the app on the source server. Environment variables are transferred securely. Volumes are explicitly not migrated (the user is warned and must handle data migration manually).

## Acceptance Criteria

### Migration API
- [ ] `PUT /api/v1/apps/{id}/migrate` — initiates a migration
- [ ] Request body: `{ target_server_id }`
- [ ] Validates: target server exists, is connected, is not the current server
- [ ] Returns 202 Accepted with a deploy record (type: "migration")
- [ ] Admin-only endpoint

### Blue-Green Migration Sequence
- [ ] Build/transfer image to target server
- [ ] Create and start container on target server with same config (env, ports, volumes config)
- [ ] Run health check on target server
- [ ] If healthy: update Caddy routes (remove from source, add on target)
- [ ] Update app record: set `server_id` to target server
- [ ] Stop and remove container on source server
- [ ] If health check fails: stop container on target, keep source running, mark migration as failed

### Environment Variable Transfer
- [ ] Env vars transferred using the secret envelope mechanism (IF-142)
- [ ] If IF-142 is not yet implemented: transfer env vars in plaintext over the encrypted WebSocket
- [ ] Env vars are never written to disk on either server during migration

### Volume Handling
- [ ] Migration does not transfer Docker volumes
- [ ] API response includes a warning: `"warnings": ["Volumes are not migrated. Data in volumes on the source server will not be available on the target."]`
- [ ] If the app has volumes: require `"acknowledge_volume_loss": true` in the request body
- [ ] Without acknowledgment: return 400 with explanation

### Deploy Record
- [ ] New deploy type: `"migration"`
- [ ] Deploy record includes: source_server_id, target_server_id
- [ ] Status progression: pending → building → transferring → starting → health_check → routing → migrated → (or failed)
- [ ] Dashboard shows migration deploys with a distinct label

### Rollback on Failure
- [ ] Any step failure after the source is still running: clean up target, keep source
- [ ] If source was already stopped: attempt to restart on source (best effort)
- [ ] Migration failure does not leave the app in a broken state

## Technical Notes

- Migration is essentially a deploy to a new server + cleanup on the old server
- Reuse the DeployManager's remote deploy logic from IF-131 as much as possible
- The `server_id` on the app record should only be updated after the health check passes on the target
- Consider a lock on the app during migration to prevent concurrent deploys
- The migration deploy record should reference both the source and target server for audit purposes

## Out of Scope

- Automatic volume data migration (rsync, storage snapshots, etc.)
- Live migration (zero-downtime with state transfer)
- Batch migration of multiple apps at once
- Automatic migration triggers (e.g., server overloaded → migrate)

## Dependencies

- IF-131 (server-aware deploy manager for remote deploy execution)
- IF-132 (image transfer for getting the image to the target server)
- IF-133 (Caddy route management for updating routing during migration)
