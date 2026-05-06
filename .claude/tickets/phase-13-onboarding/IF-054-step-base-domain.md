# IF-054: Onboarding Step 3 — Base domain configuration

**Phase:** 13 — Onboarding
**Priority:** High
**Estimate:** M

## Description

Optional step where the user configures a base domain for their Icefall instance. This enables HTTPS, custom domains for apps, and wildcard subdomains. Skipping this means the server runs on IP:port with HTTP only — fine for testing but not production.

## Acceptance Criteria

- [ ] Step is titled "Set up your domain"
- [ ] Subtitle: "Connect a domain for HTTPS and custom app URLs. You can skip this and add one later."
- [ ] This step is OPTIONAL — "Skip for now" button clearly visible
- [ ] Form fields:
  - **Base domain** input — placeholder "icefall.example.com" (JetBrains Mono)
  - Helper text: "Apps will be available at {app-name}.{base-domain}"
- [ ] After entering domain, show DNS instructions card:
  - "Point these DNS records to your server:"
  - A record: `{domain}` -> `{server-ip}` (with copy button)
  - A record (wildcard): `*.{domain}` -> `{server-ip}` (with copy button)
  - Server IP is auto-detected and filled in
- [ ] "Verify DNS" button that checks:
  - Resolves domain A record to this server's IP
  - Resolves wildcard `*.{domain}` to this server's IP
  - Shows real-time status: checking -> success/failed per record
- [ ] DNS propagation note: "DNS changes can take up to 48 hours, but usually resolve in minutes."
- [ ] "Verify" button shows polling state — re-checks every 5 seconds for up to 2 minutes
- [ ] On successful verification:
  - Save domain to config
  - Trigger Caddy HTTPS certificate provisioning
  - Show "HTTPS certificate provisioning..." status
  - Wait for cert (up to 60s timeout) then show success
- [ ] If verification fails:
  - Show which records are wrong with expected vs actual values
  - "I'll fix this later" option that saves the domain but marks it unverified
  - User can still continue (domain saved, will auto-verify later)
- [ ] If user skips:
  - No domain configured
  - Show brief note: "You can add a domain anytime from Settings > Domains"
  - Server stays accessible on `http://{ip}:{port}`
- [ ] Backend: `POST /api/onboarding/domain` saves domain, `POST /api/onboarding/domain/verify` runs DNS check

## Out of Scope

- Adding domains for individual apps (that's in the app Domains tab)
- Cloudflare/Route53 API integration for automatic DNS setup
- Multiple base domains

## Dependencies

- IF-050 (state machine), IF-051 (UI shell), IF-005 (Caddy client), IF-023 (domain management)
