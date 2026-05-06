# IF-018: App creation flow

**Phase:** 4 — Web Dashboard
**Priority:** Critical
**Estimate:** M

## Description

UI flow for creating a new app: connect git repo, select branch, configure settings, trigger first deploy.

## Acceptance Criteria

- [ ] "New App" button on dashboard
- [ ] Step 1: Git repository
  - Input for repository URL (HTTPS or SSH)
  - Branch selector (auto-detect available branches via git ls-remote)
  - Authentication: token input for private repos
- [ ] Step 2: Build settings (pre-filled after framework detection)
  - Detected framework badge
  - Build command (editable)
  - Output directory (editable)
  - Start command (editable, for server apps)
  - Port (editable)
  - Package manager (auto-detected, overridable)
- [ ] Step 3: Environment variables
  - Key-value editor (add rows)
  - Paste .env file option
- [ ] Step 4: Review & deploy
  - Summary of all settings
  - "Deploy" button triggers first build
  - Redirect to deploy view showing build progress
- [ ] App name auto-generated from repo name (editable)
- [ ] Validation: repo URL reachable, branch exists
- [ ] Form state preserved if user navigates back between steps
- [ ] Light and dark theme verified

## Dependencies

- IF-016, IF-008, IF-010, IF-014
