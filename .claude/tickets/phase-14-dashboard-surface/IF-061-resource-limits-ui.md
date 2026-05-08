# IF-061: Resource limits UI

**Phase:** 14 — Dashboard Surface
**Priority:** High
**Estimate:** S

## Description

The deploy manager already accepts `memory_bytes` and `cpu_shares` via a `resource_limits` JSON field on the app model. Add UI fields in the app settings tab so users can set container CPU and memory constraints without using the API directly.

## Acceptance Criteria

- [ ] New section in app settings tab: "Resource Limits"
- [ ] Memory limit field:
  - Input with unit selector (MB / GB)
  - Default: empty (no limit)
  - Minimum: 64 MB
  - Show current server memory as reference ("Server has X GB total")
  - Validation: cannot exceed server memory
- [ ] CPU limit field:
  - Input as CPU shares (relative weight) or percentage
  - Default: empty (no limit)
  - Show available CPU cores as reference
  - Validation: positive number
- [ ] Warning banner when no resource limits are set: "No resource limits configured. A runaway process could consume all server resources."
- [ ] Save persists to the `resource_limits` JSON field on the app via `PUT /api/v1/apps/{id}`
- [ ] Changes take effect on next deploy (show note: "Resource limits apply on next deployment")
- [ ] Light and dark theme verified

## Technical Notes

- The deploy manager in `src/deploy/manager.rs` already reads `resource_limits` and passes `memory_bytes` and `cpu_shares` to Docker container creation
- Resource limits are stored as a JSON field on the apps table — deserializes to `{ memory_bytes: u64, cpu_shares: u64 }`
- Docker's `cpu_shares` is a relative weight (default 1024). Consider exposing as a simpler percentage or "Low / Medium / High" preset

## Out of Scope

- Per-container metrics vs. limits visualization (future: show usage against limit)
- Disk/IO limits
- Network bandwidth limits
- Database resource limits (separate ticket)

## Dependencies

- IF-011 (container deployment), IF-019 (app detail page)
