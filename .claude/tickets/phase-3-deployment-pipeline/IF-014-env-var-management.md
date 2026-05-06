# IF-014: Environment variable management

**Phase:** 3 — Deployment Pipeline
**Priority:** Critical
**Estimate:** M

## Description

Full CRUD for environment variables with three scopes (shared, production, preview), encryption at rest, and .env file import.

## Acceptance Criteria

- [ ] API endpoints:
  - `GET /api/v1/apps/:id/env` — list env vars (values masked by default)
  - `GET /api/v1/apps/:id/env?reveal=true` — list with decrypted values (admin/deployer only)
  - `POST /api/v1/apps/:id/env` — create/update one or more vars
  - `DELETE /api/v1/apps/:id/env/:key` — delete a var
  - `POST /api/v1/apps/:id/env/import` — import from .env file content
- [ ] Three scopes: `shared`, `production`, `preview`
- [ ] Inheritance resolution: shared → scope-specific override → branch-specific override
- [ ] Values encrypted at rest using the daemon's encryption key
- [ ] `.env` file parsing: handle comments, empty lines, quoted values, multiline values
- [ ] Bulk import: paste/upload `.env` content, daemon parses into key-value pairs
- [ ] Changing env vars triggers a container restart (or redeploy, configurable per app)
- [ ] Env var change history (who changed what, when) — audit log
- [ ] Reserved variable protection (e.g. `PORT`, `HOST` managed by Icefall)

## Dependencies

- IF-002, IF-006
