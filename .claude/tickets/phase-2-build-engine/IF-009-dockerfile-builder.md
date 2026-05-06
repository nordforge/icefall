# IF-009: Dockerfile generation per framework

**Phase:** 2 — Build Engine
**Priority:** Critical
**Estimate:** L

## Description

Generate optimized Dockerfiles for each detected framework. For projects that already have a Dockerfile, use it as-is. For detected frameworks, generate a multi-stage Dockerfile optimized for size and build speed.

## Acceptance Criteria

- [ ] Dockerfile template system (Rust string templates, not a template engine)
- [ ] Templates for each Tier 1 framework:
  - **Dockerfile project:** use the existing Dockerfile directly
  - **Static site (no build):** Caddy-based image serving the files
  - **Static site (with build):** multi-stage — Node/Bun build stage → Caddy serve stage
  - **Astro:** multi-stage — install + build → Caddy (static) or Node (SSR)
  - **Next.js:** multi-stage — install + build → standalone Node output
  - **React (Vite):** multi-stage — install + build → Caddy serve
  - **Vue:** multi-stage — install + build → Caddy serve
  - **Nuxt:** multi-stage — install + build → Node runtime
  - **Node.js app:** install + start
- [ ] Package manager support in Dockerfiles (correct install commands for npm/pnpm/yarn/bun)
- [ ] Layer caching optimization (copy lockfile first, install, then copy source)
- [ ] `.dockerignore` generation (node_modules, .git, etc.)
- [ ] Configurable base images (default: `node:22-slim` for Node, `oven/bun:latest` for Bun)
- [ ] Port exposure matching detected port
- [ ] Non-root user in final stage for security
- [ ] Generated Dockerfiles are human-readable (with comments explaining each stage)
- [ ] Tests for each template producing valid Dockerfiles

## Dependencies

- IF-008
