# Icefall Feature Roadmap — v1.0 vs Future

> Generated: 2026-05-08
> Based on: [Coolify comparison](.claude/coolify-feature-comparison.md), backend code audit, and multi-perspective analysis
>
> **Design principle:** Icefall is not "Coolify in Rust." It's "the PaaS that runs where Coolify can't." A single binary, SQLite, no ecosystem tax. Every feature must reinforce this identity or be deferred.

---

## Context: What the Backend Already Has

A critical finding from the code audit: **the Rust backend is significantly ahead of the dashboard.** These features are fully implemented and working but have no UI:

| Feature | Backend Status | Files |
|---|---|---|
| Auto-deploy on push (GitHub + GitLab webhooks) | Fully built | `src/api/routes/webhooks.rs` |
| Preview environments (auto PR deploys) | Fully built | `src/deploy/preview.rs` |
| Health checks + auto-restart | Fully built | `src/monitoring/health_runner.rs` |
| Resource limits (CPU/memory) | Fully built | `src/deploy/manager.rs` |
| CLI (deploy, apps, env, domains, db, logs, migrate) | Fully built | `src/cli/` |
| MCP server (13 tools, role-based) | Fully built | `src/api/routes/mcp.rs` |
| Server migration export/import + S3 | Fully built | `src/cli/commands/migrate.rs` |
| Container metrics (ring buffer, 10s polling) | Fully built | `src/monitoring/metrics_collector.rs` |
| Notification event types + rules engine | Fully built | `src/api/routes/notifications.rs` |
| Zero-downtime deployments | Fully built | `src/deploy/manager.rs` |

Surfacing these in the dashboard is the highest-ROI work available. The backend investment is already paid — the UI is what makes it real to users.

---

## v1.0 — Ship These

### Tier 1: Surface Existing Backend (UI Work Only)

These features are already working in Rust. The work is building dashboard islands and wiring them to existing API endpoints.

#### 1. Start / Stop / Restart Controls
- **Why v1.0:** Every PaaS user expects this. Currently there's a "Stop App" button in settings that does nothing. Users will file this as a bug. The Docker client already has `stop_container`, `start_container`, and `restart_container`.
- **Scope:** Action buttons in the app overview tab + database detail. Confirmation modal for stop. Status indicator updates via SSE.
- **Effort:** S (1-2 days)

#### 2. Health Check UI
- **Why v1.0:** Backend runs health checks and auto-restarts containers, but users can't see any of it. Health status, check history, and configuration should be visible in the app detail page.
- **Scope:** Health status badge in overview tab. Health check configuration (interval, timeout, path) in settings tab. Health event history in a new section or the deploys tab. Wire to existing `GET /apps/{id}/health` endpoint.
- **Effort:** M (3-5 days)

#### 3. Resource Limits UI
- **Why v1.0:** Without visible resource limits, a runaway container OOMs the host and takes down every other app. The deploy manager already accepts `memory_bytes` and `cpu_shares` — users just need a way to set them.
- **Scope:** CPU and memory limit fields in app settings tab. Sensible defaults shown. Warning when no limits are set. Wire to existing `resource_limits` JSON field on the app model.
- **Effort:** S (1-2 days)

#### 4. Auto-Deploy Toggle (Webhooks)
- **Why v1.0:** The webhook receiver is fully built with HMAC-SHA256 validation. Without a dashboard toggle and webhook URL display, users have to read docs and configure it manually via API. This is the single most-requested feature in every PaaS.
- **Scope:** Toggle in app settings: "Auto-deploy on push." When enabled, show the webhook URL and secret for GitHub/GitLab. Optionally show a "copy webhook URL" button. The actual webhook handling is done — this is purely UI.
- **Effort:** S (1-2 days)

#### 5. Preview Environment UI
- **Why v1.0:** Auto-create/destroy on PR open/close is fully built. Pattern matching (glob), subdomain generation, cleanup — all working. But users can't enable it or see active previews. This is a genuine differentiator over Coolify when it works seamlessly.
- **Scope:** Toggle in app settings: "Enable preview deployments." Pattern input (e.g., `feature/*`). List of active preview environments with their URLs. Auto-cleanup status.
- **Effort:** M (3-5 days)

#### 6. Persistent Storage / Volumes UI
- **Why v1.0:** Any stateful workload (CMS, file uploads, SQLite apps) loses data on redeploy without volume mounts. This is a reputation-ending gap. The Docker client supports volumes natively.
- **Scope:** Volume mount configuration in app settings: container path + host path (or named volume). Simple list with add/remove. No complex storage abstraction — just Docker volume mounts.
- **Effort:** M (3-5 days)

---

### Tier 2: Complete Critical Gaps

These require new backend work but are essential for a credible v1.0.

#### 7. Deploy Pre-Built Docker Images
- **Why v1.0:** A PaaS that only deploys from git repos is a CI/CD tool, not a PaaS. Half of self-hosted apps ship as Docker images (Ghost, Plausible, Uptime Kuma, Umami). The `DeployManager::deploy` already accepts an `image_ref` — the missing piece is a UI flow that skips the build step.
- **Scope:** New option in app creation: "Deploy Docker Image" alongside "Deploy from Git." Image URL input, tag selection, optional registry auth. Environment variables and port mapping. No Docker Compose — single image only.
- **Effort:** M (3-5 days)

#### 8. Container Rollback
- **Why v1.0:** One bad deploy with no rollback means SSH + manual Docker commands. The deploy manager keeps previous images. `DeployError::Rollback` is already defined but execution isn't built.
- **Scope:** "Rollback" button on each deploy in the deploy history. Redeploys the previous image with the previous env vars. Simple — not a full versioning system.
- **Effort:** M (3-5 days)

#### 9. Finish SMTP Notifications
- **Why v1.0:** The notification dispatch currently logs "SMTP notification..." and returns `Ok(())`. Wire up actual sending via `lettre` crate. SMTP is the universal notification channel — every developer has email.
- **Scope:** Replace the SMTP stub in `notifications.rs` with actual `lettre` SMTP sending. Config fields already exist in settings. Test endpoint already works for webhooks — extend to SMTP.
- **Effort:** S (1-2 days)

#### 10. Finish Slack + Discord Notifications
- **Why v1.0:** Both are incoming webhook POSTs with a JSON payload — structurally identical to the webhook dispatch that already works. The config fields exist in the settings page. Not shipping these when the UI already has the forms is confusing.
- **Scope:** Format notification payload as Slack Block Kit / Discord embed. POST to the configured webhook URL. The webhook dispatch function is the template.
- **Effort:** S (1-2 days)

#### 11. Path-Based Routing
- **Why v1.0:** Users who need `/api` on one service and `/` on another literally cannot use Icefall without this. Caddy's `route` directive handles path matching natively — the integration already supports it.
- **Scope:** Optional path field on domain configuration. Caddy route generation includes path matcher. Priority: longer paths match first.
- **Effort:** S (1-2 days)

#### 12. Instance Backup to S3
- **Why v1.0:** The CLI already has `icefall migrate export` which creates a full backup (SQLite + config + database dumps + volumes). Add a scheduled job and an S3 upload step. If a user's VPS dies and they lose all app configs with no backup, that's catastrophic.
- **Scope:** Settings page: enable instance backup, S3 destination (reuse existing S3 config), cron schedule. Background job calls the existing export logic + uploads to S3. Restore remains CLI-only for v1.0.
- **Effort:** M (3-5 days)

---

### Tier 3: Polish for Launch

#### 13. Per-Event Notification Subscriptions
- **Why v1.0:** The notification rules API already exists (`/apps/{app_id}/notifications`) with event types (`deploy.success`, `deploy.failure`, `health.down`, `backup.failure`). The backend supports per-app, per-event rules. Without this UI, users get all notifications or none.
- **Scope:** Simple checkboxes per channel: which events trigger which channel. Reuse the existing rules API. No per-app override UI yet — just global defaults.
- **Effort:** S (1-2 days)

#### 14. Tags
- **Why v1.0:** Once someone has 5+ apps, the flat grid becomes unnavigable. A `tags` text column on the apps table, filter chips in the AppGrid. Tiny effort, meaningful UX.
- **Scope:** Tag input on app settings. Tag filter chips on dashboard home. No tag management page — just freeform text tags.
- **Effort:** S (1-2 days)

---

**v1.0 Total: 14 features**
- 6 surface existing backend (mostly UI)
- 6 new features (modest backend work)
- 2 polish items

**Estimated effort: ~6-8 weeks** for one developer, given that half the features are UI work on top of existing APIs.

---

## v1.1 — Fast Follow (1-3 Months Post-Launch)

Features that matter but aren't launch blockers. Ship these quickly to keep momentum.

#### 15. Docker Compose Support
- **Why v1.1, not v1.0:** Compose files have volumes, networks, depends_on, healthchecks, build contexts, extend, profiles, and variable interpolation. The current architecture deploys single containers. Compose support means a new deployment pipeline path. Every edge case becomes a support ticket. Pre-built Docker image deploy (v1.0 feature 7) covers the 80% case — users can deploy individual services from Docker Hub without Compose.
- **Scope:** Parse `docker-compose.yml`, create isolated bridge network per stack, deploy services with inter-service DNS. Start with a "known-good" subset of Compose features. Raw Compose mode (pass-through to Docker) as escape hatch.
- **Effort:** L (1-2 weeks)

#### 16. Projects (Resource Grouping)
- **Why v1.1:** Organizational structure for users with many apps. A `project_id` foreign key on apps, a project list page, and grouping in the sidebar. Don't ship environment promotion workflows, cloning, or environment-scoped secrets — just grouping.
- **Scope:** Project CRUD. App assignment to projects. Sidebar groups apps by project. Default "Personal" project.
- **Effort:** M (3-5 days)

#### 17. Two-Factor Authentication (2FA)
- **Why v1.1, not v1.0:** No TOTP code exists in the codebase. Security features done halfway are worse than none — a broken 2FA gives false confidence. Most Icefall users will self-host behind a VPN or Tailnet. Ship it soon after launch once it's properly tested.
- **Scope:** TOTP setup flow (QR code + manual entry), backup codes, 2FA enforcement per user, admin ability to reset 2FA.
- **Effort:** M (3-5 days)

#### 18. OAuth SSO (GitHub + Google)
- **Why v1.1, not v1.0:** Zero OAuth code exists in the backend. This is PKCE flows, token refresh, account linking, session migration — not a weekend project. Current email/password auth works. Two-factor (feature 17) addresses the security concern first.
- **Scope:** GitHub OAuth (most users) + Google OAuth (broadest coverage). Account linking for existing users. Optional: require SSO for all users.
- **Effort:** L (1-2 weeks)

#### 19. Container Terminal (Browser Shell)
- **Why v1.1:** Developers love it for debugging. It's a "wow" feature that earns word-of-mouth. But it's a WebSocket TTY proxy with resize handling and per-connection auth — security surface area that needs careful implementation.
- **Scope:** `docker exec` via WebSocket in an xterm.js terminal. Read-only option for viewer role. Container selection dropdown.
- **Effort:** M (3-5 days)

#### 20. Command Palette
- **Why v1.1:** Once the platform has projects, tags, and 10+ apps, quick navigation matters. Keyboard-driven global search with actions ("deploy app-name", "restart db-name").
- **Scope:** `Cmd+K` palette. Search apps, databases, recent deploys. Quick actions: deploy, restart, view logs.
- **Effort:** M (3-5 days)

---

## v1.2 — Expansion (3-6 Months Post-Launch)

Features that broaden the platform's reach without changing its architecture.

#### 21. Environments per Project
- **Why v1.2:** Builds on projects (v1.1). Production, staging, development environments within each project. Environment-scoped variables that inherit with override.
- **Scope:** Environment CRUD within projects. Shared variables at environment level. App assignment to environments. Variable inheritance: project > environment > app.
- **Effort:** L (1-2 weeks)

#### 22. One-Click Service Templates
- **Why v1.2, not earlier:** Requires Docker Compose support (v1.1) as the deployment mechanism. Start with the top 20-30 most popular services: Plausible, Umami, Uptime Kuma, Ghost, Gitea, n8n, Vaultwarden, Meilisearch, MinIO, Metabase. Community-contributed templates via a public repo.
- **Scope:** Template format (Compose + metadata + defaults). Template browser in app creation. Version tracking for updates.
- **Effort:** L (1-2 weeks) for the system, then ongoing for templates

#### 23. Reverse Proxy Management UI
- **Why v1.2:** Caddy integration works well under the hood. Exposing raw config in the UI means users can break routing and lock themselves out. Only add this once the domain management UI has been battle-tested.
- **Scope:** Read-only Caddy config viewer. Advanced mode for editing custom directives. Middleware presets (rate limiting, basic auth, redirect rules). Reset-to-defaults safety net.
- **Effort:** M (3-5 days)

#### 24. Log Drains
- **Why v1.2:** The log storage system works for viewing and search. Streaming to external services (Grafana Loki, Axiom, Datadog) is an integration matrix that grows the support surface.
- **Scope:** Per-app log drain configuration. FluentBit sidecar or direct HTTP shipping. Start with one provider (Grafana Loki or Axiom) and generic HTTP.
- **Effort:** L (1-2 weeks)

#### 25. Cloudflare Tunnel Integration
- **Why v1.2:** Nice shortcut for users behind NAT, but it's a single vendor's proprietary API. Document the manual setup for v1.0/v1.1, then add a guided setup flow.
- **Scope:** Tunnel token input in settings. Auto-configure Cloudflare tunnel per app/domain. Zero-port-forwarding deployment.
- **Effort:** M (3-5 days)

#### 26. Automated Docker Cleanup
- **Why v1.2:** Disk fills up on long-running servers with many deploys. Threshold-based and scheduled cleanup of unused images, containers, volumes, and networks.
- **Scope:** Settings: disk threshold %, cleanup schedule (cron), what to clean (images, volumes, networks). Skip cleanup during active deployments.
- **Effort:** S (1-2 days)

---

## v2.0 — Architecture Evolution (6-12 Months)

Features that require fundamental architecture changes. These transform Icefall from a single-server tool to a platform.

#### 27. Multi-Server Support
- **Why v2.0:** The entire architecture is single-server. SQLite is a single file. The deploy manager talks to a local Docker socket. Multi-server means SSH connections, remote Docker API, agent distribution, network topology, and fundamentally different state management. This isn't a feature — it's a rewrite of the deployment layer.
- **Scope:** Remote server registration with SSH key auth. Remote Docker deployment. Server health monitoring. App-to-server assignment. Potentially a move from SQLite to something replicable, or an agent-based architecture (like Coolify's Sentinel).
- **Effort:** XL (months)

#### 28. Teams / Multi-Tenancy
- **Why v2.0:** Touches every query in the database layer. Requires permission models, resource isolation, audit logs, team-scoped API tokens, and invitation flows. The current user model (admin/deployer/viewer) is fine for single-team use.
- **Scope:** Team CRUD. Resource ownership (team, not user). Team-scoped views. Cross-team resource sharing (opt-in). Invitation flows. Audit log.
- **Effort:** XL (months)

#### 29. Docker Swarm Support
- **Why v2.0:** Requires multi-server (feature 27) as a prerequisite. Cluster coordination, service mesh, rolling updates across nodes, registry distribution.
- **Scope:** Swarm init/join from UI. Service scaling. Node management. Registry integration.
- **Effort:** XL (months)

#### 30. Load Balancing
- **Why v2.0:** Only makes sense after multi-server. Distributing traffic across servers requires a fundamentally different networking model.
- **Scope:** Caddy upstream configuration. Server health-based routing. Sticky sessions optional.
- **Effort:** L (1-2 weeks, but depends on multi-server being done)

---

## Explicitly Deferred (No Timeline)

Features that don't fit Icefall's identity, have minimal user demand, or have a poor effort-to-value ratio.

| Feature | Reason |
|---|---|
| MariaDB / ClickHouse / KeyDB / DragonFly | Niche databases. Users who need these can deploy them as Docker images (v1.0 feature 7). |
| Telegram / Mattermost / Pushover notifications | Webhook notifications already cover all of these. Users configure their own webhook-to-Telegram bridge. Maintaining provider-specific integrations for <5% of users isn't worth it. |
| Server provisioning (Hetzner API) | Users provision servers 1-2 times per year. The Hetzner dashboard is fine. Adding cloud provider APIs is a vendor-specific maintenance burden. |
| Build server designation | Single-server architecture. Irrelevant until multi-server (v2.0). |
| Docker network/destination management | Low-level Docker plumbing that most users never touch. |
| Custom Traefik middlewares | Icefall uses Caddy, not Traefik. Caddy has a simpler config model. |
| Wildcard SSL certificates | Caddy handles SSL automatically. Wildcard certs via DNS challenge add complexity for a rare use case. |
| Magic link login | Low priority when OAuth (v1.1) covers the passwordless use case. |
| Git LFS / submodule support | Edge case. Document workarounds. |
| Build secrets (--mount=type=secret) | Niche Docker feature. ENV vars cover 95% of use cases. |
| WebSocket support toggle | Caddy proxies WebSocket by default. No toggle needed. |
| Registration enable/disable | Small feature but low urgency — the onboarding flow creates the first admin, and user invites are already gated by admin role. Add to v1.1 settings. |
| Resend integration | SMTP covers this. Resend has an SMTP relay mode. |

---

## Summary Timeline

```
v1.0 (Now → 6-8 weeks)
  Surface existing backend: start/stop/restart, health checks, resource limits,
    auto-deploy toggle, preview envs, volumes
  New: Docker image deploy, rollback, SMTP/Slack/Discord notifications,
    path routing, instance backup, notification subscriptions, tags

v1.1 (1-3 months post-launch)
  Docker Compose, projects, 2FA, OAuth, container terminal, command palette

v1.2 (3-6 months)
  Environments, one-click services, proxy UI, log drains, Cloudflare tunnels,
    Docker cleanup

v2.0 (6-12 months)
  Multi-server, teams/multi-tenancy, Docker Swarm, load balancing
```

---

## Icefall's Positioning

**Don't compete with Coolify feature-for-feature.** Coolify has 52k stars and a large community. Matching it at 80% of features while running worse means nobody switches.

**Instead, own the niche:** The best PaaS for solo developers and small teams running 1-10 apps on a single server. That means:
- Fastest deploy trigger-to-live time
- Lowest resource overhead (single binary + SQLite vs. PHP + PostgreSQL + Redis)
- CLI-first workflows that work from any terminal
- MCP integration for AI-assisted deployment (genuinely novel — no other PaaS has this)
- Preview environments that just work (PR open = deploy, merge = cleanup)

If someone needs multi-server orchestration, Docker Swarm, or 280+ one-click services, they should use Coolify. Icefall wins by being the tool that does less, faster, on less hardware.
