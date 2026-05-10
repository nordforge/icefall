# IF-127: Agent metrics collection

**Phase:** 20B — Agent Core
**Priority:** High
**Estimate:** M

## Description

The agent periodically collects system-level and per-container metrics and sends them to the control plane as Event messages. The control plane stores these metrics in the `server_metrics_history` table and updates the in-memory MetricsStore to serve real-time data to the dashboard. This enables monitoring of remote servers alongside the control plane server.

## Acceptance Criteria

### Agent Metrics Collection
- [ ] Collects metrics every 10 seconds
- [ ] Server-level metrics:
  - CPU usage percentage (aggregate across all cores)
  - RAM used bytes and total bytes
  - Disk used bytes and total bytes (root filesystem)
  - Load average (1m, 5m, 15m)
- [ ] Per-container metrics:
  - CPU usage percentage
  - RAM usage bytes
  - Network I/O: bytes received, bytes transmitted
- [ ] Uses `sysinfo` crate for server metrics
- [ ] Uses `bollard` Docker stats API for container metrics

### Metrics Event Format
- [ ] Event type: `server.metrics`
- [ ] Event data:
  ```json
  {
    "server": {
      "cpu_percent": 42.5,
      "ram_used_bytes": 2147483648,
      "ram_total_bytes": 8589934592,
      "disk_used_bytes": 21474836480,
      "disk_total_bytes": 107374182400,
      "load_average": [1.2, 0.8, 0.6]
    },
    "containers": {
      "<container_id>": {
        "cpu_percent": 12.3,
        "ram_bytes": 134217728,
        "net_rx_bytes": 1048576,
        "net_tx_bytes": 524288
      }
    },
    "collected_at": "2026-05-10T12:00:00Z"
  }
  ```

### Control Plane Storage
- [ ] Receives `server.metrics` events and stores in `server_metrics_history` table
- [ ] One row per collection interval per server
- [ ] Container metrics stored as JSON in the row or in a separate table
- [ ] Retention: configurable, default 7 days, older rows pruned by background task

### Control Plane MetricsStore
- [ ] MetricsStore updated to handle multi-server data
- [ ] Keyed by server_id: `get_metrics(server_id) -> ServerMetrics`
- [ ] `get_all_metrics() -> HashMap<ServerId, ServerMetrics>` for aggregate views
- [ ] Existing single-server metrics API continues to work (returns control-plane metrics)

### Dashboard API
- [ ] `GET /api/v1/servers/{id}/metrics` — returns current and historical metrics for a server
- [ ] `GET /api/v1/metrics` — returns aggregate metrics across all servers (existing endpoint enhanced)

## Technical Notes

- `sysinfo::System` should be initialized once and refreshed each cycle (not recreated)
- Docker stats use `bollard::container::StatsOptions { stream: false }` for point-in-time reads
- CPU percentage calculation from Docker stats requires delta between two readings — cache the previous stats
- The 10-second interval balances freshness against WebSocket bandwidth
- Consider compressing metrics history after 1 hour (downsample to 1-minute intervals)

## Out of Scope

- Alerting based on metrics (future phase)
- Custom metric definitions or plugins
- GPU metrics
- Per-process metrics (only container-level)

## Dependencies

- IF-121 (agent binary skeleton for the periodic task and WebSocket connection)
