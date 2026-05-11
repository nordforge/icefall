# IF-128: Agent health check execution

**Phase:** 20B — Agent Core
**Priority:** Medium
**Estimate:** S

## Description

The agent handles health check requests from the control plane by performing HTTP GET requests against containers running on the local server. This allows the deploy pipeline to verify that a newly started container is healthy before routing traffic to it, even on remote servers.

## Acceptance Criteria

### Health Check Handler
- [ ] `health.check` method handler registered in the agent
- [ ] Parameters:
  - `port` (required) — container's exposed port on localhost
  - `path` (required) — HTTP path to check (e.g., `/health`, `/`)
  - `attempts` (optional, default 5) — number of retry attempts
  - `interval_ms` (optional, default 2000) — milliseconds between attempts
  - `timeout_ms` (optional, default 5000) — per-request timeout
  - `expected_status` (optional, default 200) — expected HTTP status code

### Health Check Execution
- [ ] Performs HTTP GET to `http://localhost:{port}{path}`
- [ ] Retries up to `attempts` times with `interval_ms` between each
- [ ] Each request has a `timeout_ms` timeout
- [ ] Considers the check successful if response status matches `expected_status`

### Response Format
- [ ] Response includes:
  ```json
  {
    "healthy": true,
    "attempts_made": 3,
    "last_status": 200,
    "last_response_time_ms": 42,
    "last_error": null
  }
  ```
- [ ] On failure (all attempts exhausted):
  ```json
  {
    "healthy": false,
    "attempts_made": 5,
    "last_status": null,
    "last_response_time_ms": null,
    "last_error": "connection refused"
  }
  ```

### Edge Cases
- [ ] Connection refused: counts as a failed attempt, retries
- [ ] Timeout: counts as a failed attempt, retries
- [ ] Non-matching status code: counts as a failed attempt, retries
- [ ] All attempts exhausted: returns unhealthy result (not an error)

## Technical Notes

- Use `reqwest::Client` with per-request timeout (not a global timeout)
- The health check runs against localhost because the container is on the same server as the agent
- This is the same health check logic the control plane uses locally — consider extracting the shared logic into `icefall-common` if it is not already
- Keep the handler simple: no caching, no background polling, just request-response

## Out of Scope

- TCP health checks (HTTP only for now)
- gRPC health checks
- Continuous health monitoring (this is on-demand only, called during deploys)
- Custom health check scripts

## Dependencies

- IF-125 (Docker operations handler — containers must be running for health checks to work)
