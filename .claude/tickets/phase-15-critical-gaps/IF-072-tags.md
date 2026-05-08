# IF-072: App tags

**Phase:** 15 — Critical Gaps
**Priority:** Low
**Estimate:** S

## Description

Once someone has 5+ apps, the flat grid on the dashboard home becomes hard to navigate. Add freeform tags to apps with filter chips on the dashboard for quick filtering.

## Acceptance Criteria

### App Settings Tab
- [ ] New field: "Tags" — freeform tag input
- [ ] Tag input behavior:
  - Type a tag name and press Enter or comma to add
  - Tags shown as removable chips/badges
  - Click the X on a chip to remove
  - Case-insensitive (stored lowercase)
  - Max 20 tags per app
  - Max 30 characters per tag
  - Allowed characters: letters, numbers, hyphens, underscores
- [ ] Save persists tags to the app model via `PUT /api/v1/apps/{id}`

### Dashboard Home — Tag Filtering
- [ ] Tag filter bar above the app grid (below the server stats, above the grid)
- [ ] Show all unique tags across all apps as clickable chips
- [ ] Click a tag chip to filter: only show apps with that tag
- [ ] Multiple tag selection: show apps matching ANY selected tag (OR logic)
- [ ] Active tag chips are visually distinct (filled vs. outlined)
- [ ] "Clear filters" button when any filter is active
- [ ] App count updates to reflect filtered results

### Backend
- [ ] Add `tags` column to apps table (JSON array of strings, or comma-separated text)
- [ ] Migration to add the column with default empty array/empty string
- [ ] `GET /api/v1/apps` supports optional `?tag=frontend` query parameter for server-side filtering
- [ ] Tags included in app list and app detail API responses

### General
- [ ] Light and dark theme verified
- [ ] Mobile responsive

## Technical Notes

- Simplest implementation: `tags` TEXT column storing comma-separated values, parsed in Rust
- Alternative: JSON array column — SQLite supports `json_each()` for querying
- No separate tags table needed — tags are freeform, not managed entities
- The AppGrid island in `dashboard/src/islands/` handles the grid rendering

## Out of Scope

- Tag management page (create, rename, delete tags globally)
- Tag colors / icons
- Tag-based access control
- Database or service tagging (apps only for v1.0)
- Drag-and-drop tag ordering

## Dependencies

- IF-017 (dashboard home), IF-019 (app detail page)
