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

## Design References (Stitch — Light Mode)

| Screen | Stitch ID | Screenshot folder |
|--------|-----------|-------------------|
| App Details: api-gateway (Light) | `6dbbf031159840e088b964e392503ed4` | `design_screenshots/app-details/` |
| App Deploys: api-gateway (Light) | `a9c3c13125d548b883f5dbfdd65adad8` | `design_screenshots/app-deploys/` |
| Domains: api-gateway (Light) | `22e845cdc9d442d7a2fdd8021dfb565e` | `design_screenshots/domains-app/` |
| Add Domain Dialog Overlay (Light) | `01647473b4c3427da3ea638aa1b0328f` | `design_screenshots/domains-app/overlays/` |
| Settings: api-gateway (Light) | `f3463ccad37a4821abcb85de1df3b35a` | `design_screenshots/settings-app/` |

## Dependencies

- IF-016, IF-017, IF-006
