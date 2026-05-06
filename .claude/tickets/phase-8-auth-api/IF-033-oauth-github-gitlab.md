# IF-033: OAuth integration (GitHub/GitLab)

**Phase:** 8 — Auth & API
**Priority:** Medium
**Estimate:** M

## Description

Optional OAuth login via GitHub and GitLab. Admin configures OAuth app credentials in settings, users can then log in via OAuth.

## Acceptance Criteria

- [ ] Settings page section: "OAuth Providers"
  - GitHub: Client ID + Client Secret input
  - GitLab: Client ID + Client Secret + Instance URL (for self-hosted GitLab)
- [ ] OAuth flow:
  1. User clicks "Log in with GitHub/GitLab"
  2. Redirect to provider's authorization URL
  3. Provider redirects back with code
  4. Daemon exchanges code for access token
  5. Fetch user profile (email)
  6. Match to existing user by email, or create invite-pending record
  7. Create session, redirect to dashboard
- [ ] OAuth endpoints:
  - `GET /api/v1/auth/oauth/:provider` — initiate OAuth redirect
  - `GET /api/v1/auth/oauth/:provider/callback` — handle callback
- [ ] OAuth credentials encrypted at rest
- [ ] User can link/unlink OAuth providers in their profile
- [ ] Login page: show OAuth buttons only when providers are configured
- [ ] Error handling: clear messages for misconfigured OAuth (wrong redirect URL, invalid credentials)

## Dependencies

- IF-032
