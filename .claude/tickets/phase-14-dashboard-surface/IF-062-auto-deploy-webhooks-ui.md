# IF-062: Auto-deploy toggle & webhook URL display

**Phase:** 14 — Dashboard Surface
**Priority:** Critical
**Estimate:** S

## Description

The webhook receiver is fully built in the backend (GitHub + GitLab, HMAC-SHA256 validation, branch routing). Users need a dashboard toggle to enable auto-deploy and see the webhook URL + secret to configure in their git provider.

## Acceptance Criteria

- [ ] New section in app settings tab: "Auto-Deploy"
- [ ] Toggle: "Auto-deploy on push" (default: off)
- [ ] When enabled, display:
  - Webhook URL for GitHub: `https://{base_domain}/api/v1/webhooks/{app_id}/github`
  - Webhook URL for GitLab: `https://{base_domain}/api/v1/webhooks/{app_id}/gitlab`
  - Webhook secret (masked by default, click to reveal, copy button)
  - Content type hint: `application/json`
  - Events hint: "Push events" for GitHub, "Push hooks" for GitLab
- [ ] "Copy" button next to each webhook URL and secret
- [ ] Brief setup instructions shown inline:
  - GitHub: "Go to your repo → Settings → Webhooks → Add webhook"
  - GitLab: "Go to your project → Settings → Webhooks → Add new webhook"
- [ ] Branch filter display: "Deploys on push to: `{branch_name}`"
- [ ] Webhook secret is auto-generated when auto-deploy is first enabled (if not already set)
- [ ] Save persists auto-deploy state and webhook secret to app model
- [ ] Light and dark theme verified

## Technical Notes

- Backend webhook handlers: `src/api/routes/webhooks.rs`
- GitHub handler validates `X-Hub-Signature-256` header using HMAC-SHA256
- GitLab handler validates `X-Gitlab-Token` header
- The webhook receiver checks `app.auto_deploy` flag and `app.git_branch` for branch matching
- Webhook secret is stored encrypted on the app (AES-256-GCM via the existing encryption layer)

## Out of Scope

- Webhook delivery history / debug log
- Bitbucket / Gitea / other providers
- Branch pattern matching (deploys only on configured branch)
- Manual webhook test button

## Dependencies

- IF-012 (webhook receiver), IF-019 (app detail page)
