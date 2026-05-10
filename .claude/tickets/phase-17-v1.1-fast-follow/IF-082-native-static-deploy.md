# IF-082: Native static site deployment (no Docker)

**Phase:** 17 — v1.1 Fast Follow
**Priority:** High
**Estimate:** L

## Description

Static sites (React, Vite, Astro static, Vue, plain HTML) don't need a Docker container. The build output is just HTML/CSS/JS files that Caddy can serve directly from a directory. Currently, Icefall wraps every static site in a Caddy container (~30MB RAM overhead per site, slower builds, unnecessary image layers).

Add a "native" deployment path that builds on the host and configures Caddy to serve the output directory directly. This makes static deploys near-instant and eliminates container overhead — matching the Vercel/Netlify experience.

## Current Behavior

```
Clone → Detect Framework → Generate Dockerfile → docker build (installs deps + builds inside Docker) → docker run caddy:alpine → Caddy reverse proxy → Caddy-in-container
```

**Problems:**
- Docker image build is slow (~30-60s even with layer caching)
- Running Caddy inside a container to serve static files when Caddy is already running as the host reverse proxy
- ~30MB RAM wasted per static site container
- Layer cache invalidation forces full rebuilds on dependency changes

## Proposed Behavior

```
Clone → Detect Framework → Install deps on host → Build on host → Copy output to /var/lib/icefall/sites/{app-name}/ → Configure Caddy file_server route → Done
```

**Benefits:**
- Deploys in <5 seconds (no Docker build, no image push, no container start)
- Zero RAM overhead per static site (Caddy serves from disk)
- Build cache lives on the host filesystem (node_modules reuse between deploys)
- Rollback = symlink switch to previous build directory

## Acceptance Criteria

### Framework Detection
- [ ] Detect when an app is a static site: `Framework::StaticSite`, `Framework::ViteReact`, `Framework::ViteVue`, `Framework::Astro` (non-SSR mode)
- [ ] New deploy type: "native" (vs "container")
- [ ] User can override: force container mode even for static sites (for apps that need server-side logic)

### Native Build Pipeline
- [ ] Clone repo to `/var/lib/icefall/builds/{deploy-id}/`
- [ ] Install dependencies using detected package manager (bun/npm/yarn/pnpm) on the host
- [ ] Run build command (e.g., `bun run build`)
- [ ] Copy output directory (e.g., `dist/`, `.output/`, `build/`) to `/var/lib/icefall/sites/{app-name}/{deploy-id}/`
- [ ] Symlink `/var/lib/icefall/sites/{app-name}/current` → the new deploy directory
- [ ] Configure Caddy `file_server` route pointing to the symlink

### Caddy Configuration
- [ ] Static site route uses `file_server` directive instead of `reverse_proxy`
- [ ] SPA fallback: `try_files {path} /index.html` for single-page apps
- [ ] Custom headers: cache-control for hashed assets, no-cache for HTML
- [ ] Gzip/Brotli compression (Caddy handles this natively)

### Rollback
- [ ] Keep N previous build directories (default: 5)
- [ ] Rollback = switch the `current` symlink to a previous deploy directory
- [ ] No container restart needed — Caddy serves from the symlink instantly

### Build Caching
- [ ] Preserve `node_modules/` between builds (don't re-install if lockfile unchanged)
- [ ] Compare lockfile hash between deploys to decide whether to re-install
- [ ] Clean up old build caches (keep last 3)

### Dashboard
- [ ] Show "Static" badge on native-deployed apps
- [ ] Deploy type indicator: "Native" vs "Container"
- [ ] No container metrics for native apps (no container running)
- [ ] Health check: HTTP request to the served URL instead of container TCP check

### SSR Consideration
- [ ] Astro SSR, Next.js, Nuxt, Node apps still use the container path
- [ ] App settings: toggle between "auto" (detect), "native", and "container" deploy modes
- [ ] Default: "auto" — framework detection decides

## Technical Notes

- Caddy file_server config is simpler than reverse_proxy — just `root * /path/to/files` + `file_server`
- The Caddy client already supports route CRUD — add a `file_server_route` variant
- Build on host requires Node.js/Bun installed on the Icefall server — the install script already installs these
- Symlink switching is atomic on Linux (`ln -sfn`)
- Consider running builds in a tmpfs or build directory to avoid filling the main disk

## Performance Comparison

| Metric | Container Deploy | Native Deploy |
|---|---|---|
| Build time (cold) | ~60s (Docker build) | ~30s (host build) |
| Build time (cached) | ~30s | ~5s (lockfile unchanged) |
| Deploy time | ~10s (start container, health check) | ~1s (symlink switch) |
| RAM per app | ~30MB (Caddy container) | 0 (served by host Caddy) |
| Rollback time | ~10s (start old container) | ~1s (symlink switch) |
| Disk per deploy | ~100MB (Docker image) | ~10-50MB (build output only) |

## Out of Scope

- Serverless functions / edge functions (different paradigm)
- CDN/edge deployment (single-server architecture)
- ISR (Incremental Static Regeneration) — requires a running server
- Native deployment for SSR apps (still use containers)

## Dependencies

- IF-005 (Caddy client), IF-008 (framework detection), IF-010 (build orchestrator)
