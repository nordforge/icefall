# IF-047: Documentation site

**Phase:** 12 — Landing & Docs
**Priority:** High
**Estimate:** L

## Description

Comprehensive documentation site at `icefall.dev/docs` covering installation, configuration, usage, and API reference.

## Acceptance Criteria

- [ ] Built with Starlight (Astro's docs framework) or plain Astro with content collections
- [ ] Sidebar navigation with sections:
  - **Getting Started**
    - Introduction (what is Icefall, who is it for)
    - Installation (one-liner, manual, requirements)
    - Quick start (deploy your first app in 5 minutes)
    - Setup wizard walkthrough
  - **Core Concepts**
    - Architecture overview
    - How builds work (detection → Dockerfile → image → container)
    - Environments (production, preview)
    - Domain routing (wildcard, custom, sslip.io)
  - **Apps**
    - Creating an app (UI + CLI)
    - Git integration (webhooks, auto-deploy)
    - Framework guides (Astro, Next.js, React, Vue, Nuxt, Node.js, Docker)
    - Build configuration (overrides, custom Dockerfiles)
    - Environment variables (scopes, import, best practices)
  - **Databases**
    - Provisioning (Postgres, MySQL, Redis, MongoDB)
    - Connecting to apps
    - Backups & restore
    - External access
  - **Domains & SSL**
    - Base domain setup
    - Custom domains
    - DNS verification
    - Wildcard configuration
  - **Monitoring**
    - Build logs
    - Runtime logs
    - Health checks
    - Container metrics
  - **Notifications**
    - SMTP setup
    - Webhook integration
    - Plunk setup
    - Per-app notification rules
  - **Authentication**
    - Admin setup
    - User roles (admin, deployer, viewer)
    - OAuth (GitHub, GitLab)
    - API tokens
  - **CLI Reference**
    - All commands with examples
    - Configuration (`.icefall.toml`, credentials)
    - CI/CD integration examples
  - **API Reference**
    - Auto-generated from OpenAPI spec (IF-036)
    - Authentication
    - Endpoint documentation with examples
  - **MCP Server**
    - Setup for Claude Code
    - Setup for other MCP clients
    - Available tools
  - **Server Management**
    - Updates
    - Migration (export/import)
    - Resource management
    - Troubleshooting
  - **Contributing**
    - Development setup
    - Architecture guide for contributors
    - Code style / conventions
- [ ] Search functionality (Pagefind or similar, client-side)
- [ ] Light and dark theme matching landing page
- [ ] Code blocks with syntax highlighting and copy button
- [ ] "Edit this page" links to GitHub
- [ ] Breadcrumb navigation
- [ ] Mobile responsive sidebar (collapsible)
- [ ] Previous/Next page navigation at bottom

## Dependencies

- IF-046 (shares design/layout with landing page)
- IF-036 (API reference auto-generated from OpenAPI spec)
