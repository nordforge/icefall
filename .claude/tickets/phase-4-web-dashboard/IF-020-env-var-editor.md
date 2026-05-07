# IF-020: Environment variable editor UI

**Phase:** 4 — Web Dashboard
**Priority:** High
**Estimate:** M

## Description

Vercel-style environment variable editor component with scope management, visibility toggles, and .env import.

## Acceptance Criteria

- [ ] Key-value table with columns: Key, Value, Scope, Actions
- [ ] Value masked by default (dots/bullets), click to reveal
- [ ] Scope selector per variable: Shared, Production, Preview
- [ ] Add new variable: inline row at bottom or "Add Variable" button
- [ ] Edit existing: click value to edit inline
- [ ] Delete: trash icon with confirmation
- [ ] Bulk import: "Import .env" button → textarea modal, paste content, parse preview, confirm
- [ ] Scope filter tabs: "All", "Shared", "Production", "Preview"
- [ ] Search/filter by key name
- [ ] Unsaved changes indicator + Save button (batch save)
- [ ] Monospace font for keys and values
- [ ] Empty state: "No environment variables" with import CTA
- [ ] Light and dark theme verified

## Design References (Stitch — Light Mode)

| Screen | Stitch ID | Screenshot folder |
|--------|-----------|-------------------|
| Environment Variables: api-gateway (Light) | `28b7917bd29348ddb7c4daa3f26aeb51` | `design_screenshots/env-vars/` |

## Dependencies

- IF-016, IF-014
