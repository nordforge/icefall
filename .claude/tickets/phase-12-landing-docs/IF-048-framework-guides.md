# IF-048: Per-framework deployment guides

**Phase:** 12 — Landing & Docs
**Priority:** Medium
**Estimate:** M

## Description

Dedicated deployment guide for each Tier 1 framework, showing the exact steps and what Icefall auto-detects vs what the user might need to configure.

## Acceptance Criteria

- [ ] Individual guide pages for:
  - Deploying an Astro site
  - Deploying a Next.js app
  - Deploying a React (Vite) app
  - Deploying a Vue app
  - Deploying a Nuxt app
  - Deploying a Node.js app (Express, Fastify, Hono)
  - Deploying with a Dockerfile
  - Deploying a static site
- [ ] Each guide includes:
  - Prerequisites (what your project needs)
  - What Icefall auto-detects (framework, package manager, build command, port)
  - How to override defaults
  - Common issues and solutions
  - Example project structure
  - Environment variables typically needed
  - SSR vs static output handling (where applicable)
- [ ] Terminal screenshots or code blocks showing the build step output
- [ ] Links to example repos (optional, if we create them)

## Dependencies

- IF-047
