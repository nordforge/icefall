# IF-013: Preview environments

**Phase:** 3 — Deployment Pipeline
**Priority:** High
**Estimate:** M

## Description

Implement feature branch preview environments. When a push to a non-production branch is received (and previews are enabled for the app), deploy an isolated environment with its own container, env vars, and subdomain.

## Acceptance Criteria

- [ ] App settings: `preview_enabled` (bool), `preview_branch_pattern` (optional glob, e.g. `feat/*`)
- [ ] Preview environment creation:
  - New `environment` record (type: preview, branch name)
  - Env vars inherited: shared → preview scope → branch-specific overrides
  - Container deployed on project network
  - Caddy route: `branch--appname.base-domain.com`
- [ ] Branch name sanitization for subdomain (lowercase, replace `/` with `-`, strip special chars)
- [ ] Preview environment update on subsequent pushes to the same branch
- [ ] Preview environment destruction:
  - On branch delete webhook event
  - On merge webhook event
  - Manual deletion via API/UI
- [ ] Container, network membership, env vars, Caddy route all cleaned up on destroy
- [ ] List preview environments per app via API
- [ ] Resource awareness: warn if creating a preview would exceed recommended resource limits

## Dependencies

- IF-011, IF-012, IF-002
