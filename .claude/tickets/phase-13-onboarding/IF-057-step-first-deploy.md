# IF-057: Onboarding Step 6 — Watch first deploy

**Phase:** 13 — Onboarding
**Priority:** Critical
**Estimate:** M

## Description

The user watches their first deploy happen in real-time. This step is not a form — it's a live view of the build process with contextual explanations for each build step. The goal is to demystify what Icefall does and build confidence. On success, the user sees their app running and clicks through to it.

## Acceptance Criteria

- [ ] Step is titled "Deploying {app-name}..."
- [ ] Subtitle changes dynamically: "Building..." -> "Almost there..." -> "Your app is live!"
- [ ] Reuses the build steps component from the Deploy View (IF-022) but embedded within the onboarding shell
- [ ] Build steps shown with real-time SSE streaming:
  1. Detecting framework — with annotation: "Icefall inspects your code to determine how to build it"
  2. Installing dependencies — with annotation: "Installing packages from your lockfile"
  3. Building application — with annotation: "Compiling your app for production"
  4. Generating container image — with annotation: "Packaging your app into a Docker container"
  5. Health check — with annotation: "Verifying your app starts correctly"
- [ ] Each annotation is a small muted text line below the step — educational, one sentence max
- [ ] Active step shows streaming log output (collapsible, expanded by default for active step)
- [ ] Log area uses dark terminal styling (#1C2128 bg) even in light theme

### On success:
- [ ] Confetti/celebration moment — subtle, one-shot animation (CSS only, no library). A simple checkmark-to-sparkle transition is enough
- [ ] "Your app is live!" heading with green success indicator
- [ ] App URL shown prominently as a clickable link:
  - If domain configured: `https://{app-name}.{base-domain}`
  - If no domain: `http://{server-ip}:{port}`
- [ ] "Open your app" primary button (opens in new tab)
- [ ] "Go to Dashboard" secondary button -> completes onboarding, redirects to main dashboard
- [ ] Both buttons visible simultaneously — user should open their app AND proceed

### On failure:
- [ ] Failed step expanded automatically showing error log
- [ ] Error summary card below: what went wrong (human-readable), suggested fix
- [ ] Common failure patterns with specific guidance:
  - Build command failed -> "Check your build command in package.json"
  - Dependencies failed -> "Try running `npm install` locally first to verify"
  - Health check failed -> "Your app didn't respond on the expected port. Check PORT env var"
  - Dockerfile error -> "There's a syntax error in your Dockerfile at line X"
- [ ] "Retry Deploy" button to try again
- [ ] "Skip & Continue" link (marks onboarding complete even with failed deploy — user can fix later)
- [ ] "Get Help" link -> opens docs in new tab

### Timing
- [ ] If deploy takes > 3 minutes: show reassurance text "Larger projects take a bit longer. This is normal."
- [ ] If deploy takes > 5 minutes: show "Still working on it..." with link to check logs in full Deploy View

## Out of Scope

- Rollback (first deploy, nothing to roll back to)
- Environment variable changes mid-deploy
- Scaling configuration

## Dependencies

- IF-050 (state machine), IF-051 (UI shell), IF-011 (container deploy), IF-015 (SSE streaming), IF-022 (deploy view components)
