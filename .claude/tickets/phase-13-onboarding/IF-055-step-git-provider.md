# IF-055: Onboarding Step 4 — Connect Git provider

**Phase:** 13 — Onboarding
**Priority:** High
**Estimate:** M

## Description

Optional step to connect a Git provider (GitHub, GitLab, or Gitea/Forgejo) for automatic deployments via webhooks. Skipping means the user will deploy manually via the CLI or dashboard. Connecting now means their first app can be set up with git-push deploys immediately.

## Acceptance Criteria

- [ ] Step is titled "Connect your Git provider"
- [ ] Subtitle: "Enable automatic deployments when you push code. You can skip this and deploy manually."
- [ ] This step is OPTIONAL — "Skip for now" button visible
- [ ] Three provider cards shown side by side:
  - **GitHub** — GitHub logo, "Connect GitHub" button, brief description "Auto-deploy from GitHub repositories"
  - **GitLab** — GitLab logo, "Connect GitLab" button, description "Auto-deploy from GitLab repositories"
  - **Self-hosted Git** — generic Git icon, "Configure" button, description "Gitea, Forgejo, or other Git servers"
- [ ] GitHub flow:
  - Clicking "Connect GitHub" initiates OAuth flow (opens popup/redirect)
  - After OAuth callback: show "Connected as @{username}" with green checkmark
  - Show list of accessible organizations/repos (optional, for validation)
  - Store GitHub access token encrypted in database
- [ ] GitLab flow:
  - Similar OAuth flow to GitHub
  - Support both gitlab.com and self-hosted GitLab instances
  - If self-hosted: show input for GitLab instance URL first, then OAuth
- [ ] Self-hosted Git flow:
  - Form with: Git server URL, personal access token
  - "Test Connection" button that verifies the token works
  - Show success/failure state
- [ ] After connecting any provider:
  - Show "Connected" state with provider name and username
  - "Disconnect" option (ghost/text button)
  - "Continue" button becomes primary action
- [ ] If skipped:
  - Note: "You can connect a Git provider anytime from Settings."
  - Apps will need to be deployed via CLI (`icefall deploy`) or manual upload
- [ ] Multiple providers can be connected — but during onboarding, connecting one is sufficient
- [ ] Backend endpoints:
  - `GET /api/onboarding/git/github/authorize` — returns OAuth URL
  - `POST /api/onboarding/git/github/callback` — handles OAuth callback
  - `POST /api/onboarding/git/gitlab/authorize` — with optional `instance_url`
  - `POST /api/onboarding/git/self-hosted` — saves URL + token
  - `POST /api/onboarding/git/test` — tests connection for self-hosted

## Out of Scope

- Bitbucket (can be added later)
- SSH key-based Git auth (access tokens only for now)
- Repository selection (that happens during app creation)

## Dependencies

- IF-050 (state machine), IF-051 (UI shell), IF-033 (OAuth integration), IF-012 (webhooks)
