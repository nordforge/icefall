# IF-083: User profile / account settings page

**Phase:** 17 — v1.1 Fast Follow
**Priority:** High
**Estimate:** M

## Description

Add a dedicated user profile page where authenticated users can manage their own account: change password, update email, manage 2FA, view linked OAuth providers, and manage their API tokens. Currently these features are scattered or missing — password change doesn't have a UI, 2FA setup lives in the global settings page, and there's no profile page at all.

## Acceptance Criteria

### Profile Page (`/profile` or `/account`)
- [ ] New page accessible from the sidebar or user avatar/menu
- [ ] Sections:
  - **Account Info** — display email, role, account creation date
  - **Change Password** — current password + new password + confirm new password
  - **Change Email** — new email input (requires password confirmation)
  - **Two-Factor Authentication** — current 2FA status, setup/disable/regenerate backup codes (move from global settings)
  - **Connected Accounts** — list linked OAuth providers (GitHub, Google) with unlink buttons, link new provider buttons
  - **API Tokens** — list, create, revoke tokens (move from Users page to profile)
  - **Sessions** — list active sessions with device/IP info, "Sign out everywhere" button
  - **Danger Zone** — delete account (with confirmation, admin accounts cannot be deleted if they're the last admin)

### Backend
- [ ] `PUT /api/v1/users/me/password` — change password (requires current password)
- [ ] `PUT /api/v1/users/me/email` — change email (requires password)
- [ ] `GET /api/v1/users/me/sessions` — list active sessions
- [ ] `DELETE /api/v1/users/me/sessions` — revoke all sessions except current
- [ ] `DELETE /api/v1/users/me` — delete own account (with safeguards)

### Navigation
- [ ] User avatar/name in sidebar footer or header
- [ ] Click opens profile page
- [ ] "Sign Out" button in the profile page

## Technical Notes

- The 2FA section should reuse or import the `TwoFactorSection` component from settings
- API tokens management already exists in the Users page — move it to profile so each user manages their own
- The Users page (admin) should remain for managing other users (invite, change roles, deactivate)

## Out of Scope

- Profile photo / avatar upload
- User preferences (theme, language, notification preferences per user)
- Activity log / audit trail per user

## Dependencies

- IF-032 (authentication), IF-075 (2FA), IF-076 (OAuth)
