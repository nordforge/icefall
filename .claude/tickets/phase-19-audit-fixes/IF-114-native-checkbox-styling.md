# IF-114: Style native checkboxes to match design system

**Phase:** 19 — Audit Fixes
**Priority:** Low
**Estimate:** S

## Description

The design audit found that checkboxes in settings, profile, and 2FA sections render as native browser checkboxes (`width: 16px; height: 16px` only). They look different across OS/browser and don't match the toggle switches used elsewhere.

## Acceptance Criteria

- [ ] Create a styled checkbox class in `form.module.css` using `appearance: none` with custom check mark
- [ ] Or: use the existing toggle switch pattern for boolean settings and reserve checkboxes for multi-select contexts
- [ ] Apply to:
  - `dashboard/src/islands/settings/SettingsPage/SettingsPage.tsx` — notification checkboxes
  - `dashboard/src/islands/app-detail/SettingsTab/SettingsTab.tsx` — volume read-only checkbox
  - `dashboard/src/islands/settings/TwoFactorSection/TwoFactorSection.tsx` — backup code confirmation
  - `dashboard/src/islands/profile/ProfilePage/ProfilePage.tsx` — email notifications checkbox
- [ ] Styled checkbox should show a check mark (SVG or CSS border trick) when `:checked`
- [ ] Must maintain `24x24px` minimum target size (WCAG 2.5.8)
- [ ] `:focus-visible` ring on keyboard focus

## Technical Notes

- Custom checkbox pattern: `appearance: none; width: 18px; height: 18px; border: 2px solid var(--color-border); border-radius: var(--radius-sm); &:checked { background: var(--color-primary); border-color: var(--color-primary); }` with a `::after` pseudo-element for the check mark

## Dependencies

- None
