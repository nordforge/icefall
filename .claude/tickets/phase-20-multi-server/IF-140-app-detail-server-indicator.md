# IF-140: App detail — server indicator and migration

**Phase:** 20D — Dashboard UI
**Priority:** Medium
**Estimate:** M

## Description

Surface server placement information in the app detail view and provide a UI for migrating apps between servers. The app header shows which server the app runs on, app cards include a subtle server label, and the settings tab gains a "Server placement" section with a migration trigger. All multi-server indicators are hidden on single-server installations.

## Acceptance Criteria

### App Header
- [ ] Below the app name: "on {server_name}" as a link to the server detail page
- [ ] Hidden when only one server exists (single-server mode)
- [ ] Server name updates if the app is migrated

### App Card
- [ ] Subtle server name label on each AppCard (bottom-right or as a tag)
- [ ] Hidden when only one server exists
- [ ] Uses a muted text style to avoid visual clutter

### Settings Tab — Server Placement
- [ ] New "Server placement" section in the app's SettingsTab
- [ ] Shows current server name and link
- [ ] Server dropdown to select a target server for migration
- [ ] "Migrate app" button (disabled until a different server is selected)
- [ ] Hidden when only one server exists

### Migration Confirmation
- [ ] Clicking "Migrate app" opens a confirmation dialog
- [ ] Dialog shows:
  - Source server name
  - Target server name
  - Warning about volume data not being transferred
  - Checkbox: "I understand that volume data will not be migrated" (required)
- [ ] Confirm button starts the migration via `PUT /api/v1/apps/{id}/migrate`
- [ ] Cancel button closes the dialog

### Migration Progress
- [ ] After confirming: dialog transforms into a progress view
- [ ] Shows the migration deploy progress (same as DeploysTab deploy detail)
- [ ] On success: "App migrated to {server}" with a link to the server
- [ ] On failure: error message with the option to retry

### Single-Server Mode
- [ ] All server-related UI elements hidden when the server count is 1
- [ ] No API calls for server data in single-server mode
- [ ] Zero visual difference from the current app detail page

## Technical Notes

- The server count can be determined from a shared context (e.g., a nanostore populated at layout level)
- Migration progress reuses the deploy event stream — the migration creates a deploy record
- The confirmation dialog should use the existing dialog/modal pattern in the codebase
- The server dropdown should show only online servers (exclude the current server and offline servers)

## Out of Scope

- Scheduling migrations (e.g., "migrate during off-hours")
- Migration history view (visible in the deploys tab as migration-type deploys)
- Automatic migration suggestions based on resource usage

## Dependencies

- IF-134 (app migration API endpoint)
- IF-138 (server detail page — linked from the server indicator)
