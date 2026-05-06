# Icefall

A fast, simple, self-hosted deployment platform. Push code, get a URL.

Icefall is built for developers who want Vercel/Railway-level simplicity on their own infrastructure. No complexity, no cryptic errors — just deployments that work.

## Status

🚧 **Early development** — not yet usable. See [PRD.md](./PRD.md) for the full product plan and [DESIGN.md](./DESIGN.md) for the visual design system.

## What it does

- **Git-push deploys** — connect a repo, push to main, your app is live
- **Preview environments** — feature branches auto-deploy with isolated config
- **Framework detection** — Astro, Next.js, React, Vue, Nuxt, Node.js, Docker, static sites
- **Managed databases** — one-click Postgres, MySQL, Redis, MongoDB with auto-backups
- **Real-time build logs** — structured, collapsible steps that tell you exactly what went wrong
- **Automatic HTTPS** — powered by Caddy, zero SSL config
- **Health monitoring** — TCP + Docker health checks with email/webhook notifications

## Architecture

- **Rust daemon** — build engine, container management, API server
- **Astro + Preact dashboard** — lightweight admin UI with light/dark themes
- **Caddy** — reverse proxy with automatic HTTPS
- **Docker** — container runtime (managed via API, not CLI)
- **SQLite** — zero-ops default database (Postgres-ready for clusters)

## Install

> Coming soon

```bash
curl -fsSL https://icefall.dev/install.sh | sh
```

**Requirements:** Linux (Ubuntu 22.04+, Debian 12+, RHEL 9+, Fedora 38+, Arch), Docker, 1 vCPU / 1GB RAM minimum.

## Attribution

Icefall is free and open source under the [MIT License](./LICENSE).

If you use Icefall commercially, please credit **"Powered by Icefall"** with a link to this project. This isn't a legal requirement — just a way to support the project and help others discover it.

## License

[MIT](./LICENSE)
