# IF-122: Agent enrollment flow

**Phase:** 20A — Multi-Server Foundation
**Priority:** Critical
**Estimate:** M

## Description

Implement the secure enrollment handshake between a new agent and the control plane. When a server is created in the dashboard, an enrollment token is generated. The install script passes this token to the agent, which exchanges it for a long-lived worker token. The enrollment token is single-use with a 15-minute TTL. During enrollment, the agent generates an X25519 keypair and sends its public key to the control plane for future encrypted communication.

## Acceptance Criteria

### Control Plane Enrollment Endpoint
- [ ] `POST /api/v1/agent/enroll` — validates enrollment token and returns worker credentials
- [ ] Request body: `{ enrollment_token, public_key }` (public key is base64-encoded X25519)
- [ ] Validates enrollment token against hashed tokens in the servers table
- [ ] Checks token is not expired (15-minute TTL from server creation or last token regeneration)
- [ ] Checks token has not already been used (single-use)
- [ ] On success: generates a worker token, hashes it, stores in server record, returns:
  ```json
  { "worker_token": "agt_...", "server_id": "..." }
  ```
- [ ] On failure: returns 401 with descriptive error (expired, already used, invalid)
- [ ] Stores the agent's public key in the server record

### Enrollment Token Lifecycle
- [ ] Enrollment token: 32 bytes, cryptographically random, base64url-encoded
- [ ] TTL: 15 minutes from generation
- [ ] Single-use: once exchanged, the enrollment token hash is cleared from the server record
- [ ] Regeneration via `POST /api/v1/servers/{id}/token` resets the TTL

### Worker Token
- [ ] Prefix: `agt_` followed by 32 bytes base64url-encoded
- [ ] SHA-256 hash stored in `servers.token_hash` (replaces enrollment token hash)
- [ ] Long-lived: no expiration (revoked by deleting or regenerating)
- [ ] Used for all subsequent WebSocket connections

### Agent-Side Enrollment
- [ ] On first start with an enrollment token in config: call `POST /api/v1/agent/enroll`
- [ ] Generate X25519 keypair using `x25519-dalek`
- [ ] Store private key in `/etc/icefall-agent/keys/private.key` (mode 0600)
- [ ] Send public key to control plane during enrollment
- [ ] On success: write worker token and server_id to config file, switch to worker token
- [ ] On failure: log error and exit (do not retry enrollment with a bad token)
- [ ] Subsequent starts: skip enrollment, connect directly with worker token

### Security
- [ ] Enrollment endpoint does not require admin auth (the token itself is the credential)
- [ ] Rate limit: max 10 enrollment attempts per IP per minute
- [ ] Enrollment tokens are not logged in plaintext (log only first 8 characters)

## Technical Notes

- The enrollment endpoint is separate from the WebSocket endpoint — it is a regular HTTP POST
- Worker token format `agt_` prefix makes tokens identifiable in logs and config files
- X25519 keypair is used later in IF-142 (secret envelope) for encrypting env vars
- The agent config file should be TOML; after enrollment, the agent rewrites its own config with the worker token
- Consider a `enrolled_at` timestamp on the server record for auditing

## Out of Scope

- Mutual TLS between agent and control plane (token auth is sufficient for v1)
- Token rotation for worker tokens (revoke + re-enroll is the recovery path)
- Multi-control-plane enrollment (agent connects to one control plane)

## Dependencies

- IF-118 (server CRUD — enrollment token generated during server creation)
- IF-121 (agent binary skeleton — enrollment runs on agent startup)
