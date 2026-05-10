# IF-087: Link prefetching and data preloading

**Phase:** 18 — UX Polish
**Priority:** High
**Estimate:** M

## Description

Eliminate perceived loading time by prefetching page assets and preloading API data before navigation. When a user hovers over a sidebar link or an app card, start fetching the target page's JS/CSS and prime the API cache so the page renders instantly on click.

## Acceptance Criteria

### Page Asset Prefetching
- [ ] Enable Astro's built-in `prefetch` feature in `astro.config.mjs`: `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`
- [ ] Sidebar links prefetch on hover (load the target page's JS bundle)
- [ ] App cards on the dashboard prefetch the app detail page on hover
- [ ] Deploy links in the deploys table prefetch on hover
- [ ] Project cards prefetch on hover

### API Data Preloading
- [ ] Create a shared data cache (`dashboard/src/lib/cache.ts`):
  - Simple in-memory Map with TTL (30 seconds)
  - `cache.get(key)` / `cache.set(key, data)` / `cache.has(key)`
  - Used by API methods: check cache before fetching
- [ ] AppGrid: on hover over an app card, pre-fetch `api.getApp(id)` and `api.listDeploys(id)` into cache
- [ ] AppTabs: on hover over a tab, preload that tab's data (deploys, env vars, domains, etc.)
- [ ] Sidebar: on hover over "Databases", pre-fetch `api.listDatabases()`
- [ ] OverviewTab: deploy links preload deploy detail data on hover

### Tab Preloading (already partial)
- [ ] AppTabs already has `onMouseEnter` preloading of tab components — verify it works and extend to data preloading
- [ ] Preload the next likely tab: if on Overview, preload Deploys component

## Technical Notes

- Astro's `prefetch` works with View Transitions (IF-086) — prefetched pages swap instantly
- API preloading is separate from page prefetching — it primes the data cache before the component mounts
- The cache should be module-scoped (survives navigations within the same page session)
- Don't prefetch on touch devices (hover doesn't exist) — use `pointerenter` with `pointerType: 'mouse'` check

## Out of Scope

- Service worker caching
- Offline support
- Background sync

## Dependencies

- IF-086 (View Transitions — prefetching works best with View Transitions)
