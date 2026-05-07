# Icefall — Project Board

> Last updated: 2026-05-07

---

## Backlog

### Phase 2 — Build Engine
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-008](tickets/phase-2-build-engine/IF-008-framework-detection.md) | Framework detection engine | Critical | M | IF-001 |
| [IF-009](tickets/phase-2-build-engine/IF-009-dockerfile-builder.md) | Dockerfile generation per framework | Critical | L | IF-008 |
| [IF-010](tickets/phase-2-build-engine/IF-010-image-builder.md) | Docker image build orchestrator | Critical | M | IF-004, IF-008, IF-009, IF-002 |

### Phase 3 — Deployment Pipeline
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-011](tickets/phase-3-deployment-pipeline/IF-011-container-deploy.md) | Container deployment & lifecycle | Critical | M | IF-004, IF-005, IF-010, IF-002 |
| [IF-012](tickets/phase-3-deployment-pipeline/IF-012-webhook-receiver.md) | Git webhook receiver | Critical | M | IF-006, IF-010, IF-011 |
| [IF-013](tickets/phase-3-deployment-pipeline/IF-013-preview-environments.md) | Preview environments | High | M | IF-011, IF-012, IF-002 |
| [IF-014](tickets/phase-3-deployment-pipeline/IF-014-env-var-management.md) | Environment variable management | Critical | M | IF-002, IF-006 |
| [IF-015](tickets/phase-3-deployment-pipeline/IF-015-sse-build-streaming.md) | SSE event streaming | High | M | IF-006, IF-010 |

### Phase 4 — Web Dashboard
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-016](tickets/phase-4-web-dashboard/IF-016-astro-project-setup.md) | Astro + Preact project setup | Critical | S | IF-006 |
| [IF-017](tickets/phase-4-web-dashboard/IF-017-dashboard-home.md) | Dashboard home page | High | M | IF-016, IF-006 |
| [IF-018](tickets/phase-4-web-dashboard/IF-018-app-create-flow.md) | App creation flow | Critical | M | IF-016, IF-008, IF-010, IF-014 |
| [IF-019](tickets/phase-4-web-dashboard/IF-019-app-detail-page.md) | App detail page | High | L | IF-016, IF-017, IF-006 |
| [IF-020](tickets/phase-4-web-dashboard/IF-020-env-var-editor.md) | Environment variable editor UI | High | M | IF-016, IF-014 |
| [IF-021](tickets/phase-4-web-dashboard/IF-021-log-viewer.md) | Log viewer component | High | M | IF-016, IF-015 |
| [IF-022](tickets/phase-4-web-dashboard/IF-022-deploy-view.md) | Deploy view with build steps | High | M | IF-016, IF-015, IF-010 |

### Phase 5 — Domains & Proxy
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-023](tickets/phase-5-domains-proxy/IF-023-domain-management.md) | Domain management | High | M | IF-005, IF-006, IF-002 |
| [IF-024](tickets/phase-5-domains-proxy/IF-024-wildcard-domain-setup.md) | Base domain & wildcard setup | High | S | IF-005, IF-003 |

### Phase 6 — Monitoring
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-025](tickets/phase-6-monitoring/IF-025-health-checks.md) | Health check system | High | M | IF-004, IF-002, IF-015 |
| [IF-026](tickets/phase-6-monitoring/IF-026-container-metrics.md) | Container metrics collection | Medium | M | IF-004, IF-015 |
| [IF-027](tickets/phase-6-monitoring/IF-027-log-search.md) | Log storage and search | Medium | M | IF-004, IF-002 |
| [IF-028](tickets/phase-6-monitoring/IF-028-uptime-timeline-ui.md) | Uptime timeline UI | Medium | S | IF-025, IF-019 |

### Phase 7 — Databases
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-029](tickets/phase-7-databases/IF-029-managed-database-provisioning.md) | Managed database provisioning | High | L | IF-004, IF-002, IF-014 |
| [IF-030](tickets/phase-7-databases/IF-030-database-backups.md) | Automated database backups | High | M | IF-029, IF-004 |
| [IF-031](tickets/phase-7-databases/IF-031-database-ui.md) | Database management UI | High | M | IF-016, IF-029, IF-030 |

### Phase 8 — Auth & API
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-032](tickets/phase-8-auth-api/IF-032-authentication.md) | Authentication system | Critical | L | IF-002, IF-006 |
| [IF-033](tickets/phase-8-auth-api/IF-033-oauth-github-gitlab.md) | OAuth (GitHub/GitLab) | Medium | M | IF-032 |
| [IF-034](tickets/phase-8-auth-api/IF-034-user-management.md) | User management & roles | High | M | IF-032, IF-016 |
| [IF-035](tickets/phase-8-auth-api/IF-035-api-tokens.md) | API token management | High | S | IF-032, IF-006 |
| [IF-036](tickets/phase-8-auth-api/IF-036-openapi-spec.md) | OpenAPI specification | Medium | S | IF-006 |

### Phase 9 — CLI
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-037](tickets/phase-9-cli/IF-037-cli-deploy-command.md) | CLI deploy command | High | M | IF-001, IF-035, IF-010 |
| [IF-038](tickets/phase-9-cli/IF-038-cli-management-commands.md) | CLI management commands | High | M | IF-001, IF-035 |
| [IF-039](tickets/phase-9-cli/IF-039-cli-update-command.md) | CLI self-update | Medium | S | IF-001 |

### Phase 10 — Install & Migration
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-040](tickets/phase-10-install-migration/IF-040-install-script.md) | Installation script | High | M | IF-007 |
| [IF-041](tickets/phase-10-install-migration/IF-041-server-migration-export-import.md) | Server migration (export/import) | Medium | L | IF-002, IF-004, IF-029, IF-030 |
| ~~[IF-042](tickets/phase-10-install-migration/IF-042-setup-wizard.md)~~ | ~~First-run setup wizard~~ — **Superseded by Phase 13 (IF-050–IF-058)** | — | — | — |

### Phase 11 — MCP & Notifications
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-043](tickets/phase-11-mcp-notifications/IF-043-notification-system.md) | Notification system | Medium | M | IF-002, IF-006 |
| [IF-044](tickets/phase-11-mcp-notifications/IF-044-mcp-server.md) | MCP server | Medium | M | IF-006, IF-035 |
| [IF-045](tickets/phase-11-mcp-notifications/IF-045-settings-page.md) | Global settings page | Medium | M | IF-016, IF-032 |

### Phase 12 — Landing Page & Documentation
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-046](tickets/phase-12-landing-docs/IF-046-landing-page.md) | Landing page (icefall.dev) | High | M | — |
| [IF-047](tickets/phase-12-landing-docs/IF-047-documentation-site.md) | Documentation site | High | L | IF-046, IF-036 |
| [IF-048](tickets/phase-12-landing-docs/IF-048-framework-guides.md) | Per-framework deployment guides | Medium | M | IF-047 |
| [IF-049](tickets/phase-12-landing-docs/IF-049-social-assets.md) | Logo, social card & brand assets | Medium | S | — |

### Phase 13 — Onboarding
| Ticket | Title | Priority | Size | Dependencies |
|--------|-------|----------|------|--------------|
| [IF-050](tickets/phase-13-onboarding/IF-050-onboarding-state-machine.md) | Onboarding state machine & route guard | Critical | M | IF-002, IF-006, IF-007 |
| [IF-051](tickets/phase-13-onboarding/IF-051-onboarding-ui-shell.md) | Onboarding UI shell & step navigation | Critical | M | IF-050, IF-016 |
| [IF-052](tickets/phase-13-onboarding/IF-052-step-admin-account.md) | Step 1 — Create admin account | Critical | M | IF-050, IF-051, IF-032 |
| [IF-053](tickets/phase-13-onboarding/IF-053-step-server-check.md) | Step 2 — Server environment check | Critical | M | IF-050, IF-051, IF-004 |
| [IF-054](tickets/phase-13-onboarding/IF-054-step-base-domain.md) | Step 3 — Base domain configuration | High | M | IF-050, IF-051, IF-005, IF-023 |
| [IF-055](tickets/phase-13-onboarding/IF-055-step-git-provider.md) | Step 4 — Connect Git provider | High | M | IF-050, IF-051, IF-033, IF-012 |
| [IF-056](tickets/phase-13-onboarding/IF-056-step-first-app.md) | Step 5 — Create first app | Critical | M | IF-050, IF-051, IF-018, IF-008 |
| [IF-057](tickets/phase-13-onboarding/IF-057-step-first-deploy.md) | Step 6 — Watch first deploy | Critical | M | IF-050, IF-051, IF-011, IF-015, IF-022 |
| [IF-058](tickets/phase-13-onboarding/IF-058-onboarding-completion.md) | Onboarding completion & dashboard handoff | High | S | IF-050, IF-057, IF-017 |

---

## In Progress

| Ticket | Title | Assignee | Started |
|--------|-------|----------|---------|
| — | — | — | — |

---

## In Review

| Ticket | Title | Reviewer | PR |
|--------|-------|----------|----|
| — | — | — | — |

---

## Done

### Phase 1 — Foundation
| Ticket | Title | Completed | Notes |
|--------|-------|-----------|-------|
| [IF-001](tickets/phase-1-foundation/IF-001-rust-project-scaffold.md) | Rust project scaffold | 2026-05-07 | Full Cargo.toml, binary crate, Clap CLI with all subcommands |
| [IF-002](tickets/phase-1-foundation/IF-002-database-schema-sqlite.md) | Database schema & SQLite setup | 2026-05-07 | 11 migrations, 40+ trait methods, AES-256-GCM encryption with tests |
| [IF-003](tickets/phase-1-foundation/IF-003-config-system.md) | Configuration system | 2026-05-07 | TOML loading, env var overrides, validation, defaults |
| [IF-004](tickets/phase-1-foundation/IF-004-docker-client.md) | Docker Engine client | 2026-05-07 | Full Bollard wrapper — containers, images, networks, volumes, stats, logs |
| [IF-005](tickets/phase-1-foundation/IF-005-caddy-client.md) | Caddy admin API client | 2026-05-07 | Route CRUD, wildcard support, operation queue with retry |
| [IF-006](tickets/phase-1-foundation/IF-006-rest-api-skeleton.md) | REST API skeleton (Axum) | 2026-05-07 | Router, middleware (tracing/CORS/request IDs), error types, all route stubs |
| [IF-007](tickets/phase-1-foundation/IF-007-daemon-lifecycle.md) | Daemon lifecycle management | 2026-05-07 | Full startup sequence, PID file, signal handling, systemd unit generation |

---

## Summary

| Metric | Count |
|--------|-------|
| Total tickets | 57 |
| Done | 7 |
| Backlog | 49 |
| Superseded | 1 |
| Phases complete | 1 / 13 |

### Progress
| Phase | Status | Tickets |
|-------|--------|---------|
| 1 — Foundation | **Done** | 7/7 |
| 2 — Build Engine | Backlog | 0/3 |
| 3 — Deployment Pipeline | Backlog | 0/5 |
| 4 — Web Dashboard | Backlog | 0/7 |
| 5 — Domains & Proxy | Backlog | 0/2 |
| 6 — Monitoring | Backlog | 0/4 |
| 7 — Databases | Backlog | 0/3 |
| 8 — Auth & API | Backlog | 0/5 |
| 9 — CLI | Backlog | 0/3 |
| 10 — Install & Migration | Backlog | 0/2 (+1 superseded) |
| 11 — MCP & Notifications | Backlog | 0/3 |
| 12 — Landing & Docs | Backlog | 0/4 |
| 13 — Onboarding | Backlog | 0/9 |

### Size breakdown
| Size | Count | Estimated effort |
|------|-------|-----------------|
| S | 9 | 1-2 days each |
| M | 39 | 3-5 days each |
| L | 9 | 1-2 weeks each |

### Critical path (must complete in order)
```
IF-001 → IF-002 → IF-006 → IF-032 (auth)
IF-001 → IF-004 (docker) → IF-010 (build) → IF-011 (deploy) → IF-012 (webhooks)
IF-001 → IF-008 (detect) → IF-009 (dockerfile) → IF-010 (build)
IF-001 → IF-003 (config) → IF-005 (caddy) → IF-023 (domains)
IF-006 → IF-016 (dashboard) → IF-017 (home) → IF-019 (app detail)
IF-050 (onboarding state) → IF-051 (UI shell) → IF-052…IF-057 (steps) → IF-058 (completion)
```
