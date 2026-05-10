# IF-095: Consistent confirmation dialogs

**Phase:** 18 — UX Polish
**Priority:** Medium
**Estimate:** S

## Description

Replace the inconsistent inline confirmation patterns (some use two-stage button swap, some use `window.confirm`, some have no confirmation) with a shared modal dialog component.

## Acceptance Criteria

### Dialog component
- [ ] Create `dashboard/src/islands/shared/ConfirmDialog/ConfirmDialog.tsx`:
  - Modal overlay with backdrop blur
  - Title, description, confirm button (customizable label + variant), cancel button
  - Keyboard: Enter confirms, Escape cancels
  - Focus trap while open
  - `role="alertdialog"` with `aria-modal="true"`
  - Smooth open/close animation (scale + fade)

### Actions that need confirmation
- [ ] Delete app — "Delete marketing-site? This will remove all deploys, domains, and environment variables."
- [ ] Delete project — "Delete Frontend Apps? Apps and databases will be unassigned."
- [ ] Stop app — "Stop marketing-site? This will halt all traffic."
- [ ] Delete database — "Delete main-postgres? All data will be permanently lost."
- [ ] Remove domain — "Remove marketing.example.com?"
- [ ] Revoke API token — "Revoke this token? Any integrations using it will stop working."
- [ ] Disable 2FA — "Disable two-factor authentication?"
- [ ] Delete user / deactivate — "Deactivate developer@icefall.dev?"
- [ ] Rollback deploy — "Roll back to deploy #ff8bfc6e?"

### Destructive action styling
- [ ] Delete/remove dialogs: red confirm button
- [ ] Stop/disable dialogs: yellow/warning confirm button
- [ ] Rollback dialogs: blue confirm button

## Out of Scope

- Type-to-confirm ("type DELETE to confirm")
- Undo instead of confirm

## Dependencies

- None
