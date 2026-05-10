# IF-135: Server selection in app creation

**Phase:** 20C — Deploy Pipeline
**Priority:** Medium
**Estimate:** S

## Description

Add server selection to the app creation flow. When creating an app, an optional `server_id` field specifies which server the app should be deployed to. If omitted, the app defaults to the control-plane server. The target server must exist and be connected. This is the backend counterpart to the dashboard UI in IF-139.

## Acceptance Criteria

### API Changes
- [ ] `POST /api/v1/apps` accepts an optional `server_id` field in the request body
- [ ] If `server_id` is omitted or null: defaults to the control-plane server ID
- [ ] If `server_id` is provided: validates that the server exists
- [ ] If the server exists but is offline: returns 400 with "Server is not connected"
- [ ] If the server does not exist: returns 404

### App Model
- [ ] `server_id` column on apps table (added in IF-117) used during creation
- [ ] App response includes `server_id` and `server_name` fields
- [ ] `GET /api/v1/apps` response includes server info for each app

### Backward Compatibility
- [ ] Existing API clients that do not send `server_id` continue to work (defaults to control plane)
- [ ] Single-server installations: field is accepted but always resolves to the control-plane server
- [ ] App list and detail endpoints include server info regardless of how many servers exist

### Validation
- [ ] Cannot assign an app to a server with role 'draining'
- [ ] Server must have status 'online' at creation time

### Server Recommendation Scoring
- [ ] Compute a composite recommendation score for each online server based on:
  - CPU usage (lower is better)
  - RAM usage (lower is better)
  - Disk usage (lower is better)
  - App count (fewer is better)
- [ ] Score returned in the server list response for each server
- [ ] Server with the best score marked as `recommended: true` in the API response
- [ ] Score is advisory only — user always makes the final selection (no auto-placement)

## Technical Notes

- The `server_id` default logic: query the servers table for the record with role = 'control-plane'
- Consider caching the control-plane server ID at startup (it never changes)
- The app creation response should include the resolved server_id even when it was not explicitly provided
- No changes to the deploy pipeline — the deploy manager reads server_id from the app record
- Recommendation score: weighted composite of `(1 - cpu%) * w1 + (1 - ram%) * w2 + (1 - disk%) * w3 + (1 / (app_count + 1)) * w4` — weights TBD but start equal
- Metrics for scoring come from IF-127 agent metrics collection

## Out of Scope

- Automatic server selection / auto-placement (user always confirms)
- Changing server_id after creation through the update endpoint (use migration in IF-134)
- Server affinity rules or constraints

## Dependencies

- IF-117 (servers table and server_id column on apps)
- IF-118 (server CRUD for validation)
