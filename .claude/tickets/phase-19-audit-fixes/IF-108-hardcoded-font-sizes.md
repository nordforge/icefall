# IF-108: Replace hardcoded font sizes and weights with tokens

**Phase:** 19 — Audit Fixes
**Priority:** Low
**Estimate:** S

## Description

Several CSS files use raw `rem` values and numeric `font-weight` instead of the `--text-*` and `--weight-*` design tokens.

## Acceptance Criteria

- [ ] `log-viewer.module.css` line 133 — `0.8125rem` → `var(--text-sm)`
- [ ] `log-viewer.module.css` line 177 — `0.75rem` → `var(--text-xs)`
- [ ] `log-viewer.module.css` lines 184-185 — `font-weight: 600; font-size: 0.6875rem` → `var(--weight-semibold)` + custom sub-xs size (document why)
- [ ] `terminal-tab.module.css` lines 137, 156 — `font-weight: 600, 500` → `var(--weight-semibold)`, `var(--weight-medium)`
- [ ] `database-browser.module.css` line 79, `database-tab.module.css` line 169 — `0.625rem` (below token scale — either use `--text-xs` or document)
- [ ] `command-palette.module.css` line 163 — `0.6875rem` → closest token

## Technical Notes

- Some values (0.625rem, 0.6875rem) are intentionally below the smallest token `--text-xs: 0.75rem`. If these need to stay small, add a `--text-2xs: 0.625rem` token or document why the hardcoded value is necessary.

## Dependencies

- None
