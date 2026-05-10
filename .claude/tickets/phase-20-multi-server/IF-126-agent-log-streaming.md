# IF-126: Agent log streaming

**Phase:** 20B — Agent Core
**Priority:** High
**Estimate:** M

## Description

Implement log streaming from containers running on worker servers. The agent attaches to Docker container log streams and forwards log lines to the control plane as Event messages over the WebSocket connection. Logs are batched for efficiency and buffered locally to handle brief disconnections. The control plane receives these logs and writes them to the LogStore, making them available to the dashboard in real time.

## Acceptance Criteria

### Agent Log Handlers
- [ ] `container.logs.subscribe` — starts streaming logs for a container
  - Parameters: container_id, since (optional timestamp), tail (optional line count)
  - Attaches to Docker container stdout and stderr streams
  - Returns acknowledgment immediately; logs flow as Events
- [ ] `container.logs.unsubscribe` — stops streaming logs for a container
  - Detaches from the Docker log stream
  - Cleans up the streaming task

### Log Event Format
- [ ] Event type: `container.log`
- [ ] Event data:
  ```json
  {
    "container_id": "...",
    "lines": [
      { "timestamp": "...", "stream": "stdout|stderr", "message": "..." }
    ]
  }
  ```
- [ ] Each line includes the original Docker timestamp

### Batching
- [ ] Batch up to 50 log lines per Event message
- [ ] Flush batch after 100ms if fewer than 50 lines accumulated
- [ ] Whichever threshold is hit first triggers the send

### Local Buffer
- [ ] Buffer the last 1000 lines per container in a ring buffer
- [ ] On reconnect: agent can send buffered lines to fill the gap
- [ ] Buffer is in-memory only (not persisted to disk)

### Control Plane Log Ingestion
- [ ] Control plane receives `container.log` events from agents
- [ ] Writes received logs to LogStore keyed by `(server_id, app_id)`
- [ ] Existing dashboard log streaming (SSE) works for remote containers
- [ ] LogStore API unchanged — dashboard code does not need modifications

### Resource Management
- [ ] Maximum 20 concurrent log subscriptions per agent
- [ ] If limit exceeded: return error on new subscribe requests
- [ ] On container stop/remove: automatically unsubscribe and clean up
- [ ] On agent disconnect: all subscriptions are dropped (control plane re-subscribes on reconnect)

## Technical Notes

- Use `bollard::container::LogsOptions` with `follow: true` for real-time streaming
- The Docker log stream returns `bollard::container::LogOutput` with stdout/stderr discrimination
- Batching can use `tokio::time::interval` combined with a channel buffer
- The ring buffer can use `VecDeque` with a capacity cap
- On the control plane side, the existing LogStore likely needs a server_id dimension added to its key

## Out of Scope

- Persistent log storage on the agent (logs are ephemeral beyond the 1000-line buffer)
- Log search or filtering on the agent (all filtering happens on the control plane)
- Log rotation or compression
- Forwarding to external log aggregators (Loki, Elasticsearch, etc.)

## Dependencies

- IF-125 (Docker operations handler must be in place for container access)
