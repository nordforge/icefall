# IF-096: Global keyboard shortcuts

**Phase:** 18 — UX Polish
**Priority:** Low
**Estimate:** S

## Description

Add keyboard shortcuts for common actions beyond the command palette's Cmd+K.

## Acceptance Criteria

- [ ] `?` or `Cmd+/` — show keyboard shortcut help overlay
- [ ] `g h` — go to dashboard home (vim-style two-key combo)
- [ ] `g d` — go to databases
- [ ] `g s` — go to server
- [ ] `g p` — go to projects
- [ ] `g u` — go to users
- [ ] `c a` — create new app (navigates to /apps/new)
- [ ] `c d` — create new database
- [ ] Shortcuts disabled when typing in an input/textarea/select
- [ ] Shortcut help overlay shows all available shortcuts in a modal

## Technical Notes

- Two-key combos: track the first key with a timeout (500ms). If second key doesn't come, reset.
- Implement as a single global `keydown` listener in the DashboardLayout
- Check `document.activeElement` — skip shortcuts when focused on input elements

## Out of Scope

- Custom shortcut configuration
- Per-page shortcuts (deploy-specific, etc.)

## Dependencies

- IF-078 (command palette — already has Cmd+K)
