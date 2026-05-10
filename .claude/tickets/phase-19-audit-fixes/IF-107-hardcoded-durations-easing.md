# IF-107: Replace hardcoded durations and easing with design tokens

**Phase:** 19 — Audit Fixes
**Priority:** Low
**Estimate:** S

## Description

The design audit found 5 CSS files using raw `0.15s ease` instead of `var(--duration-fast) var(--ease-out)`. This undermines the design token system and means `prefers-reduced-motion` doesn't work on these transitions.

## Acceptance Criteria

- [ ] `dashboard/src/islands/settings/SettingsPage/settings-page.module.css` lines 236, 257 — Replace `0.15s ease`
- [ ] `dashboard/src/islands/app-detail/TerminalTab/terminal-tab.module.css` line 107 — Replace `0.15s ease`
- [ ] `dashboard/src/islands/users/UsersPage/users-page.module.css` lines 213, 235 — Replace `0.15s ease`
- [ ] `dashboard/src/islands/update/UpdateSettings/update-settings.module.css` lines 88, 109 — Replace `ease` with `var(--ease-out)`
- [ ] All replacements use `var(--duration-fast) var(--ease-out)`
- [ ] Verify `prefers-reduced-motion` correctly disables these transitions (tokens set durations to 0ms)

## Dependencies

- None
