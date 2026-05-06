# IF-031: Database management UI

**Phase:** 7 — Databases
**Priority:** High
**Estimate:** M

## Description

Dashboard pages for database provisioning, management, and backup viewing.

## Acceptance Criteria

- [ ] Databases list page (sidebar nav item):
  - Card per database: name, type icon, status dot, linked apps, created date
  - "Add Database" button
- [ ] Add database flow:
  - Select type (Postgres/MySQL/Redis/MongoDB) with icons
  - Name input (auto-generated default)
  - Optional: link to existing app
  - Resource configuration (memory, with defaults)
  - Create button → provisions and shows result
- [ ] Database detail page:
  - Connection string (click-to-copy, masked by default, click to reveal)
  - Status and resource usage (CPU/RAM)
  - Linked apps list (with link/unlink actions)
  - Backup section:
    - Backup schedule display + edit
    - Backup history table (timestamp, size, status, download button, restore button)
    - "Backup Now" button
  - Settings: rename, change resource limits
  - Danger zone: delete database (confirmation dialog warning about data loss)
- [ ] Light and dark theme verified

## Dependencies

- IF-016, IF-029, IF-030
