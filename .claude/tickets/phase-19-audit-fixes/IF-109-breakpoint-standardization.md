# IF-109: Standardize responsive breakpoints

**Phase:** 19 — Audit Fixes
**Priority:** Low
**Estimate:** S

## Description

The design audit found 4 different "small" breakpoints in use: `480px`, `640px`, `641px`, and `768px`. The project should standardize on a single set of breakpoints.

## Acceptance Criteria

- [ ] Define breakpoint tokens (as CSS custom properties or documented constants):
  - `--bp-sm: 640px` (mobile → tablet)
  - `--bp-md: 768px` (tablet → desktop)
  - `--bp-lg: 1024px` (desktop → wide)
- [ ] Standardize all `min-width` media queries:
  - `server-stats.module.css`, `app-grid.module.css`, `deploys-tab.module.css`, `server-page.module.css` — change `640px` → `641px` (consistent with majority)
  - `overview-tab.module.css`, `server-page.module.css` — evaluate if `768px` should stay or become `641px`
  - `profile-page.module.css` — evaluate if `480px` breakpoint is needed or can use `641px`
- [ ] Document the breakpoint scale in `tokens.css` as comments (CSS custom properties can't be used in media queries)

## Technical Notes

- CSS custom properties cannot be used in `@media` queries. Breakpoints must be documented values, not tokens.
- The `641px` value (not `640px`) is intentional — `min-width: 641px` means "wider than 640px" which avoids the exact boundary where mobile and tablet overlap.

## Dependencies

- None
