# Icefall vs Coolify — Full Feature Gap Analysis

> Generated: 2026-05-08
> Purpose: Compare Icefall's current feature set against Coolify (open-source PaaS) to identify implementation opportunities.

---

## Overview

Coolify is an open-source, self-hostable PaaS (Platform as a Service) with 52k+ GitHub stars. It runs on Laravel 12 (PHP) + Vue.js 3 with PostgreSQL and Redis. Icefall is built on Rust (Axum) + Astro 6 / Preact with SQLite. This report maps every Coolify feature against what Icefall currently has.

**Overall coverage: Icefall implements roughly 35-40% of Coolify's feature set.** The core app/database deployment loop is solid. The biggest gaps are in multi-server support, CI/CD, the service marketplace, project organization, and container-level controls.

---

## Scorecard

| Category | Icefall | Coolify | Coverage |
|---|---|---|---|
| App Management | 10 features | 28 features | ~36% |
| Databases | 9 features | 17 features | ~53% |
| One-Click Services | 0 | 280+ | 0% |
| Server Management | 4 features | 14 features | ~29% |
| Networking & Domains | 4 features | 11 features | ~36% |
| Users & Teams | 7 features | 13 features | ~54% |
| CI/CD | 1 feature | 8 features | ~13% |
| Notifications | 5 features | 11 features | ~45% |
| Settings & Config | 6 features | 12 features | ~50% |
| Organization | 1 feature | 6 features | ~17% |

---

## Legend

- **Have** — Feature exists in Icefall
- **Partial** — Partially implemented
- **Missing** — Not yet implemented
- **Icefall+** — Feature Icefall has that Coolify does not

---

## 1. Application Management

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Create app from git repo | Have | 4-step wizard (repo, build, env, review) |
| Build command configuration | Have | Install + build + start commands |
| Environment variables CRUD | Have | Add/edit/delete with reveal/hide |
| Env var scoping | Partial | Shared/production/preview scopes — missing build-time flag |
| Bulk .env import | Have | Import from .env files |
| Deploy history | Have | Status tracking per deploy |
| Real-time build logs (SSE) | Have | Streaming with search, filtering, auto-scroll, download |
| Runtime application logs | Have | Real-time log viewer |
| Custom domains per app | Have | Add/remove with SSL and DNS status |
| App settings (name, branch, build cmd) | Have | With save/delete + confirmation |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Rollback to previous deploy | High | Revert to any previous deployment using locally cached Docker images |
| Multiple build packs | High | Nixpacks (auto-detect), Static (Nginx), Dockerfile, Docker Compose, Docker Image — we only support git repos |
| Deploy pre-built Docker images | High | Pull and deploy from any registry (Docker Hub, GHCR, private) without building |
| Docker Compose support | High | Full compose file support with isolated bridge networks, service-to-service communication |
| Start/stop/restart controls | High | Basic container lifecycle management from the UI |
| Health checks | High | Configurable path, expected status code, check interval |
| Container terminal | Medium | Browser-based shell (exec) into running containers |
| Persistent storage/volumes | Medium | Docker volumes and bind mounts with source/destination path mapping |
| Auto-deploy on push | High | Webhook-triggered automatic deployment on git push |
| Preview deployments (PR-based) | Medium | Auto-deploy on PR open, auto-cleanup on merge/close, PR comments with status |
| Monorepo support (base directory) | Medium | Configure subdirectory as build context |
| Resource limits (CPU/memory) | Medium | Container-level CPU and memory constraints |
| Post-deployment commands | Medium | Run scripts after successful deploy |
| Scheduled tasks (cron in container) | Low | Cron-based command execution inside running containers |
| Container labels | Low | Custom Docker/Traefik labels for routing and external tooling |
| Force HTTPS toggle | Medium | Per-app toggle to redirect HTTP to HTTPS |
| WebSocket support toggle | Low | Enable WebSocket proxying per app |
| Build secrets | Low | Mount secrets during build without embedding in image layers |
| Git LFS / submodule support | Low | Handle large files and submodules during clone |
| Rolling updates (zero-downtime) | Medium | Start new container before stopping old one |

---

## 2. Database Management

### What We Have

| Feature | Status | Notes |
|---|---|---|
| PostgreSQL | Have | One-click provisioning |
| MySQL | Have | One-click provisioning |
| Redis | Have | One-click provisioning |
| MongoDB | Have | One-click provisioning with JSON document viewer |
| Link/unlink databases to apps | Have | From both app detail and database pages |
| Database browser / query builder | Have | Execute queries, view tables |
| View credentials | Have | Connection strings and credentials display |
| Scheduled backups | Have | Cron-based scheduling |
| Download/restore backups | Have | Backup management with restore |
| S3 backup storage | Have | S3-compatible backup destinations |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| MariaDB | Low | MySQL-compatible alternative |
| ClickHouse | Low | Column-oriented analytics database |
| KeyDB | Low | Redis-compatible, multithreaded |
| DragonFly | Low | Redis-compatible, modern in-memory store |
| Public port / TCP proxy | Medium | Dynamic public ports via Nginx TCP proxy for external access |
| Database terminal access | Medium | Browser-based shell into database containers |
| Start/stop/restart controls | High | Container lifecycle management for databases |
| Internal URL generation | Medium | Auto-generated internal URLs for same-network access |
| Backup retention count | Low | Configure how many backups to keep before rotation |

---

## 3. One-Click Services (Marketplace)

### What We Have

Nothing. This is Icefall's largest feature gap.

### What Coolify Has

Coolify offers **280+ one-click services** across 40+ categories. These are pre-configured Docker deployments with automatic Traefik routing, SSL, and persistent storage.

**Key categories and examples:**

| Category | Count | Notable Services |
|---|---|---|
| AI | 20 | Ollama, Open WebUI, AnythingLLM, Langflow, Langfuse, Flowise, ChromaDB |
| Analytics | 10 | Plausible, PostHog, Umami, Metabase, Superset |
| Automation | 5 | N8N, ActivePieces, Trigger.dev |
| CMS | 7 | WordPress, Ghost, Strapi, Directus, Drupal |
| Communication | 6 | Rocket.Chat, Mattermost, Matrix |
| Development | 57 | Gitea, GitLab, Jenkins, Supabase, PocketBase, Portainer, pgAdmin, phpMyAdmin, Hoppscotch |
| Documentation | 7 | BookStack, WikiJS, Docmost, Paperless |
| File Management | 6 | FileBrowser, SFTPGo, Syncthing |
| Media | 22+ | Jellyfin, Plex, Immich, Navidrome |
| Monitoring | 11 | Uptime Kuma, Grafana, Glances, SigNoz |
| Productivity | 23+ | Outline, Vikunja, Cal.com, Excalidraw, AppFlowy |
| Project Management | 4 | Plane, Leantime, Redmine |
| Search | 5 | Meilisearch, Elasticsearch, Typesense |
| Security | 15 | Authentik, Keycloak, Vaultwarden, Pi-hole |
| Storage | 8 | MinIO, NextCloud, SeaweedFS |
| Gaming | 7 | Minecraft, Palworld, Satisfactory, Pterodactyl |
| Business | 18 | Invoice Ninja, Odoo, Chatwoot, EspoCRM |
| Home | 4 | Home Assistant, Grocy, Mealie |
| Marketing | 3 | Listmonk, Mautic |
| Administration | 9 | Dashy, Homepage, Heimdall |
| Networking | 5 | Cloudflared, Tailscale Client |
| RSS | 2 | FreshRSS, Miniflux |
| Forum | 1 | NodeBB |
| And many more... | | |

---

## 4. Server Management

### What We Have

| Feature | Status | Notes |
|---|---|---|
| CPU usage monitoring | Have | Real-time + historical chart |
| Memory usage monitoring | Have | Used/total with chart |
| Disk usage monitoring | Have | With chart |
| Server IP display | Have | |
| Version info | Have | |
| Card/table view toggle | Icefall+ | Coolify doesn't have this |
| Time range selector (10m, 1h) | Have | |
| Auto-refresh (5s) | Have | |
| Extended metrics page | Have | /server/metrics detail view |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Multi-server support | Critical | Manage multiple remote servers — Coolify's core architecture |
| Remote server management via SSH | Critical | Connect any Linux server with SSH key auth |
| Server provisioning (Hetzner API) | Medium | Automated server creation via cloud provider APIs |
| Browser-based SSH terminal | Medium | Full terminal access to servers from the dashboard |
| Automated Docker cleanup | Medium | Threshold-based and scheduled cleanup of images/volumes/networks |
| Build server designation | Low | Offload builds to a separate server |
| Proxy management (Traefik/Caddy) | High | Configure and manage the reverse proxy per server |
| Log drains (Axiom, New Relic, FluentBit) | Medium | Ship container logs to external logging services |
| Docker network/destination management | Medium | Manage Docker networks and routing destinations |
| Server health checks | High | Automated reachability checks, mark servers unreachable after failures |
| Sentinel monitoring agent | Medium | Per-server Docker container that pushes metrics (reduces SSH overhead) |

---

## 5. Networking & Domains

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Custom domains per app | Have | Add/remove domains |
| SSL certificate status | Have | Track SSL state |
| DNS verification status | Have | DNS status tracking |
| Global domains page | Have | Cross-app domain management at /domains |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Reverse proxy management (Traefik/Caddy) | High | Full proxy config editing, dynamic config hot-reload |
| Wildcard domains | Medium | Server-level wildcard domain assignment |
| Wildcard SSL certificates | Medium | Via DNS challenge (Let's Encrypt) |
| Cloudflare Tunnel integration | Medium | Route traffic through Cloudflare without public IP or port forwarding |
| Path-based routing | Medium | Route `/api` to one service, `/` to another on same domain |
| Load balancing | Medium | Distribute traffic across multiple servers via Traefik |
| Custom Traefik middlewares | Low | Rate limiting, IP whitelisting, basic auth, security headers |
| Multiple domains per app | Medium | Comma-separated multiple FQDNs |
| sslip.io fallback domains | Low | Auto-generated domains when no custom domain is set |
| Full TLS with Cloudflare | Low | End-to-end encryption configuration |
| DNS challenge support | Low | For wildcard certs and internal services |

---

## 6. User & Team Management

### What We Have

| Feature | Status | Notes |
|---|---|---|
| User list with roles | Have | Admin, deployer, viewer |
| Invite users via email | Have | |
| Change user roles | Have | |
| Deactivate users | Have | |
| Last login tracking | Have | |
| API tokens (create/revoke) | Have | With expiration |
| Token copy-to-clipboard | Have | |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| OAuth SSO | High | GitHub, GitLab, Google, Azure, Bitbucket login |
| Two-Factor Authentication (2FA) | High | TOTP with backup codes |
| Magic link login | Low | Passwordless email login |
| Teams (multi-tenant isolation) | High | Team-based resource isolation, team invitations, root team |
| Token ability scoping | Medium | Granular read/write/deploy permissions per token |
| SSH key management | Medium | Generate or import SSH keys, assign to servers |
| User profile page | Low | Dedicated profile/account settings page |

---

## 7. CI/CD

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Manual deploy trigger | Have | Trigger deployment from UI |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Git provider integrations | Critical | GitHub App (deepest), GitLab, Bitbucket, Gitea, Gogs, Forgejo, custom Git servers |
| Auto-deploy on push | High | Webhook-triggered deployment on push to configured branch |
| Preview deployments on PRs | High | Auto-deploy PR branches, auto-cleanup on merge, PR comments with deploy URL |
| Rollback | High | Revert to previous deployment from locally cached images |
| Deploy by tag | Medium | Target specific git tags for deployment |
| GitHub Actions integration | Medium | Build in GH Actions, trigger Coolify redeploy via API |
| Webhook management | Medium | Custom webhook URLs per resource with secrets |
| Deploy via API | Medium | Programmatic deployment triggers |
| Branch-specific deployment | Medium | Configure which branch triggers auto-deploy |

---

## 8. Notifications

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Webhook notifications | Have | Custom HTTP endpoint |
| Email (SMTP) | Have | SMTP configuration |
| Slack | Have | Slack channel notifications |
| Discord | Have | Discord webhook notifications |
| Test notification channels | Have | Send test notification |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Telegram | Low | Telegram bot notifications |
| Mattermost | Low | Mattermost webhook |
| Pushover | Low | Push notifications to mobile |
| Per-event subscription | High | Subscribe specific channels to specific events (e.g., failures to email, successes to Slack) |
| Server disk usage alerts | Medium | Alert when disk exceeds threshold |
| Backup success/failure alerts | Medium | Notify on backup outcomes |
| Server reachable/unreachable alerts | Medium | Notify on server health changes |
| Scheduled task failure alerts | Low | Notify when cron tasks fail |
| Resend integration | Low | Alternative to SMTP for email |

---

## 9. Settings & Configuration

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Base domain configuration | Have | |
| Platform name | Have | |
| Recovery email | Have | |
| Timezone selection | Have | |
| Backup location management (S3) | Have | |
| Version info / update checks | Have | |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Auto-update toggle + schedule | Medium | Automatic updates on a cron schedule |
| Registration enable/disable | High | Control whether new users can register |
| OAuth provider configuration | High | Configure OAuth client IDs/secrets per provider |
| DNS validation toggle | Low | Disable for reverse proxy or tunnel setups |
| Instance backup to S3 | High | Backup the entire Icefall instance (DB + config) to S3 |
| Instance restore from backup | High | Restore from S3 backup |
| Port range config (TCP proxy) | Low | Define range for on-demand TCP proxy ports |

---

## 10. Organization & Navigation

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Onboarding wizard | Have | First-time setup flow |
| App grid on dashboard | Have | Overview of all apps |
| Sidebar navigation | Have | 6 primary sections |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| Projects | High | Group apps, databases, and services into projects |
| Environments per project | High | Production, staging, development, custom environments within each project |
| Tags | Medium | Label and filter resources across the platform |
| Command palette | Medium | Global search with quick commands (type "new postgresql" etc.) |
| Shared variables (hierarchical) | Medium | Team > project > environment > resource variable inheritance |
| Breadcrumb navigation with dropdown switching | Low | Quick-switch between projects/environments from breadcrumbs |

---

## 11. Docker & Container Features

### What We Have

Nothing specific beyond what the Rust backend handles internally.

### What Coolify Has

| Feature | Priority | Description |
|---|---|---|
| Docker Compose build pack | High | Full compose file support with isolated networks |
| Raw Compose mode | Medium | Minimal Coolify intervention, advanced users |
| Docker Swarm (experimental) | Low | Cluster deployment across multiple nodes |
| Container registry management | Medium | Push built images to any registry with custom tags |
| Custom Docker network definition | Low | Define networks via environment variables |
| Docker credentials management | Medium | Authenticate with private registries |

---

## 12. Security Features

### What We Have

| Feature | Status | Notes |
|---|---|---|
| Email/password login | Have | |
| Role-based access | Have | Admin, deployer, viewer |
| API token auth | Have | Bearer tokens |

### What Coolify Has That We Don't

| Feature | Priority | Description |
|---|---|---|
| OAuth SSO | High | GitHub, GitLab, Google, Azure, Bitbucket |
| Two-Factor Authentication (2FA) | High | TOTP + backup codes |
| Granular token abilities | Medium | Read / write / deploy scoping |
| SSH key management | Medium | Generate/import keys, assign to servers |
| Build secrets (never in image layers) | Low | `--mount=type=secret` during builds |
| Isolated Docker networks per stack | Medium | Automatic network isolation |
| Traefik security middlewares | Medium | Rate limiting, IP whitelisting, security headers |

---

## 13. Additional Coolify Features Not Categorized Above

| Feature | Priority | Description |
|---|---|---|
| CLI tool (Go-based) | Low | Command-line management of apps, databases, deployments, servers |
| Admin commands via Docker exec | Low | Root password reset, email change, stuck service removal |
| Coolify Cloud (managed offering) | N/A | Subscription-based hosted version — not applicable to self-hosted |
| Hetzner Cloud integration | Medium | Direct API integration for automated server provisioning |

---

## Top Priority Implementation Roadmap

Based on impact and effort, here are the recommended implementation phases:

### Phase 1 — Container Lifecycle & Core Controls
_Highest impact, builds on existing architecture_

1. **Start/stop/restart controls** — for both apps and databases
2. **Rollback to previous deploy** — using cached Docker images
3. **Health checks** — configurable path, status code, interval
4. **Resource limits** — CPU and memory constraints per container
5. **Registration enable/disable** — basic admin control

### Phase 2 — CI/CD Foundation
_Unlocks automated workflows_

6. **Auto-deploy on push** — webhook receiver for git push events
7. **Git provider integrations** — GitHub App as first target (deepest integration)
8. **Deploy via API** — programmatic deployment triggers
9. **Webhook management** — per-resource webhook URLs with secrets
10. **Per-event notification subscription** — choose which events trigger which channels

### Phase 3 — Organization & Multi-Tenancy
_Scales to teams and complex setups_

11. **Projects** — group resources into projects
12. **Environments** — production/staging/dev per project
13. **Teams** — multi-tenant resource isolation
14. **OAuth SSO** — GitHub + Google as first targets
15. **Two-Factor Authentication (2FA)** — TOTP with backup codes

### Phase 4 — Advanced Deployment
_Supports more deployment patterns_

16. **Docker Compose support** — multi-container stacks
17. **Deploy pre-built Docker images** — pull from any registry
18. **Multiple build packs** — Nixpacks, Static, Dockerfile, Compose, Image
19. **Preview deployments** — auto-deploy PRs with auto-cleanup
20. **Rolling updates** — zero-downtime deployments

### Phase 5 — Multi-Server & Infrastructure
_Enterprise-grade infrastructure management_

21. **Multi-server support** — manage remote servers via SSH
22. **Reverse proxy management** — Traefik/Caddy config from UI
23. **Server provisioning** — Hetzner API integration
24. **Browser-based terminal** — SSH into servers and containers
25. **Load balancing** — distribute traffic across servers

### Phase 6 — Ecosystem
_Platform completeness_

26. **One-click service marketplace** — start with top 20-30 most popular services
27. **Command palette** — global search and quick actions
28. **Instance backup/restore** — backup entire Icefall to S3
29. **Log drains** — ship logs to Axiom, Grafana, etc.
30. **Cloudflare Tunnel integration** — zero-config networking

---

## Icefall Advantages Over Coolify

Things Icefall does that Coolify doesn't (or does differently):

| Feature | Notes |
|---|---|
| Rust backend | Significantly lower resource usage than Laravel/PHP |
| SQLite database | Simpler deployment, no PostgreSQL + Redis dependency |
| Card/table view toggle for server metrics | UI flexibility Coolify lacks |
| MongoDB JSON document viewer | Built-in document browsing |
| Database query builder | Direct query execution from dashboard |
| Sparkline + uptime timeline components | Compact metric visualization |
| SSE-based real-time updates | Lighter than WebSocket for one-way streams |

---

## Sources

- Coolify Official Docs: https://coolify.io/docs/
- Coolify GitHub: https://github.com/coollabsio/coolify (52k+ stars)
- Coolify API Reference: https://coolify.io/docs/api-reference/api/
- Coolify Services List: https://coolify.io/docs/services/all
- Coolify CLI: https://github.com/coollabsio/coolify-cli
