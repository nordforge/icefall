# IF-037: CLI deploy command

**Phase:** 9 — CLI
**Priority:** High
**Estimate:** M

## Description

`icefall deploy` command that deploys the current directory to the server. Tarballs the working directory, uploads to the daemon API, and streams build progress.

## Acceptance Criteria

- [ ] `icefall deploy` in a directory:
  1. Read `.icefall.toml` or detect app by git remote URL
  2. Tarball the working directory (respecting `.gitignore` and `.dockerignore`)
  3. Upload to `POST /api/v1/apps/:id/deploys/upload`
  4. Stream build progress to terminal via SSE (structured steps with colors)
  5. Print final status: URL, deploy ID, duration
- [ ] `icefall deploy --branch <branch>` deploys a specific branch from the remote repo
- [ ] `.icefall.toml` file for project-level config (app ID, server URL)
- [ ] `icefall deploy --init` creates the app on the server if it doesn't exist (interactive setup)
- [ ] Auth: uses stored API token (from `icefall login`)
- [ ] `icefall login` — prompt for server URL + API token, store in `~/.config/icefall/credentials`
- [ ] Terminal output: colored, structured build steps matching the web UI
- [ ] Error output: clear error message with context (not raw HTTP errors)
- [ ] Exit code: 0 on success, 1 on build failure, 2 on connection/auth error

## Dependencies

- IF-001, IF-035, IF-010
