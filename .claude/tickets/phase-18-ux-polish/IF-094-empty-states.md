# IF-094: Empty states and onboarding hints

**Phase:** 18 — UX Polish
**Priority:** Medium
**Estimate:** S

## Description

Improve empty states across the dashboard with helpful illustrations, action buttons, and guidance. Currently most empty states are a single line of text like "No deploys yet." — they should guide the user to the next action.

## Acceptance Criteria

### Empty state component
- [ ] Create `dashboard/src/islands/shared/EmptyState/EmptyState.tsx`:
  - Icon (large, muted)
  - Title
  - Description
  - Optional action button
  - Optional link to docs

### Pages to improve

| Location | Current | Improved |
|---|---|---|
| Dashboard (no apps) | "No apps yet" | Icon + "Deploy your first app" + "New App" button |
| Deploys tab (no deploys) | "No deploys yet." | Icon + "No deployments yet" + "Deploy now" button |
| Logs tab (no logs) | "No logs" | Icon + "Logs appear after your first deploy" |
| Env vars (empty) | Minimal | Icon + "No environment variables" + "Add Variable" button |
| Domains (empty) | "No domains" | Icon + "Add a custom domain" + "Add Domain" button |
| Databases page (empty) | "No databases" | Icon + "Create your first database" + "New Database" button |
| Projects page (empty) | Already good | Keep as-is |
| Health (no check) | "No health check configured" | + "Configure" button that scrolls to settings |
| Notification channels | "No notification channels configured." | + "Add Channel" button |

## Out of Scope

- Interactive tutorials / walkthroughs
- Tooltips / coachmarks

## Dependencies

- None
