# IF-102: Update dashboard UI

**Phase:** 16 — Self-Update
**Priority:** High
**Estimate:** L

## Description

Build the complete dashboard interface for the self-update system: the sidebar notification pill, the update dialog with step-by-step progress, the reconnection overlay, the Settings page update section, and all supporting components. The UX philosophy: flawlessly simple. Click update, watch checkmarks appear, done in 20 seconds.

## Acceptance Criteria

### Sidebar Update Pill (Bottom-Left Notification)
- [ ] New `UpdatePill` island component in `dashboard/src/islands/update/UpdatePill/`
- [ ] Positioned in the sidebar footer, above the "Operational" status row
- [ ] Compact single-line element: `↑ v{newVersion} available`
  - Left icon: Tabler `IconArrowUp` at 16px, `var(--color-primary)`
  - Text: version in `--text-xs`, `--weight-medium`, `var(--color-primary)`
  - Background: `var(--color-primary-subtle)` with subtle border
  - Border radius: `var(--radius-sm)`
  - Padding: `var(--space-2) var(--space-3)`
- [ ] Entire pill is a `<button>` that opens the update dialog
- [ ] Subtle entrance animation: `translateY(4px)` → `translateY(0)` + `opacity: 0` → `1`
  - Respects `prefers-reduced-motion`
- [ ] Not dismissable (stays until update applied or newer version supersedes)
- [ ] Only visible to admin users
- [ ] `aria-label="Update available: version {version}. Activate to view details."`
- [ ] Visually hidden `aria-live="polite"` region announces appearance
- [ ] Settings nav item gets a small dot indicator (6px circle, `var(--color-primary)`)

### Update Dialog (Pre-Update State)
- [ ] Modal dialog (`role="dialog"`, `aria-modal="true"`), 480px max-width, centered
- [ ] Title: "Update Icefall"
- [ ] Version transition: `v{current} → v{new}` in monospace
- [ ] "What's new" section: up to 5 bullet points from release notes
- [ ] "View full release notes" link to GitHub (opens in new tab)
- [ ] Breaking changes callout (conditional): warning-colored left border, `IconAlertTriangle`, description text
- [ ] Info box: "A backup will be created before updating. The dashboard will be briefly unavailable (~15 seconds)."
- [ ] Buttons: "Cancel" (ghost) + "Begin update" (primary)
- [ ] Closable via X button and Escape key

### Update Dialog (Active Update State)
- [ ] Title changes to: "Updating to v{newVersion}"
- [ ] Close button disappears (not closable during update)
- [ ] Seven progress steps displayed as a checklist:
  1. Checking compatibility — indeterminate spinner, < 1s
  2. Creating backup — indeterminate spinner, shows elapsed time
  3. Downloading update — **determinate progress bar** with percentage (4px height, `var(--color-primary)` fill, `var(--radius-full)`)
  4. Verifying integrity — indeterminate spinner, < 1s
  5. Applying database migrations — indeterminate spinner, shows elapsed time
  6. Restarting Icefall — spinner (SSE drops here, frontend handles)
  7. Verifying health — spinner after reconnection
- [ ] Step indicators reuse `BuildStepRow` visual language:
  - Done: `IconCheck` in `--color-success` + elapsed duration right-aligned
  - Running: `IconLoader2` with CSS spin in `--color-primary`
  - Pending: hollow circle in `--color-text-muted`
  - Failed: `IconX` in `--color-error`
- [ ] Info box: "Do not close this tab. The dashboard will reconnect automatically after restart."

### Update Dialog (Error State)
- [ ] Failed step turns red with error message below
- [ ] "View error details" expands to monospace scrollable trace (max-height 200px, dark bg)
- [ ] "Close" button appears
- [ ] No automatic "Retry" button (prevents retry loop on deterministic failures)
- [ ] Title: "Update failed"

### Update Dialog (Success State)
- [ ] Large `IconCircleCheck` at 48px in `var(--color-success)`
- [ ] "Update complete" heading
- [ ] "Icefall is now running v{version}. Total time: {duration}."
- [ ] "View release notes" link + "Close" button (primary, auto-focused)
- [ ] Title: "Updated to v{newVersion}"

### Reconnection Overlay
- [ ] Full-viewport semi-transparent overlay, centered content
- [ ] Shown when SSE drops during step 6 (restart) for admin users not on the update dialog
- [ ] Also shown when auto-update or another admin triggers an update
- [ ] Text: "Reconnecting to Icefall..."
- [ ] Three-dot pulsing animation for loading indicator
- [ ] Subtext: "The server is restarting. This usually takes about 10 seconds."
- [ ] After 30s: "Restart is taking longer than expected. If this persists, check the server logs."
- [ ] After 60s: "Unable to reach the server. Check if the Icefall service is running." + "Retry now" button
- [ ] Reconnection logic: poll `GET /api/v1/server/status` every 2 seconds
  - On success: verify `response.version` matches expected new version
  - Overlay fades out over 300ms
  - Toast: "Icefall was updated to v{version}"
- [ ] Non-admin overlay: simpler toast: "Icefall was updated. No action needed."
- [ ] `ReconnectOverlay` island in `dashboard/src/islands/update/ReconnectOverlay/`
- [ ] No close button, no Escape dismissal (must wait for reconnection or timeout)

### Post-Update Toast
- [ ] After closing the update dialog: toast "Icefall updated to v{version}" with checkmark
- [ ] Auto-dismisses after 5 seconds
- [ ] Sidebar version subtitle updates to new version (via nanostore update)

### Settings Page — Updates Section
- [ ] Placed as second-to-last section (before MCP Server)
- [ ] **Current version + check**: version display, "Last checked" relative time, "Check for updates" button
  - Button shows spinner while checking, disabled during check
  - If update found: row transforms to show "Available: v{new}" with "View details" + "Update now"
- [ ] **Update channel**: radio group — Stable (recommended) / Beta (with confirmation prompt)
- [ ] **Automatic updates**: toggle (off by default), with maintenance window config:
  - Day dropdown: "Every day", "Weekdays", "Weekends", individual days
  - Time range: two time selects (30-min increments, 24h format)
  - Timezone display (read-only, detected)
  - Fields disabled when auto-update is off
- [ ] **Update history**: table with columns Version, Date, Duration, Status
  - Version links to release notes URL
  - Status: success (green check), failed (red X with tooltip), rolled_back
  - Most recent 10 entries, empty state: "No update history yet."
- [ ] Preferences save on change via `PATCH` with debounce, subtle "Saved" confirmation text

### State Management
- [ ] Nanostore: `$updateInfo` (from `/api/v1/system/update/check`)
- [ ] Nanostore: `$updateStatus` (from `/api/v1/system/update/status`, updated via SSE)
- [ ] Store file: `dashboard/src/stores/update.ts`

### Navigate-Away Safety
- [ ] If user navigates away during update: update continues server-side
- [ ] Returning to any page picks up current state via `/api/v1/system/update/status`
- [ ] Update dialog can be reopened from the update pill (which shows "Updating..." during active update)

### General
- [ ] Light and dark theme verified for all components
- [ ] Mobile responsive (dialog becomes full-width on small screens)
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader tested: dialog role, live regions, progress announcements

## Technical Notes

- New file structure:
  ```
  dashboard/src/islands/update/
    UpdatePill/UpdatePill.tsx + update-pill.module.css
    UpdateDialog/UpdateDialog.tsx + update-dialog.module.css
    UpdateStep/UpdateStep.tsx + update-step.module.css
    UpdateSettings/UpdateSettings.tsx + update-settings.module.css
    ReconnectOverlay/ReconnectOverlay.tsx + reconnect-overlay.module.css
  dashboard/src/stores/update.ts
  ```
- Reuse existing `BuildStepRow` patterns from deploy view for step indicators
- SSE reconnection uses `EventSource` auto-reconnect or custom retry with `Last-Event-ID`
- The reconnection overlay must NOT trigger a full page reload — Preact state must survive
- TypeScript types for `UpdateInfo`, `UpdateStatus`, `UpdateStep`, `UpdatePreferences`, `UpdateHistoryEntry`

## Out of Scope

- CLI update command UI (IF-104)
- Auto-update scheduling logic (IF-103 — this ticket builds the settings UI, IF-103 builds the backend)
- Offline/manual update UI (CLI-only in v1)

## Dependencies

- IF-098 (update discovery API endpoints)
- IF-099 (download API endpoint)
- IF-100 (apply API endpoint + SSE events)
- IF-101 (rollback API endpoint)
- IF-091 (toast notification system — Phase 18, or implement minimal toast inline)
