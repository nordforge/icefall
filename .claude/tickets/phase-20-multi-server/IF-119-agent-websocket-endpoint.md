# IF-119: Agent WebSocket endpoint on control plane

**Phase:** 20A — Multi-Server Foundation
**Priority:** Critical
**Estimate:** L

## Description

Implement a WebSocket endpoint on the control plane that agents connect to for bidirectional communication. This is the primary channel for dispatching commands to workers and receiving events back. The endpoint handles token-based authentication, maintains an in-memory registry of connected agents, tracks heartbeats to detect offline servers, and routes messages between the control plane's subsystems and the correct agent.

## Acceptance Criteria

### WebSocket Endpoint
- [ ] `GET /api/v1/agent/ws` — upgrades to WebSocket connection
- [ ] Uses `Authorization: Bearer <worker_token>` header for authentication
- [ ] Validates token hash against `servers.token_hash` in the database
- [ ] Rejects connections with invalid or expired tokens (HTTP 401 before upgrade)
- [ ] Sets server status to 'online' on successful connection

### Agent Registry
- [ ] In-memory `HashMap<ServerId, AgentConnection>` behind `Arc<RwLock<>>`
- [ ] `AgentConnection` contains: server_id, sender handle (for sending messages), connected_at, last_heartbeat
- [ ] `register(server_id, connection)` — adds or replaces connection
- [ ] `unregister(server_id)` — removes connection
- [ ] `get(server_id) -> Option<AgentConnection>` — lookup for dispatching
- [ ] `list_connected() -> Vec<ServerId>` — for status queries
- [ ] `send_to(server_id, message) -> Result<()>` — sends a message to a specific agent

### Heartbeat Tracking
- [ ] Expects WebSocket Ping from agent every 15 seconds
- [ ] Responds with Pong automatically (tokio-tungstenite handles this)
- [ ] Background task checks all connections every 15 seconds
- [ ] If no Ping received for 45 seconds: mark server as 'offline', emit SSE event
- [ ] If Ping resumes: mark server as 'online', emit SSE event

### Message Protocol
- [ ] Messages are JSON-encoded with a type discriminator:
  - `Request`: { id, method, params } — control plane → agent
  - `Response`: { id, result, error } — agent → control plane (correlated by id)
  - `Event`: { type, data } — agent → control plane (fire-and-forget)
- [ ] Request IDs are ULIDs for uniqueness and ordering
- [ ] Pending request map: track in-flight requests with oneshot channels for response delivery

### SSE Events
- [ ] `server.connected` — emitted when an agent connects, payload: { server_id, name }
- [ ] `server.disconnected` — emitted when an agent disconnects or times out, payload: { server_id, name, reason }

### Graceful Handling
- [ ] On agent disconnect: clean up registry, update server status, cancel pending requests
- [ ] On control plane shutdown: send close frame to all agents before exit
- [ ] Concurrent connections from same server_id: close the old connection, keep the new one

## Technical Notes

- Use `axum::extract::ws::WebSocket` (or `tokio-tungstenite` depending on the existing web framework)
- The pending request map should use `tokio::sync::oneshot` channels so callers can `await` agent responses
- Consider a timeout (30s default) on pending requests to avoid leaked futures
- The agent registry should be injectable via Axum state (same pattern as existing AppState)
- Message serialization: `serde_json` with `#[serde(tag = "type")]` enum for the protocol

## Out of Scope

- Load balancing across multiple control planes (single control plane assumed)
- Message persistence or replay (if the agent is offline, the message is dropped)
- Binary WebSocket frames (JSON text frames only for now)

## Dependencies

- IF-117 (servers table for token validation and status updates)
- IF-118 (server CRUD — servers must exist before agents can connect)
