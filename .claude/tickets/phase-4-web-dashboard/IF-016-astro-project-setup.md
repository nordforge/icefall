# IF-016: Astro + Preact dashboard project setup

**Phase:** 4 — Web Dashboard
**Priority:** Critical
**Estimate:** S

## Description

Initialize the Astro project for the web dashboard. Set up Preact integration, CSS Modules, Ark UI, theming (light/dark), and the base layout.

## Acceptance Criteria

- [ ] Astro project in `dashboard/` directory at project root
- [ ] Preact integration configured (`@astrojs/preact`)
- [ ] CSS Modules working (`.module.css` files)
- [ ] Ark UI installed and configured for Preact
- [ ] Lucide icons installed (`lucide-preact`)
- [ ] CSS custom properties for theming (all colors from DESIGN.md)
- [ ] `data-theme="light"` / `data-theme="dark"` toggle on `<html>`
- [ ] Theme persisted in localStorage, defaults to system preference
- [ ] Base layout component:
  - Sidebar navigation (collapsible)
  - Main content area with max-width
  - Theme toggle in sidebar footer
- [ ] Inter + JetBrains Mono fonts loaded
- [ ] Responsive breakpoints configured (mobile < 640, tablet 640-1024, desktop > 1024)
- [ ] API client utility for daemon REST API calls (fetch wrapper with auth headers)
- [ ] SSE client utility for subscribing to event streams
- [ ] `bun dev` starts the dev server

## Design References (Stitch — Light Mode)

Full Stitch screen inventory for the dashboard. Screenshots go in `.claude/design_screenshots/`.

### Phase 4 screens (this phase)
| Screen | Stitch ID | Folder | Ticket |
|--------|-----------|--------|--------|
| Icefall Dashboard (Light) | `5a0920c332834efe99f987bca26e2e68` | `dashboard/` | IF-017 |
| App Details: api-gateway (Light) | `6dbbf031159840e088b964e392503ed4` | `app-details/` | IF-019 |
| App Deploys: api-gateway (Light) | `a9c3c13125d548b883f5dbfdd65adad8` | `app-deploys/` | IF-019 |
| Deploy #47: api-gateway (Light) | `afcf80606fb946e4acad739564c03505` | `deploy-detail/` | IF-022 |
| Log Viewer: api-gateway (Light) | `dcb5e5c299ab4c919e1b0688de87ee8e` | `log-viewer/` | IF-021 |
| Domains: api-gateway (Light) | `22e845cdc9d442d7a2fdd8021dfb565e` | `domains-app/` | IF-019 |
| Add Domain Dialog Overlay (Light) | `01647473b4c3427da3ea638aa1b0328f` | `domains-app/overlays/` | IF-019 |
| Environment Variables: api-gateway (Light) | `28b7917bd29348ddb7c4daa3f26aeb51` | `env-vars/` | IF-020 |
| Settings: api-gateway (Light) | `f3463ccad37a4821abcb85de1df3b35a` | `settings-app/` | IF-019 |

### Later phase screens (designed, not yet ticketed for Phase 4)
| Screen | Stitch ID | Folder | Phase |
|--------|-----------|--------|-------|
| Server Overview (Light) | `06131eade32041f4b230e77c973b13c8` | `server-overview/` | 6 — Monitoring |
| Database Details: production-db (Light) | `cd0cabee59fc4b68be99215538beb731` | `database-details/` | 7 — Databases |
| Delete Database Confirmation (Light) | `53c727c1f337484fabdff5c1741097db` | `database-details/overlays/` | 7 — Databases |
| Domains Management (Light) | `bdd86dd9aaab4c84aa49f6fec580ef4d` | `domains-global/` | 5 — Domains |
| Users Management (Light) | `006f73195c3441feb54fe5c8a765bdc3` | `users-management/` | 8 — Auth |
| Invite User Dialog Overlay (Light) | `2f61ff1277e9492eaa4a5c9c2aef79b4` | `users-management/overlays/` | 8 — Auth |
| Platform Settings (Light) | `fe57baa4507b423bb83e9f8471ac5a65` | `platform-settings/` | 11 — Settings |

## Dependencies

- IF-006 (needs API to talk to)
