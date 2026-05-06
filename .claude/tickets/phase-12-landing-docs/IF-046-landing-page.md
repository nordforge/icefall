# IF-046: Landing page (icefall.dev)

**Phase:** 12 — Landing & Docs
**Priority:** High
**Estimate:** M

## Description

Marketing landing page for the project at `icefall.dev`. Should communicate what Icefall is, why it exists, and how to get started — in under 10 seconds of scanning.

## Acceptance Criteria

- [ ] Built with Astro (static, no JS required for content)
- [ ] Sections:
  - **Hero** — tagline, one-sentence description, install command (click-to-copy), "View Docs" CTA
  - **Problem** — brief pain points with existing tools (complexity, cryptic errors, performance)
  - **Features** — visual grid of key features with icons (git-push deploys, preview envs, managed DBs, health monitoring, etc.)
  - **How it works** — 3-step flow (install → connect repo → push), with terminal/UI mockups
  - **Architecture** — minimal diagram showing Rust daemon + Caddy + Docker
  - **Comparison** — honest comparison table vs Coolify, Dokku, CapRover (features, tech stack, ease of use)
  - **Open source** — MIT license, contribution CTA, GitHub link
  - **Footer** — GitHub, docs link, attribution request
- [ ] Light and dark theme with system preference detection
- [ ] Glacial design language from DESIGN.md (colors, typography, spacing)
- [ ] Mobile responsive
- [ ] Page weight < 100KB (no heavy assets)
- [ ] Lighthouse score: 100/100/100/100
- [ ] OG meta tags + social card image
- [ ] `install.sh` download link or inline display
- [ ] No tracking, no cookies, no analytics (or privacy-friendly: Plausible/Umami)
- [ ] Hosted on the same domain (`icefall.dev`), docs at `/docs`

## Dependencies

- None (can be built independently, uses design tokens from DESIGN.md)
