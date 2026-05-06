# IF-008: Framework detection engine

**Phase:** 2 — Build Engine
**Priority:** Critical
**Estimate:** M

## Description

Implement the framework detection pipeline that inspects a cloned repository and determines the project type, package manager, and build configuration.

## Acceptance Criteria

- [ ] Detection module with ordered rules:
  1. `Dockerfile` present → Dockerfile project
  2. `astro.config.mjs/ts/js` → Astro
  3. `next.config.mjs/ts/js` → Next.js
  4. `nuxt.config.ts/js` → Nuxt
  5. `vite.config.*` + `react` in deps → React (Vite)
  6. `vite.config.*` + `vue` in deps → Vue
  7. `package.json` with `start` script → Node.js app
  8. Only HTML/CSS/JS files → Static site
- [ ] Package manager detection via lockfile:
  - `bun.lock` / `bun.lockb` → Bun
  - `pnpm-lock.yaml` → pnpm
  - `yarn.lock` → Yarn
  - `package-lock.json` → npm
  - No lockfile → fallback to npm
- [ ] Node.js version detection (from `.nvmrc`, `.node-version`, `engines` in `package.json`)
- [ ] Detection result struct: framework, package_manager, node_version, build_command, output_dir, start_command, detected_port
- [ ] Each framework has sensible defaults (e.g. Astro: `bun run build`, output: `dist/`, port: 4321)
- [ ] User can override any detected value via app settings
- [ ] Detection completes in < 100ms
- [ ] Unit tests for each framework type with fixture repos

## Dependencies

- IF-001
