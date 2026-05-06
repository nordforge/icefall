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

## Dependencies

- IF-006 (needs API to talk to)
