# IF-002: Database schema and SQLite setup

**Phase:** 1 — Foundation
**Priority:** Critical
**Estimate:** M

## Description

Design and implement the core database schema using `sqlx` with SQLite as the default backend. All SQL must be standard SQL compatible with both SQLite and Postgres. Set up migrations and the database trait abstraction.

## Acceptance Criteria

- [ ] Database trait defined (`trait Database`) abstracting all data access
- [ ] SQLite implementation of the trait using `sqlx`
- [ ] Migration system using `sqlx::migrate!`
- [ ] Core tables created:
  - `users` (id, email, password_hash, role, created_at, updated_at)
  - `apps` (id, name, git_repo, git_branch, framework, build_config, resource_limits, preview_enabled, preview_branch_pattern, created_at, updated_at)
  - `environments` (id, app_id, name, type [production/preview], branch, created_at)
  - `env_vars` (id, environment_id, key, value_encrypted, scope [shared/production/preview], created_at)
  - `deploys` (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, image_ref)
  - `databases` (id, name, db_type, container_id, credentials_encrypted, backup_schedule, app_id, created_at)
  - `domains` (id, app_id, domain, verified, ssl_status, created_at)
  - `notifications` (id, channel_type, config_encrypted, created_at)
  - `notification_rules` (id, app_id, notification_id, event_type)
  - `health_checks` (id, app_id, check_type, config, interval_secs, failure_threshold, auto_restart, created_at)
  - `health_check_events` (id, health_check_id, status, checked_at)
- [ ] WAL mode enabled for SQLite
- [ ] All queries tested with `sqlx::test`
- [ ] Encryption helper for sensitive fields (env vars, DB credentials, OAuth tokens)

## Dependencies

- IF-001
