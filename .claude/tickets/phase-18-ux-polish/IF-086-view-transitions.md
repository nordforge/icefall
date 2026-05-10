# IF-086: View Transitions without hydration crashes

**Phase:** 18 — UX Polish
**Priority:** Critical
**Estimate:** L

## Description

Re-enable Astro View Transitions for smooth page-to-page navigation without full-page flashes. The `ClientRouter` was removed because it caused Preact hydration crashes (`can't access property "__H"`). The root cause was `client:load` islands getting their DOM swapped mid-hydration.

The fix: use `transition:persist` on islands that shouldn't re-mount, switch remaining `client:load` to `client:only="preact"` (skip SSR entirely), and add proper `transition:animate` directives for smooth crossfade.

## Acceptance Criteria

- [ ] Re-add `<ClientRouter />` to `DashboardLayout.astro`
- [ ] All islands in dashboard pages use `client:only="preact"` instead of `client:load` — this prevents SSR/hydration mismatch during View Transitions DOM swaps
- [ ] Sidebar uses `transition:persist` so it doesn't re-mount on navigation
- [ ] CommandPalette uses `transition:persist` so its state (recent items, cached data) survives navigation
- [ ] Page content area has `transition:animate="fade"` for a smooth crossfade between pages
- [ ] No "Layout forced before page fully loaded" warnings
- [ ] No `__H` hydration crashes
- [ ] Back/forward browser navigation works without errors
- [ ] Page transitions complete in <200ms perceived

## Technical Notes

- `client:only="preact"` skips SSR entirely — the component renders only on the client. This avoids the hydration mismatch that crashes View Transitions.
- `transition:persist` keeps the DOM element alive across page navigations — useful for sidebar, modals, palette
- The AppDetailRouter already uses `client:only` and handles its own sub-routing. View Transitions should not interfere with its internal `pushState` calls — test thoroughly.
- Astro 6 View Transitions API: `transition:name`, `transition:animate`, `transition:persist`

## Pages to update

| Page | Current hydration | Change to |
|---|---|---|
| index.astro (ServerStats, AppGrid) | `client:load` | `client:only="preact"` |
| databases.astro | `client:load` | `client:only="preact"` |
| domains.astro | `client:load` | `client:only="preact"` |
| projects.astro | `client:load` | `client:only="preact"` |
| settings.astro | `client:load` | `client:only="preact"` |
| users.astro | `client:load` | `client:only="preact"` |
| profile.astro | `client:load` | `client:only="preact"` |
| server.astro | already `client:only` | keep |
| apps/[...path].astro | already `client:only` | keep |

## Out of Scope

- Shared element transitions (morph animations between pages)
- Page-specific transition animations

## Dependencies

- None (foundational UX ticket)
