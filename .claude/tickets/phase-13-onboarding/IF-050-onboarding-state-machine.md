# IF-050: Onboarding state machine & route guard

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

Backend state machine that tracks onboarding progress and gates the entire application until setup is complete. Every HTTP request (except static assets and the onboarding API itself) must redirect to the current onboarding step until all required steps are done. The state persists across server restarts.

## Acceptance Criteria

- [ ] Onboarding state stored in database with a single `onboarding` row:
  - `current_step` enum: `admin_account`, `server_check`, `base_domain`, `git_provider`, `first_app`, `first_deploy`, `completed`
  - `completed_steps` JSON array of finished step IDs
  - `started_at` timestamp
  - `completed_at` nullable timestamp
- [ ] Axum middleware checks onboarding state on every request:
  - If `completed`: pass through to normal app routing
  - If not `completed`: redirect all non-onboarding routes to `/onboarding/{current_step}`
  - Exception: `/api/onboarding/*` endpoints, static assets, health check endpoint
- [ ] REST endpoints:
  - `GET /api/onboarding/status` — returns current step, completed steps, and whether onboarding is complete
  - `POST /api/onboarding/{step}/complete` — marks step complete, advances to next step
  - `POST /api/onboarding/skip/{step}` — marks an optional step as skipped (only allowed for optional steps)
- [ ] Steps have a defined order: `admin_account` -> `server_check` -> `base_domain` -> `git_provider` -> `first_app` -> `first_deploy` -> `completed`
- [ ] Steps `base_domain`, `git_provider` are optional (can be skipped)
- [ ] Steps `admin_account`, `server_check`, `first_app`, `first_deploy` are required
- [ ] State survives server restarts (persisted to database)
- [ ] Once `completed_at` is set, onboarding middleware becomes a no-op (zero performance cost)
- [ ] `icefall reset-onboarding` CLI command to restart the flow (development/recovery use)

## Out of Scope

- UI implementation (separate tickets)
- Individual step logic (each step has its own ticket)

## Dependencies

- IF-002 (database), IF-006 (REST API), IF-007 (daemon)
