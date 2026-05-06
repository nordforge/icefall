# IF-010: Docker image build orchestrator

**Phase:** 2 — Build Engine
**Priority:** Critical
**Estimate:** M

## Description

Orchestrate the full image build process: clone repo → detect framework → generate Dockerfile → build image → tag and store. Stream build output as structured steps.

## Acceptance Criteria

- [ ] Git clone module (clone repo, checkout branch/SHA, with SSH key or token auth)
- [ ] Build pipeline: clone → detect → generate Dockerfile → docker build → tag
- [ ] Image tagging: `icefall/<app-name>:<deploy-id>` and `icefall/<app-name>:latest`
- [ ] Structured build steps emitted as events:
  1. Cloning repository
  2. Detecting framework
  3. Installing dependencies
  4. Building
  5. Generating container image
  6. Health check
- [ ] Each step has: name, status (pending/running/done/failed), duration, output stream
- [ ] Build output captured line-by-line for streaming to UI
- [ ] Secret redaction in build output (mask env var values, tokens)
- [ ] Build timeout (configurable, default: 10 minutes)
- [ ] Build failure captures last N lines of output for error context
- [ ] Old images cleaned up (keep last N per app, configurable)
- [ ] Build result stored in deploys table

## Dependencies

- IF-004, IF-008, IF-009, IF-002
