# IF-021: Log viewer component

**Phase:** 4 — Web Dashboard
**Priority:** High
**Estimate:** M

## Description

Full-featured log viewer for runtime container logs with search, filter, and real-time streaming.

## Acceptance Criteria

- [ ] Full-width dark background (even in light theme, per DESIGN.md)
- [ ] Monospace font (JetBrains Mono, 13px)
- [ ] Line numbers in muted color, left-aligned
- [ ] Timestamps per line in secondary color
- [ ] Real-time log streaming via SSE (new lines append at bottom)
- [ ] Auto-scroll to bottom (with "stick to bottom" toggle)
- [ ] Manual scroll up pauses auto-scroll, "Jump to latest" button appears
- [ ] Search bar pinned to top:
  - Text search with result count
  - Navigate between matches (up/down arrows)
  - Highlighted matches in the log
- [ ] Filter by level: stdout / stderr (or info / warn / error if parseable)
- [ ] Error lines highlighted with red left-border
- [ ] Warning lines highlighted with amber left-border
- [ ] Copy line(s) to clipboard
- [ ] Download full log as text file
- [ ] Performance: handle 100K+ lines without freezing (virtualized list)
- [ ] Light and dark theme verified (log viewer stays dark in both)

## Design References (Stitch — Light Mode)

| Screen | Stitch ID | Screenshot folder |
|--------|-----------|-------------------|
| Log Viewer: api-gateway (Light) | `dcb5e5c299ab4c919e1b0688de87ee8e` | `design_screenshots/log-viewer/` |

## Dependencies

- IF-016, IF-015
