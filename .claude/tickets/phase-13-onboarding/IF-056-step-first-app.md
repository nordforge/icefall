# IF-056: Onboarding Step 5 — Create first app

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

Guided app creation that walks the user through deploying their first application. This is where the user goes from "I have a server" to "I have an app running." The flow adapts based on whether a Git provider was connected in the previous step.

## Acceptance Criteria

- [ ] Step is titled "Deploy your first app"
- [ ] Subtitle: "Let's get something running on your server."
- [ ] Two creation paths shown as selectable cards:

### Path A: From Git repository (shown if Git provider connected)
- [ ] "Import from Git" card — primary/recommended, shown first
- [ ] Repository search/selector:
  - Search input that queries connected provider's repos
  - Results show: repo name, org/user, last push date, language (if detectable)
  - Click to select
- [ ] After selecting repo:
  - Auto-detect framework (call framework detection engine)
  - Show detected framework with icon: "Detected: Astro" / "Detected: Next.js" / etc.
  - If detection fails: show dropdown to manually select framework
  - App name auto-generated from repo name (editable)
  - Branch selector defaulting to main/master
- [ ] "Create & Deploy" button that:
  - Creates the app in Icefall
  - Sets up webhook on the Git provider
  - Triggers first deploy immediately
  - Advances to Step 6 (first deploy) where they watch it build

### Path B: From template (always available)
- [ ] "Start from template" card — shown as alternative
- [ ] Template grid (3-4 starter templates):
  - **Static site** — simple HTML/CSS, fastest to deploy, good for testing
  - **Node.js API** — Express/Hono hello-world, demonstrates backend deploys
  - **Astro site** — SSG/SSR starter, demonstrates framework detection
  - **Dockerfile** — custom Dockerfile example, demonstrates container deploys
- [ ] Each template card shows: name, description, estimated build time, "Use this" button
- [ ] After selecting template:
  - App name input (pre-filled with template name, editable)
  - "Create & Deploy" button
  - Backend clones template repo into a temporary Git repo, creates app, triggers deploy

### Path C: Manual / CLI (minimal, not the guided path)
- [ ] Small text link at bottom: "Or deploy via CLI" -> shows `icefall deploy --path ./my-app` command
- [ ] This doesn't complete the step — they'd need to actually deploy via CLI for the step to mark complete

### Shared behavior
- [ ] App name validation: lowercase alphanumeric + hyphens, 3-63 chars, unique
- [ ] If base domain configured: show preview of app URL (e.g., `my-app.icefall.example.com`)
- [ ] If no base domain: show `http://{server-ip}:{auto-port}`
- [ ] Creating the app marks this step complete and immediately starts the deploy (advancing to Step 6)
- [ ] Backend: `POST /api/onboarding/app` creates app with source config, returns app ID + deploy ID

## Out of Scope

- Environment variable configuration (can be added after onboarding from the Env Vars tab)
- Custom domain per app (post-onboarding)
- Resource limit configuration (defaults are fine for first app)
- Database provisioning (separate flow post-onboarding)

## Dependencies

- IF-050 (state machine), IF-051 (UI shell), IF-018 (app creation), IF-008 (framework detection), IF-055 (Git provider, optional)
