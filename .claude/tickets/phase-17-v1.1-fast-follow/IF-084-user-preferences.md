# IF-084: User preferences

**Phase:** 17 — v1.1 Fast Follow
**Priority:** Low
**Estimate:** S

## Description

Per-user preferences stored in the database: theme (light/dark/system), timezone, notification email preferences, and default project. Currently theme is localStorage-only and timezone is instance-wide.

## Acceptance Criteria

- [ ] New `user_preferences` table: `user_id` (FK), `key` TEXT, `value` TEXT
- [ ] Or simpler: `preferences` JSON column on the users table
- [ ] Preferences page (section in profile):
  - Theme: Light / Dark / System (currently localStorage, persist to DB so it syncs across devices)
  - Timezone: per-user override of the instance timezone
  - Default project: which project to show on dashboard home
  - Email notifications: opt in/out of deploy notifications for own apps
- [ ] `GET /api/v1/users/me/preferences` — get preferences
- [ ] `PUT /api/v1/users/me/preferences` — update preferences
- [ ] Preferences loaded on login and applied client-side

## Dependencies

- IF-083 (user profile page)
