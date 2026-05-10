# IF-091: Toast notification system

**Phase:** 18 — UX Polish
**Priority:** High
**Estimate:** M

## Description

Add a toast notification system for user feedback on actions: deploy triggered, settings saved, app deleted, errors, etc. Currently, success/error feedback is inconsistent — some actions show inline text, some show nothing, some redirect.

## Acceptance Criteria

### Toast component
- [ ] Create `dashboard/src/islands/shared/Toast/Toast.tsx`
- [ ] Toast types: success (green), error (red), info (blue), warning (yellow)
- [ ] Position: bottom-right, stacked (newest on top)
- [ ] Auto-dismiss after 5 seconds (configurable)
- [ ] Manual dismiss via X button
- [ ] Slide-in animation from right, fade-out on dismiss
- [ ] Max 3 visible toasts (older ones dismissed)
- [ ] `prefers-reduced-motion`: no slide, instant appear/disappear

### Toast store (global state)
- [ ] Create `dashboard/src/stores/toast.ts` using nanostores
- [ ] `toast.success("Settings saved")` / `toast.error("Deploy failed")` / `toast.info("Deploying...")` API
- [ ] Mount the toast container at the DashboardLayout level (always visible)

### Replace existing feedback patterns
- [ ] SettingsTab "Saved" / "Save failed" text → toast
- [ ] App delete confirmation → toast "App deleted" after redirect
- [ ] Deploy trigger → toast "Deploy started" (instead of hard redirect)
- [ ] Start/Stop/Restart actions → toast with result
- [ ] User invite → toast "Invitation sent"
- [ ] Notification channel test → toast "Test notification sent"
- [ ] Domain add/delete → toast
- [ ] Env var add/delete/import → toast
- [ ] Password change, email change → toast
- [ ] 2FA enable/disable → toast

### Accessibility
- [ ] Toast container: `role="status"` + `aria-live="polite"`
- [ ] Error toasts: `aria-live="assertive"`
- [ ] Focus doesn't move to toast (non-intrusive)
- [ ] Screen readers announce toast content

## Out of Scope

- Persistent notifications (bell icon with history)
- Action buttons in toasts ("Undo", "View")
- Toast positioning preference

## Dependencies

- None (foundational UX component)
