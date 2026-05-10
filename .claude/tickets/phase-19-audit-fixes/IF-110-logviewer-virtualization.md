# IF-110: Virtualize LogViewer for 10K+ lines

**Phase:** 19 — Audit Fixes
**Priority:** High
**Estimate:** M

## Description

The performance audit found the LogViewer renders up to 10,000 log entries as flat DOM nodes (50K+ DOM elements with 4 spans per line). Every SSE message triggers a full re-render. This causes jank and high memory usage during active builds.

## Acceptance Criteria

- [ ] Implement windowed rendering: only ~50-100 visible rows exist in the DOM
- [ ] Use `@tanstack/virtual` or a custom virtualizer (simple is fine — fixed row height makes this straightforward)
- [ ] The log container scrolls smoothly with the same visual appearance
- [ ] Auto-scroll to bottom still works when new lines arrive
- [ ] Search highlighting and level filtering still work correctly
- [ ] Line numbers remain accurate (reflect position in the full list, not the visible window)
- [ ] Download still exports the full buffer, not just visible lines
- [ ] Performance: rendering 10K lines should not cause frame drops

## Technical Notes

- Each log line has a fixed height (line-height 1.7 × 0.8125rem ≈ 22px) — ideal for virtualization
- The `bufferRef` already holds the full array; the virtualizer just controls which slice is rendered
- `useMemo` was already added for the filter — the virtualizer receives the memoized `filtered` array
- Consider `@tanstack/virtual` (small, framework-agnostic) or a ~50-line custom implementation using `scrollTop` / `offsetHeight` math

## Dependencies

- None
