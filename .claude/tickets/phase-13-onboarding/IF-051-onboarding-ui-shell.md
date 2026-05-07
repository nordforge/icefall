# IF-051: Onboarding UI shell & step navigation

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

A dedicated onboarding layout that replaces the normal app shell during setup. Clean, focused, no sidebar — just a centered content area with a step indicator showing progress. The user should feel guided, not overwhelmed.

## Layout Reference (from Stitch designs)

The onboarding flow uses a **dedicated full-screen layout** — no dashboard sidebar, no top nav, no footer. See the Stitch "Connect Git Provider" screens (dark + light) as the canonical reference.

### Structure (top to bottom):
1. **Header bar** — full-width, centered "Icefall" logo with icon. Dark mode: subtle dark surface background (#161B22) with 1px bottom border (#30363D). Light mode: white background with 1px bottom border (#E2E6EA).
2. **Main area** — vertically centered content on page background (dark: #0D1117, light: #FAFBFC). Contains:
   - Step icon (blue square, centered)
   - Heading (24px Inter semibold, centered)
   - Subheading (14px gray, centered)
   - Content card (~480px width, 40px padding, 8px radius, 1px border, no shadows)
   - Primary action button (full-width blue) inside the card
   - "Skip for now" text link below button (inside card)
3. **Step indicator** — at the very bottom of the viewport (not inside the card). 6 dots with the active step filled blue + "Step X of 6" text label. No footer, no copyright, nothing else below.

### What NOT to include:
- No sidebar navigation
- No footer / copyright text
- No theme toggle (use system preference)
- No back arrow in header (use browser back or step indicator)

### Screenshots:
- Dark: `design_screenshots/onboarding-step4-git/dark/step4-git-dark.png`
- Light: `design_screenshots/onboarding-step4-git/step4-git-light.png`

## Acceptance Criteria

- [ ] Dedicated `/onboarding` route group with its own layout (no sidebar, no top nav, no footer)
- [ ] Header: full-width bar with centered Icefall logo + icon, 1px bottom border
- [ ] Main area: vertically centered content, page background color (not card color)
- [ ] Content card: ~480px max-width, 40px internal padding, 8px radius, 1px border, no shadows
- [ ] Step indicator at bottom of viewport: 6 dots + "Step X of 6" label, active dot filled blue
- [ ] Each step renders as a full-page form/content area within this shell
- [ ] "Skip" link shown only on optional steps, styled as text link inside the card (below primary button)
- [ ] Primary action button at bottom of card content (full-width blue)
- [ ] Smooth transition between steps (no page reload — client-side navigation)
- [ ] Keyboard accessible: Tab through form fields, Enter to submit
- [ ] Light and dark theme verified (use system preference as default — no toggle during onboarding)
- [ ] Mobile responsive: single column, full-width on small screens, step indicator text-only "Step 2 of 6"
- [ ] Loading states on all action buttons (spinner replaces text during API calls)
- [ ] Error states: inline validation errors below fields, toast for API errors

## Out of Scope

- Individual step content (separate tickets per step)
- Post-onboarding redirect logic (handled by IF-050)

## Dependencies

- IF-050 (state machine), IF-016 (Astro + Preact setup)
