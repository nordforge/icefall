# IF-113: Fix SSE client cleanup and add cache eviction

**Phase:** 19 — Audit Fixes
**Priority:** Medium
**Estimate:** S

## Description

The performance audit found two resource management issues: the SSE client doesn't null its reference after close (potential double-close), and the API cache grows unbounded with no periodic eviction.

## Acceptance Criteria

### SSE client
- [ ] `dashboard/src/lib/sse.ts` — Set `source = null` after `source.close()` in both the error handler and the public `close()` method
- [ ] Guard `close()` against double-call: `if (!source) return`

### API cache
- [ ] `dashboard/src/lib/cache.ts` — Add periodic sweep: every 60 seconds, remove entries older than TTL
- [ ] Or: cap the map at 100 entries using simple LRU (delete oldest on insert when over limit)
- [ ] The sweep should use `setInterval` and be cleaned up if the module is ever hot-reloaded

### Uncleaned timeouts
- [ ] `dashboard/src/islands/settings/TwoFactorSection/TwoFactorSection.tsx` lines 79, 95 — Store timeout IDs in refs, clear in useEffect cleanup
- [ ] `dashboard/src/islands/app-detail/SettingsTab/SettingsTab.tsx` line 171 — Same pattern

## Technical Notes

- The SSE null-reference fix is a one-line change per location
- For the cache, a simple sweep is preferred over LRU for simplicity — the cache is small and infrequently accessed
- The timeout cleanup pattern: `const timeoutRef = useRef<number>(); timeoutRef.current = setTimeout(...); return () => clearTimeout(timeoutRef.current);`

## Dependencies

- None
