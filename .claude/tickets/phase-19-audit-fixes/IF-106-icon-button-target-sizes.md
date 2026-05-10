# IF-106: Ensure minimum 24x24px target size on icon buttons

**Phase:** 19 — Audit Fixes
**Priority:** Medium
**Estimate:** S

## Description

WCAG 2.5.8 (Target Size Minimum) requires all interactive targets to be at least 24x24 CSS pixels. Several icon-only buttons use 12-14px icons without enough padding to reach the minimum.

## Acceptance Criteria

- [ ] `dashboard/src/islands/app-detail/SettingsTab/SettingsTab.tsx` line 367 — Tag remove buttons (`<X size={12}>`)
- [ ] `dashboard/src/islands/app-detail/DomainsTab/DomainsTab.tsx` line 115 — Delete domain button (`<Trash2 size={14}>`)
- [ ] `dashboard/src/islands/env-vars/EnvVarEditor/EnvVarEditor.tsx` lines 132-137 — Show/hide and delete buttons (`<Eye size={14}>`, `<Trash2 size={14}>`)
- [ ] `dashboard/src/islands/databases/DatabasesPage/DatabasesPage.tsx` lines 158-162 — Credentials show/hide and copy buttons
- [ ] All icon buttons in profile page token/session tables

### Fix approach
- [ ] Add `min-width: 24px; min-height: 24px;` to all `.iconButton` CSS classes
- [ ] Or add sufficient padding: `padding: var(--space-1)` (4px each side + 14px icon = 22px — needs `padding: 5px`)
- [ ] Verify with browser DevTools that rendered size meets 24x24px

## Technical Notes

- Most icon buttons share a `.iconButton` class in their respective CSS modules
- A single fix per CSS module should cover all buttons in that component
- Do not increase the visual size beyond what looks balanced — padding is invisible

## Dependencies

- None
