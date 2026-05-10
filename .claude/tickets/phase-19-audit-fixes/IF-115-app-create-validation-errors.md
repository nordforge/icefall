# IF-115: Show inline validation errors in app creation wizard

**Phase:** 19 — Audit Fixes
**Priority:** Medium
**Estimate:** S

## Description

The a11y audit found that the AppCreateWizard disables the "Next" button when validation fails without explaining what's missing (WCAG 3.3.1 Error Identification). Users must guess which field is invalid.

## Acceptance Criteria

- [ ] `dashboard/src/islands/app-create/AppCreateWizard/AppCreateWizard.tsx` — When `canAdvance()` returns false and the user attempts to proceed (clicks disabled button or presses Enter):
  - Show inline error messages below the relevant fields
  - Use `role="alert"` or `aria-describedby` linking the error to the input
- [ ] Required field indicators: mark required fields with a visual indicator (e.g., red asterisk or "Required" text)
- [ ] Error messages should be specific: "App name is required", "Repository URL must start with https:// or git@"

## Technical Notes

- The "disabled button with no explanation" pattern is a common a11y anti-pattern
- Alternative: keep the button enabled, validate on click, and show errors — this is often better UX than a mysteriously disabled button

## Dependencies

- None
