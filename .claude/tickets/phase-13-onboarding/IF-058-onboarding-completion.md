# IF-058: Onboarding completion & dashboard handoff

**Phase:** 13 — Onboarding
**Priority:** High
**Estimate:** S

## Description

Handles the transition from onboarding to the main application. When the user clicks "Go to Dashboard" after their first deploy, the onboarding is marked complete and they land on a dashboard that isn't empty — it has their first app, showing that the system is alive and working.

## Acceptance Criteria

- [ ] Clicking "Go to Dashboard" on the final deploy step:
  - Calls `POST /api/onboarding/complete`
  - Sets `completed_at` timestamp in onboarding state
  - Redirects to `/` (main dashboard)
- [ ] Dashboard on first load after onboarding shows:
  - Server resource bar (already populated with real data)
  - App grid with the first app card showing its current status
  - If deploy succeeded: green "Online" status
  - If deploy failed: red "Failed" status (user can fix from app detail)
- [ ] A one-time welcome banner at top of dashboard (dismissible):
  - "Welcome to Icefall! Your server is ready."
  - Three quick-action links:
    - "Deploy another app" -> app creation flow
    - "Invite team members" -> Users page
    - "Read the docs" -> documentation link
  - "Dismiss" button (X) — once dismissed, never shown again (stored in localStorage)
- [ ] Welcome banner adapts based on skipped steps:
  - If domain was skipped: include "Set up your domain" link
  - If Git provider was skipped: include "Connect Git provider" link
- [ ] Onboarding middleware (IF-050) is now permanently disabled — zero overhead
- [ ] If user navigates back to `/onboarding` after completion: redirect to dashboard with query param `?already-complete=true` (no error, just redirect)

## Out of Scope

- Analytics/tracking of onboarding completion
- Email notification on setup complete
- Onboarding re-entry (reset is CLI-only via `icefall reset-onboarding`)

## Dependencies

- IF-050 (state machine), IF-057 (first deploy step), IF-017 (dashboard home page)
