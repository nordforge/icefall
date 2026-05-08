# IF-065: Deploy pre-built Docker images

**Phase:** 15 — Critical Gaps
**Priority:** Critical
**Estimate:** M

## Description

Add the ability to deploy pre-built Docker images from any registry without requiring a git repository. This transforms Icefall from a CI/CD tool into a true PaaS — half of self-hosted apps ship as Docker images (Ghost, Plausible, Uptime Kuma, Umami). The `DeployManager::deploy` already accepts an `image_ref`.

## Acceptance Criteria

### App Creation Flow
- [ ] Step 1 of the app creation wizard gets a new choice: "Deploy from Git" or "Deploy Docker Image"
- [ ] When "Deploy Docker Image" is selected:
  - Image URL input (e.g., `ghost:5-alpine`, `plausible/analytics:v2.1`, `ghcr.io/org/app:latest`)
  - Image tag input (default: `latest`, auto-populated if included in URL)
  - Optional: registry authentication (username + password/token) for private registries
  - Port mapping: container port (required) and optional host port
- [ ] Skip build settings step (no build command, no framework detection)
- [ ] Environment variables step remains the same
- [ ] Review step shows image reference instead of git repo

### App Detail Page
- [ ] Overview tab: show image reference + tag instead of git repo + branch for image-based apps
- [ ] Deploy action: pulls the latest image (or specified tag) and creates a new container
- [ ] "Update Image" action: pull a newer version of the same tag and redeploy
- [ ] Settings tab: edit image URL, tag, registry auth, port mapping

### Backend
- [ ] New app type field or flag to distinguish git-based vs. image-based apps
- [ ] Deploy flow for image apps: `docker pull` → create container → health check → route traffic
- [ ] No build step — skip the entire build pipeline (framework detection, Dockerfile generation, image build)
- [ ] Support Docker Hub (default), GitHub Container Registry (ghcr.io), GitLab Registry, and any custom registry URL

### API
- [ ] `POST /api/v1/apps` accepts `image_ref` field as alternative to `git_url`
- [ ] `POST /api/v1/apps/{id}/deploys` for image apps: pulls image and deploys

### General
- [ ] Light and dark theme verified
- [ ] Mobile responsive

## Technical Notes

- `DeployManager::deploy` already accepts an `image_ref` — the code path exists
- Bollard's `create_image` (pull) supports registry auth via `AuthConfig`
- For private registries, store credentials encrypted (AES-256-GCM, same as env vars)
- The app creation wizard in `dashboard/src/islands/app-detail/` needs a branch at step 1

## Out of Scope

- Docker Compose (multi-container stacks) — separate v1.1 ticket
- Automatic image update checks (e.g., Watchtower-style)
- Image vulnerability scanning
- Building from Dockerfile in a git repo (already supported)

## Dependencies

- IF-010 (image builder — for the pull path), IF-018 (app create flow)
