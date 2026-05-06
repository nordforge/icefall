# IF-022: Deploy view with build steps

**Phase:** 4 — Web Dashboard
**Priority:** High
**Estimate:** M

## Description

Real-time deploy view showing structured, collapsible build steps with streaming output within each step.

## Acceptance Criteria

- [ ] Build steps displayed as expandable rows:
  - Icon: checkmark (done), spinner (running), circle (pending), X (failed)
  - Step name
  - Duration (elapsed while running, final when done)
  - Status badge
- [ ] Clicking a step expands to show streaming log output (monospace, dark background)
- [ ] Running step auto-expanded, streaming output in real-time via SSE
- [ ] Failed step auto-expanded with error context highlighted
- [ ] Completed steps collapsed by default (expandable)
- [ ] Step order: Cloning → Detecting → Installing deps → Building → Generating image → Health check
- [ ] Overall deploy status header: "Deploying...", "Deploy successful", "Deploy failed"
- [ ] "Redeploy" button (triggers new build from same commit)
- [ ] "Cancel" button during build (sends cancel signal)
- [ ] Deploy metadata: commit SHA (linked to GitHub/GitLab), branch, trigger (webhook/manual/CLI), started at, duration
- [ ] Transition animation: step status change (pending → running → done)
- [ ] Light and dark theme verified

## Dependencies

- IF-016, IF-015, IF-010
