# IF-029: Managed database provisioning

**Phase:** 7 — Databases
**Priority:** High
**Estimate:** L

## Description

First-class database provisioning: one-click creation of Postgres, MySQL, Redis, and MongoDB containers with auto-generated credentials and connection strings.

## Acceptance Criteria

- [ ] API endpoints:
  - `POST /api/v1/databases` — create database (type, name, optional app link)
  - `GET /api/v1/databases` — list all databases
  - `GET /api/v1/databases/:id` — database details + connection info
  - `DELETE /api/v1/databases/:id` — destroy database (with confirmation)
  - `POST /api/v1/databases/:id/link/:app_id` — link database to app (inject env vars)
  - `DELETE /api/v1/databases/:id/link/:app_id` — unlink
- [ ] Database types and images:
  - PostgreSQL: `postgres:17`, default port 5432
  - MySQL: `mysql:8`, default port 3306
  - Redis: `redis:7`, default port 6379
  - MongoDB: `mongo:7`, default port 27017
- [ ] Auto-generated secure credentials (32-char random password)
- [ ] Connection string format per type:
  - Postgres: `postgresql://icefall:<pass>@<container>:5432/<dbname>`
  - MySQL: `mysql://icefall:<pass>@<container>:3306/<dbname>`
  - Redis: `redis://:<pass>@<container>:6379`
  - MongoDB: `mongodb://icefall:<pass>@<container>:27017/<dbname>`
- [ ] Container created on project network (if linked to an app)
- [ ] Named volume for data persistence
- [ ] Resource limits: configurable, defaults from PRD (1GB for SQL, 256MB for Redis)
- [ ] Linking injects `DATABASE_URL` (or type-specific var) into app's shared env vars
- [ ] Credentials encrypted at rest
- [ ] Port not exposed to host by default (access only via Docker network)
- [ ] Optional: expose port to host for external access (with auth warning)

## Dependencies

- IF-004, IF-002, IF-014
