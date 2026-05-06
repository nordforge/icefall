# IF-027: Log storage and search

**Phase:** 6 — Monitoring
**Priority:** Medium
**Estimate:** M

## Description

Store container logs and enable search/filter functionality for the log viewer.

## Acceptance Criteria

- [ ] Log capture: daemon subscribes to container stdout/stderr via Docker API
- [ ] Log storage: append to per-app log files on disk (not in SQLite — too much data)
- [ ] Log rotation: configurable max size per app (default: 50MB), rotate to `.1`, `.2`, etc.
- [ ] Max retention: configurable (default: 7 days)
- [ ] Search API:
  - `GET /api/v1/apps/:id/logs?search=term&limit=100&before=timestamp&after=timestamp`
  - Full text search across log lines
  - Filter by stream (stdout/stderr)
  - Pagination via cursor (timestamp-based)
- [ ] Search performance: < 500ms across 100K lines
- [ ] Log streaming: SSE endpoint for real-time tail
- [ ] Log download: `GET /api/v1/apps/:id/logs/download` returns full log as text file
- [ ] Sensitive data: auto-redact values matching known env var values in log output

## Dependencies

- IF-004, IF-002
