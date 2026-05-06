# IF-032: Authentication system

**Phase:** 8 — Auth & API
**Priority:** Critical
**Estimate:** L

## Description

Daemon-owned authentication: email/password login, session management, and the initial setup flow.

## Acceptance Criteria

- [ ] First-run detection: if no users exist, force admin account creation
- [ ] Admin account creation: email + password (min 12 chars, bcrypt/argon2 hash)
- [ ] Login endpoint: `POST /api/v1/auth/login` → returns session cookie
- [ ] Logout endpoint: `POST /api/v1/auth/logout` → invalidates session
- [ ] Session management:
  - Secure, HttpOnly, SameSite=Strict cookies
  - Session stored in database (id, user_id, expires_at, created_at)
  - Configurable session duration (default: 7 days)
  - Session refresh on activity
- [ ] Auth middleware on all `/api/v1/*` routes (except login, webhook endpoints)
- [ ] Role enforcement middleware: check user role against route requirements
- [ ] Rate limiting on login endpoint (5 attempts per minute per IP)
- [ ] Password change: `PUT /api/v1/auth/password`
- [ ] Login page in dashboard:
  - Email + password form
  - Error messages for wrong credentials
  - Redirect to dashboard on success
  - First-run: "Create Admin Account" form instead

## Dependencies

- IF-002, IF-006
