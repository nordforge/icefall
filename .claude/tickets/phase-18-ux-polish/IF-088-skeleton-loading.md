# IF-088: Skeleton loading states

**Phase:** 18 — UX Polish
**Priority:** High
**Estimate:** M

## Description

Replace "Loading..." text with skeleton placeholders that match the shape of the content being loaded. This eliminates layout shift and makes the app feel faster because the user sees the structure immediately.

## Acceptance Criteria

### Shared Skeleton Component
- [ ] Create `dashboard/src/islands/shared/Skeleton/Skeleton.tsx`:
  - `<Skeleton width="100%" height="16px" />` — rectangular block
  - `<Skeleton variant="circle" size={40} />` — avatar/icon
  - `<Skeleton variant="text" lines={3} />` — multiple text lines with varying widths
  - Subtle pulse animation (OKLCH, not pure gray)
  - `prefers-reduced-motion` disables animation

### Pages to add skeletons

| Page/Component | Current loading | Skeleton shape |
|---|---|---|
| Dashboard (AppGrid) | "Loading..." text | Grid of card-shaped skeletons (3x2) |
| Dashboard (ServerStats) | Nothing until data | 3 progress bar skeletons |
| App Detail (OverviewTab) | "Loading..." | 3-col grid of panel skeletons |
| App Detail (DeploysTab) | "Loading deploys..." | Table rows skeleton (6 rows) |
| App Detail (SettingsTab) | Instant (has app prop) | N/A |
| Databases page | "Loading..." | Grid of card skeletons |
| Projects page | "Loading projects..." | Grid of card skeletons |
| Users page | "Loading..." | Table rows skeleton |
| Settings page | Loads in sections | Section card skeletons |
| Server page | Blank until metrics | Metric card skeletons + chart placeholder |

### Implementation pattern
```tsx
if (loading) return <AppGridSkeleton />;
```
Each skeleton is a co-located component (e.g., `AppGridSkeleton`) that mimics the exact layout of the loaded state.

## Technical Notes

- Skeletons should use the same CSS grid/flex layout as the real content — this prevents layout shift
- Animation: `background: linear-gradient(90deg, var(--color-surface-alt) 25%, var(--color-surface) 50%, var(--color-surface-alt) 75%)` with `background-size: 200%` and `animation: shimmer 1.5s infinite`
- Each skeleton needs to match the exact card/row dimensions of its content

## Out of Scope

- Suspense boundaries (Preact doesn't have full Suspense support)
- Progressive loading (showing partial data as it arrives)

## Dependencies

- None (independent of View Transitions)
