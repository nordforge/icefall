# IF-053: Onboarding Step 2 — Server environment check

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

Automated health check that verifies the server environment is ready for deployments. Runs all checks automatically on page load — the user just watches. This builds confidence that everything is wired correctly before they start deploying.

## Acceptance Criteria

- [ ] Step is titled "Checking your server"
- [ ] Subtitle: "Making sure everything is ready for deployments."
- [ ] Checks run automatically on mount — no manual trigger needed
- [ ] Checklist UI: vertical list of check items, each with status icon:
  - Spinner while checking
  - Green checkmark on pass
  - Red X on fail with inline error message + suggested fix
  - Amber warning on non-critical issue
- [ ] Required checks (must all pass):
  - **Docker Engine** — reachable via socket, version >= 20.x. Show version on pass. On fail: "Docker is not running. Start it with `sudo systemctl start docker`"
  - **Docker permissions** — can pull images, create containers. On fail: "Icefall user needs Docker access. Run `sudo usermod -aG docker icefall`"
  - **Disk space** — >= 5GB free on data partition. Show available space. Warning at < 10GB, fail at < 5GB
  - **Network** — outbound HTTPS works (can reach Docker Hub / ghcr.io). On fail: "Cannot reach container registries. Check firewall rules."
- [ ] Optional checks (warnings only, don't block):
  - **RAM** — >= 1GB recommended. Show total/available. Warning if < 1GB
  - **CPU cores** — show count, warning if only 1 core
  - **Caddy** — running and reachable. Warning if not (HTTPS won't work but HTTP deploys still function)
  - **Swap** — warn if no swap configured on < 2GB RAM systems
- [ ] Backend endpoint: `POST /api/onboarding/server-check` runs all checks, returns results array
- [ ] Each check result includes: `id`, `name`, `status` (pass/warn/fail), `message`, `detail` (technical info like version numbers)
- [ ] "Continue" button enabled only when all required checks pass
- [ ] "Re-run checks" button for retry after fixing issues
- [ ] If all checks pass immediately, show a brief "All good!" animation then auto-enable Continue
- [ ] Results displayed with server info summary card: hostname, OS, IP, Docker version, Caddy version (when available)

## Out of Scope

- Automatic remediation (we tell the user what to fix, they fix it)
- Port scanning (handled by domain setup step)

## Dependencies

- IF-050 (state machine), IF-051 (UI shell), IF-004 (Docker client)
