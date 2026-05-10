# IF-112: Throttle MetricsChart mouse handler and fix Sparkline re-renders

**Phase:** 19 — Audit Fixes
**Priority:** Medium
**Estimate:** S

## Description

The performance audit found that hovering over MetricsChart fires `setHoverIdx()` on every mouse move event (dozens per second) with no throttle, causing full chart + Sparkline re-renders. The Sparkline gradient ID instability was already fixed but memoizing the Sparkline component would prevent unnecessary SVG re-renders from parent state changes.

## Acceptance Criteria

- [ ] `dashboard/src/islands/shared/MetricsChart/MetricsChart.tsx` — Throttle `handleMouseMove` with `requestAnimationFrame` or a 16ms debounce
- [ ] Memoize Sparkline: wrap with `memo()` from Preact so it only re-renders when `data`, `color`, or `max` props change
- [ ] Verify hover tooltip still tracks smoothly (no visible lag from throttling)

## Technical Notes

- `requestAnimationFrame` throttling: store the pending rAF ID in a ref, skip if one is already pending
- Sparkline memoization: `export default memo(Sparkline)` in the component file

## Dependencies

- None
