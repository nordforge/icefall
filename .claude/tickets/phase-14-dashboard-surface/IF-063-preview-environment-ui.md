# IF-063: Preview environment UI

**Phase:** 14 — Dashboard Surface
**Priority:** High
**Estimate:** M

## Description

Preview environments (auto-create on PR, auto-destroy on merge/close) are fully implemented in the backend. Add dashboard UI to enable/configure previews and view active preview deployments.

## Acceptance Criteria

### Settings Tab — Preview Configuration
- [ ] New section: "Preview Deployments"
- [ ] Toggle: "Enable preview deployments" (default: off)
- [ ] Branch pattern input when enabled:
  - Glob pattern (e.g., `feature/*`, `*`, `fix/*`)
  - Default: `*` (all branches except the main deploy branch)
  - Help text explaining glob syntax
- [ ] Preview domain format display: `{branch}--{app-name}.{base-domain}`
- [ ] Auto-cleanup toggle: "Automatically remove preview when branch is deleted" (default: on)
- [ ] Save persists to app model via API

### Overview Tab — Active Previews
- [ ] Section: "Preview Deployments" (only visible when previews are enabled and at least one exists)
- [ ] List of active preview environments showing:
  - Branch name
  - Preview URL (clickable)
  - Status (running / building / stopped)
  - Created timestamp
  - "Remove" button per preview
- [ ] Empty state when no active previews: "No active preview deployments. Push to a matching branch to create one."

### General
- [ ] Light and dark theme verified
- [ ] Mobile responsive

## Technical Notes

- Backend implementation: `src/deploy/preview.rs`
- Branch names are sanitized for DNS: lowercase, alphanumeric + hyphens, max 63 chars
- Preview environments are created automatically when webhook receives a push to a matching branch
- Cleanup happens on branch delete events from GitHub/GitLab webhooks
- Each preview gets its own container, network, and Caddy route

## Out of Scope

- PR comments with deployment URLs (requires GitHub App integration)
- Preview-scoped environment variables (uses same env vars as main app)
- Preview deployment limits (max concurrent previews)

## Dependencies

- IF-013 (preview environments), IF-062 (webhooks UI — previews require webhooks enabled)
