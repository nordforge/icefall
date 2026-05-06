# IF-052: Onboarding Step 1 — Create admin account

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

First onboarding step. The user creates their admin account. This is the only user that exists initially and has full control. The form must be simple but secure — no optional fields, no profile pictures, no bio. Just what's needed to log in.

## Acceptance Criteria

- [ ] Step is titled "Create your account"
- [ ] Subtitle: "This will be the admin account for your Icefall server."
- [ ] Form fields:
  - **Email** — required, validated as email format, autofocused
  - **Password** — required, minimum 8 characters, strength indicator bar below the field
  - **Confirm password** — required, must match password field
- [ ] Password strength indicator:
  - Red (weak): < 8 chars or common password
  - Amber (fair): 8+ chars, only one character type
  - Green (strong): 8+ chars, mixed case + number or symbol
- [ ] Real-time validation: email format check on blur, password match check on input, strength on input
- [ ] Submit calls `POST /api/onboarding/admin` with email + password
- [ ] Backend:
  - Creates user with role `admin`
  - Hashes password with Argon2id
  - Creates session (HttpOnly cookie) — user is now logged in
  - Marks step `admin_account` as complete
- [ ] Error handling:
  - Show inline error if email is already taken (edge case: interrupted previous attempt)
  - Show inline error if password is too weak
  - Show toast if API call fails
- [ ] On success: automatically advances to Step 2 (no "success" interstitial)
- [ ] This step is NOT skippable — required for all setups
- [ ] Password field has show/hide toggle (eye icon)

## Out of Scope

- OAuth/social login during onboarding (added post-setup in Settings)
- Additional user invites (done from Users page after onboarding)
- Profile information (name, avatar — not needed for setup)

## Dependencies

- IF-050 (state machine), IF-051 (UI shell), IF-032 (auth system)
