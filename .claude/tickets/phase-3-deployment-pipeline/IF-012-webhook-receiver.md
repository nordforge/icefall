# IF-012: Git webhook receiver

**Phase:** 3 — Deployment Pipeline
**Priority:** Critical
**Estimate:** M

## Description

HTTP endpoint that receives webhook payloads from GitHub and GitLab. Validates the payload, determines which app and branch were pushed to, and triggers the appropriate build/deploy pipeline.

## Acceptance Criteria

- [ ] `POST /api/v1/webhooks/github` endpoint
- [ ] `POST /api/v1/webhooks/gitlab` endpoint
- [ ] Webhook secret validation (HMAC-SHA256 for GitHub, token for GitLab)
- [ ] Parse push event payload:
  - Repository URL
  - Branch name
  - Commit SHA
  - Committer info
- [ ] Match incoming webhook to registered app by repo URL
- [ ] Production branch push → trigger production deploy
- [ ] Feature branch push (if preview enabled + branch matches pattern) → trigger preview deploy
- [ ] Branch delete event → destroy preview environment if exists
- [ ] Merge event → destroy preview environment for merged branch
- [ ] Ignore pushes to non-matched branches (no unnecessary builds)
- [ ] Webhook registration instructions in app settings UI
- [ ] Unique webhook URL per app (includes app ID or secret token)
- [ ] Rate limiting: max 1 concurrent build per app (queue subsequent pushes)

## Dependencies

- IF-006, IF-010, IF-011
