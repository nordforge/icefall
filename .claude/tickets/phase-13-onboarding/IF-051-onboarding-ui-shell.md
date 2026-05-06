# IF-051: Onboarding UI shell & step navigation

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

A dedicated onboarding layout that replaces the normal app shell during setup. Clean, focused, no sidebar — just a centered content area with a step indicator showing progress. The user should feel guided, not overwhelmed.

## Acceptance Criteria

- [ ] Dedicated `/onboarding` route group with its own layout (no sidebar, no top nav)
- [ ] Layout structure:
  - Icefall logo centered at top (small, not dominant)
  - Horizontal step indicator below logo showing all steps as dots/labels
  - Completed steps: filled blue dot with checkmark
  - Current step: filled blue dot, slightly larger, with label visible
  - Future steps: empty/gray dot
  - Skipped steps: gray dot with skip indicator
- [ ] Main content area: centered, max-width 640px, generous padding
- [ ] Each step renders as a full-page form/content area within this shell
- [ ] "Back" button on steps after the first (navigates to previous step)
- [ ] "Skip" button shown only on optional steps, styled as ghost/text button
- [ ] Primary action button at bottom of each step (e.g., "Create Account", "Continue", "Deploy")
- [ ] Smooth transition between steps (no page reload — client-side navigation)
- [ ] Keyboard accessible: Tab through form fields, Enter to submit, Escape to go back
- [ ] Light and dark theme verified (use system preference as default — no toggle during onboarding)
- [ ] Mobile responsive: single column, full-width on small screens, step indicator collapses to "Step 2 of 6"
- [ ] Loading states on all action buttons (spinner replaces text during API calls)
- [ ] Error states: inline validation errors below fields, toast for API errors

## Out of Scope

- Individual step content (separate tickets per step)
- Post-onboarding redirect logic (handled by IF-050)

## Dependencies

- IF-050 (state machine), IF-016 (Astro + Preact setup)
