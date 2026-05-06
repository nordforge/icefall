# IF-034: User management and roles

**Phase:** 8 — Auth & API
**Priority:** High
**Estimate:** M

## Description

Admin can invite users, assign roles, and manage accounts. Role enforcement across all API endpoints.

## Acceptance Criteria

- [ ] API endpoints:
  - `GET /api/v1/users` — list users (admin only)
  - `POST /api/v1/users/invite` — invite user by email with role (admin only)
  - `PUT /api/v1/users/:id/role` — change user role (admin only)
  - `DELETE /api/v1/users/:id` — deactivate user (admin only)
  - `GET /api/v1/users/me` — current user profile
  - `PUT /api/v1/users/me` — update own profile (email, password)
- [ ] Invitation flow:
  1. Admin invites by email + role
  2. Invitation record created (with token, expires in 7 days)
  3. Email sent with setup link (if SMTP configured) or admin shares link manually
  4. User visits link → create password → account active
- [ ] Roles enforced at API middleware level:
  - Admin: all endpoints
  - Deployer: apps CRUD, deploys, env vars, databases, logs (not user management or global settings)
  - Viewer: GET endpoints only (apps, logs, status, metrics)
- [ ] Users UI page (admin only):
  - User list: email, role, status (active/invited), last login
  - Invite form: email + role selector
  - Edit role dropdown
  - Deactivate button with confirmation
- [ ] Cannot deactivate last admin (prevent lockout)
- [ ] Light and dark theme verified for users page

## Dependencies

- IF-032, IF-016
