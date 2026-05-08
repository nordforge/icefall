# IF-066: Container rollback

**Phase:** 15 — Critical Gaps
**Priority:** High
**Estimate:** M

## Description

Implement one-click rollback to a previous deployment. The deploy manager keeps previous Docker images locally and `DeployError::Rollback` is already defined. Without rollback, a bad deploy means SSH + manual Docker commands — which defeats the purpose of a PaaS.

## Acceptance Criteria

### Deploy History UI
- [ ] "Rollback" button on each successful past deploy in the deploy history list
- [ ] Rollback button not shown on:
  - The currently active deploy
  - Failed deploys
  - Deploys whose images have been cleaned up
- [ ] Clicking rollback shows confirmation: "Roll back to deploy #{id} from {timestamp}? This will create a new deployment using the previous image."
- [ ] Rollback creates a new deploy entry in the history (not a hidden operation)
- [ ] Rollback deploy shows "Rollback from #{original_deploy_id}" label

### Backend
- [ ] New endpoint: `POST /api/v1/apps/{id}/deploys/{deploy_id}/rollback`
- [ ] Rollback flow:
  1. Verify the target deploy's Docker image still exists locally
  2. Create a new deploy record with type "rollback" and reference to source deploy
  3. Deploy the previous image using the same environment variables as the target deploy
  4. Zero-downtime switch: start new container, health check, switch Caddy route, stop current container
  5. Emit SSE events for rollback progress
- [ ] If the target image no longer exists: return error "Image no longer available. Deploy from source instead."
- [ ] Rollback uses the env vars from the target deploy (snapshot), not current env vars
  - Show a note in the UI: "Environment variables will be restored to the state at deploy #{id}"

### General
- [ ] Role enforcement: deployer and admin can rollback, viewer cannot
- [ ] Light and dark theme verified

## Technical Notes

- `DeployError::Rollback` is defined in the deploy manager but rollback execution is not implemented
- Previous deploy images are kept locally by Docker — they're only cleaned up by Docker's image pruning
- The deploy history table should already have the `image_ref` for each deploy
- Reuse the existing deploy pipeline but skip the build step (similar to image-based deploy)
- Env var snapshot: each deploy stores an `env_snapshot` TEXT column (JSON array of `KEY=VALUE` strings) captured at deploy time. On rollback, the snapshot from the target deploy is passed directly to the container instead of reading current env vars. This matches Vercel's behavior where rolling back restores the exact environment the deploy ran with.

## Out of Scope

- Automatic rollback on health check failure (future enhancement)
- Rollback of database schema changes
- Keeping N versions of images (Docker's default retention is fine for now)

## Dependencies

- IF-011 (container deployment), IF-022 (deploy view)
