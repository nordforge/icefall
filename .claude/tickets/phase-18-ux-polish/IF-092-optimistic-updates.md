# IF-092: Optimistic UI updates

**Phase:** 18 — UX Polish
**Priority:** Medium
**Estimate:** M

## Description

Actions like start/stop/restart, tag changes, env var edits, and domain operations should update the UI immediately without waiting for the API response. If the API fails, revert the UI and show an error toast.

## Acceptance Criteria

### App lifecycle actions
- [ ] Start/Stop/Restart: StatusDot updates immediately, reverts on error
- [ ] AppHeader buttons show the new state instantly

### Tags
- [ ] Adding a tag shows the chip immediately
- [ ] Removing a tag hides the chip immediately
- [ ] Dashboard grid filter updates immediately

### Environment variables
- [ ] Adding an env var shows the new row immediately
- [ ] Deleting shows the row fading out immediately
- [ ] Import shows the new count immediately

### Domains
- [ ] Adding a domain shows the new row immediately
- [ ] Deleting fades the row out immediately

### Deploy trigger
- [ ] "Deploy" button shows the new deploy in the list immediately with "pending" status

### Implementation pattern
```tsx
async function handleAction() {
  const previous = currentState;
  setCurrentState(optimisticState); // Instant UI update
  try {
    await api.doAction();
  } catch {
    setCurrentState(previous); // Revert on error
    toast.error("Action failed");
  }
}
```

## Out of Scope

- Offline queue (buffer actions for later)
- Conflict resolution (two users editing same resource)

## Dependencies

- IF-091 (toast notifications — for error feedback on revert)
