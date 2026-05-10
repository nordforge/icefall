# IF-105: Add focus traps to all modal dialogs

**Phase:** 19 — Audit Fixes
**Priority:** High
**Estimate:** M

## Description

The a11y audit found 3 modal-like components that have `aria-modal="true"` but no focus trap — keyboard users can Tab behind them into background content, violating WCAG 2.4.3 Focus Order.

## Acceptance Criteria

### VolumeBrowser drawer
- [ ] `dashboard/src/islands/app-detail/VolumeBrowser/VolumeBrowser.tsx` — Add Tab focus trap when drawer is open
- [ ] Trap should cycle focus within the drawer panel
- [ ] Upload sub-dialog should also trap focus when open
- [ ] Escape key closes (already implemented)
- [ ] Focus returns to trigger element on close

### UsersPage modals
- [ ] `dashboard/src/islands/users/UsersPage/UsersPage.tsx` lines 381-454 — Password reset modal and 2FA reset modal
- [ ] Add focus trap cycling within each modal
- [ ] Auto-focus the first interactive element on open
- [ ] Focus returns to the action button that opened the modal on close

### CommandPalette
- [ ] `dashboard/src/islands/shared/CommandPalette/CommandPalette.tsx` lines 431-553
- [ ] Add Tab focus trap within the palette overlay
- [ ] Already has Escape-to-close — verify focus restoration

### Implementation
- [ ] Reuse the focus trap pattern from `ConfirmDialog.tsx` (useEffect with Tab keydown handler)
- [ ] Extract a shared `useFocusTrap(ref, isOpen)` hook if the pattern is duplicated more than twice

## Technical Notes

- ConfirmDialog already has a working focus trap pattern — extract and reuse
- The trap should find all focusable elements (`[tabindex], a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)`) and cycle Tab/Shift+Tab

## Dependencies

- None
