# IF-019: App detail page

**Phase:** 4 — Web Dashboard
**Priority:** High
**Estimate:** L

## Description

The single-app management page with tabbed navigation for all app-related views.

## Acceptance Criteria

- [ ] App header: name, status dot, primary domain (clickable link), git repo + branch, framework badge
- [ ] Action buttons: Redeploy, Stop/Start, Settings
- [ ] Tabbed navigation:
  - **Overview** — current status, resource usage (CPU/RAM bars), last deploy summary, linked databases, quick stats
  - **Deploys** — chronological deploy list, each entry expandable to show build steps
  - **Logs** — runtime log viewer (see IF-021)
  - **Env Vars** — Vercel-style editor (see IF-020)
  - **Domains** — domain management (see IF-023)
  - **Settings** — app configuration (git, build, resources, preview, danger zone with delete)
- [ ] Overview tab shows live metrics via SSE
- [ ] Deploy tab: click a deploy → expand to show collapsible build steps with streamed output
- [ ] Settings tab: edit all values from app creation flow, save triggers redeploy confirmation
- [ ] Danger zone in settings: delete app (confirmation dialog, removes container, network, volumes, Caddy route)
- [ ] Mobile responsive: tabs become a dropdown or scrollable
- [ ] Light and dark theme verified

## Dependencies

- IF-016, IF-017, IF-006
