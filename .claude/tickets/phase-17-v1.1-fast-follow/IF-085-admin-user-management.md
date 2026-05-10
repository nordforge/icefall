# IF-085: Enhanced admin user management

**Phase:** 17 — v1.1 Fast Follow
**Priority:** Medium
**Estimate:** M

## Description

Improve the admin Users page with better user management: password reset for other users, 2FA reset, user activity overview, and registration controls.

## Acceptance Criteria

### Users Page (Admin)
- [ ] User list with columns: Email, Role, 2FA Status, OAuth Providers, Last Login, Status (active/inactive), Created
- [ ] Actions per user:
  - Change role (existing)
  - Deactivate / reactivate (existing)
  - Reset password — generate a temporary password or send a reset link
  - Reset 2FA — disable 2FA for a locked-out user (admin only)
  - Delete user — permanent removal with confirmation (cannot delete last admin)
- [ ] Bulk actions: select multiple users, change role, deactivate

### Registration Controls
- [ ] Setting: "Allow registration" toggle in platform settings
  - When off: only admin invites can create new users
  - When on: anyone can register (with optional email domain restriction)
- [ ] Setting: "Allowed email domains" — restrict registration to specific domains (e.g., `@company.com`)
- [ ] Setting: "Default role for new users" — viewer / deployer

### Invite Flow Improvements
- [ ] Invite sends an actual email (uses the SMTP notification channel)
- [ ] Invite link with expiry (24h default)
- [ ] Pending invites list with resend / revoke

### Backend
- [ ] `POST /api/v1/users/{id}/reset-password` — admin generates temp password
- [ ] `DELETE /api/v1/users/{id}/2fa` — admin resets 2FA (already exists from IF-075)
- [ ] `PUT /api/v1/settings/registration` — update registration settings
- [ ] `GET /api/v1/settings/registration` — get registration settings

## Out of Scope

- LDAP / Active Directory integration
- SCIM provisioning
- Granular per-resource permissions (RBAC beyond admin/deployer/viewer)

## Dependencies

- IF-034 (user management), IF-075 (2FA), IF-067 (SMTP notifications)
