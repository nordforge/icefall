# IF-116: Add accessible label to empty table headers

**Phase:** 19 — Audit Fixes
**Priority:** Low
**Estimate:** S

## Description

The a11y audit found that the deploys table has an empty `<th>` for the actions column with no text and no `aria-label`, making it unclear to screen readers what the column contains.

## Acceptance Criteria

- [ ] `dashboard/src/islands/app-detail/DeploysTab/DeploysTab.tsx` line 54 — Replace empty string `''` with visually hidden "Actions" text or add `aria-label="Actions"` to the `<th>`
- [ ] Audit all other tables for the same pattern (users page, tokens table, sessions table, domains table)
- [ ] Use a shared `.srOnly` CSS class for visually hidden text: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);`

## Dependencies

- None
