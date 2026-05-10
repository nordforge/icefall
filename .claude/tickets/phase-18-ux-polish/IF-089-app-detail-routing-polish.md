# IF-089: App detail routing polish

**Phase:** 18 — UX Polish
**Priority:** Critical
**Estimate:** M

## Description

The AppDetailRouter handles SPA-style navigation within the app detail page, but transitions between views still flash. Fix the remaining rough edges: smooth tab transitions, deploy detail enter/exit animation, preserve scroll position, and eliminate white flashes.

## Acceptance Criteria

### Tab switching
- [ ] Tab content fades in on switch (CSS transition, not JS animation)
- [ ] Previous tab content preserved in DOM (hidden, not unmounted) for instant back-switch
- [ ] Tab switch doesn't scroll to top — preserve scroll position per tab
- [ ] Active tab indicator slides to the selected tab (CSS transform, not discrete jump)

### Deploy detail navigation
- [ ] Clicking a deploy link slides the detail view in from the right (or fades in)
- [ ] "Back to deploys" / clicking Deploys tab slides the detail out (or fades out)
- [ ] No white flash between deploy list and deploy detail
- [ ] Deploy detail preserves the deploy list scroll position when navigating back

### URL behavior
- [ ] Every tab change updates the URL via `pushState` (already done)
- [ ] Browser back from deploy detail → deploys tab (already done)
- [ ] Browser back from a tab → previous tab (not homepage)
- [ ] Refreshing a URL like `/apps/{id}/deploys/{deployId}` loads correctly
- [ ] Sharing a URL works — recipient sees the correct tab/deploy

### Loading states during navigation
- [ ] Tab components show their skeleton immediately while data loads (from IF-088)
- [ ] Deploy detail shows a skeleton while the deploy data loads
- [ ] No "Loading..." text flash between states

## Technical Notes

- Tab content persistence: render all loaded tabs but only show the active one (`display: none` on inactive). This keeps state (scroll, form inputs) alive.
- Tab transition: `opacity: 0 → 1` with `transition: opacity 150ms ease` on the tab content wrapper
- Deploy detail: use a CSS class swap (`.entering` / `.exiting`) with transform/opacity transition
- Scroll preservation: store `scrollTop` per tab in a ref, restore on tab switch

## Out of Scope

- Shared element transitions (e.g., deploy row morphing into deploy detail)
- Gesture-based navigation (swipe between tabs)

## Dependencies

- IF-088 (skeleton loading — for loading states during transitions)
