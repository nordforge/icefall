# IF-098: Update discovery & version checking

**Phase:** 16 — Self-Update
**Priority:** Critical
**Estimate:** M

## Description

Implement the server-side update discovery system. Icefall periodically checks GitHub Releases for new versions, verifies the release manifest signature, compares versions via semver, and exposes the result through API endpoints. This is the "does an update exist?" layer — it does not download or apply anything.

## Acceptance Criteria

### Database Schema
- [ ] New `update_state` table (singleton row):
  ```sql
  CREATE TABLE update_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      highest_seen_version TEXT NOT NULL,
      available_version TEXT,
      release_url TEXT,
      release_notes TEXT,
      channel TEXT NOT NULL DEFAULT 'stable',
      download_state TEXT NOT NULL DEFAULT 'none',
      last_check_at TEXT,
      last_update_at TEXT,
      last_update_version TEXT,
      error_message TEXT
  );
  ```
- [ ] New `skipped_updates` table for versions the admin chose to skip
- [ ] New `update_history` table for tracking past update attempts

### Background Version Check
- [ ] Background task checks every 6 hours (configurable)
- [ ] On dashboard load: if last check > 1 hour ago, trigger a fresh check
- [ ] Fetches latest release from GitHub Releases API: `GET https://api.github.com/repos/{owner}/icefall/releases/latest`
- [ ] Supports authenticated requests if a GitHub token is configured (higher rate limits)
- [ ] Filters releases by channel (`prerelease` flag for beta/nightly)
- [ ] Downloads and verifies the release manifest:
  1. Fetch `icefall-v{version}-manifest.json` from release assets
  2. Fetch `icefall-v{version}-manifest.json.sig`
  3. Verify Ed25519 signature against embedded `TRUSTED_RELEASE_KEYS`
  4. If no key matches → reject silently, log warning
- [ ] Version comparison via `semver` crate: `new_version > current_version`
- [ ] Enforces version monotonicity: rejects `version <= highest_seen_version`
- [ ] Updates `highest_seen_version` after successful manifest verification (before download)
- [ ] Respects `skipped_updates` — skipped versions are not reported as available
- [ ] On rate limit (HTTP 403) or network error: silent back-off, retry at next interval

### API Endpoints
- [ ] `GET /api/v1/system/update/check` — trigger manual check, return result:
  ```json
  {
    "data": {
      "available": true,
      "current_version": "0.3.2",
      "latest_version": "0.4.0",
      "changelog_highlights": ["Zero-downtime deploys", "PostgreSQL 17 support"],
      "changelog_url": "https://github.com/.../releases/tag/v0.4.0",
      "breaking": false,
      "breaking_changes": null,
      "published_at": "2026-05-10T14:30:00Z",
      "checked_at": "2026-05-10T15:00:00Z"
    }
  }
  ```
- [ ] `GET /api/v1/system/update/status` — current update operation state (idle/in_progress/etc.)
- [ ] `POST /api/v1/system/update/skip` — skip a specific version
- [ ] `GET /api/v1/system/update/history` — past update attempts with status and duration
- [ ] `GET /api/v1/system/update/preferences` — get update preferences (channel, auto-update settings)
- [ ] `PATCH /api/v1/system/update/preferences` — update preferences

### SSE Events
- [ ] `system.update.available` — pushed when a new version is detected (admin connections only)

### Auth & Permissions
- [ ] All update endpoints require `admin` role
- [ ] Non-admin users receive no update-related SSE events

## Technical Notes

- Use `reqwest` for GitHub API calls (already in deps)
- Use `semver` crate for version parsing and comparison
- Use `ed25519-dalek` for manifest signature verification
- Parse changelog highlights from release body markdown (first 5 list items)
- `min_supported_version` in manifest: if current version is below this, flag it (direct update required, no skip)
- GitHub's unauthenticated rate limit is 60 req/hr — at 1 check/6hr this is fine

## Out of Scope

- Downloading the update binary (IF-099)
- Applying the update (IF-100)
- Dashboard UI for update notifications (IF-102)
- Auto-update scheduling (IF-103)

## Dependencies

- IF-097 (release pipeline — need signed releases to check against)
