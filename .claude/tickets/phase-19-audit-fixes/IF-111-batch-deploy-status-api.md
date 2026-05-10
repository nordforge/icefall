# IF-111: Batch deploy status API to eliminate N+1 waterfall

**Phase:** 19 — Audit Fixes
**Priority:** High
**Estimate:** M

## Description

The performance audit found that the dashboard home page fires N+1 HTTP requests: 1 for `listApps()` then 1 `listDeploys(app.id)` per app. With 20 apps, that's 21 requests on page load. The browser limits concurrent connections to 6, creating a visible waterfall.

## Acceptance Criteria

### Backend
- [ ] New endpoint: `GET /api/v1/deploys/latest` — returns the latest deploy per app
  - Query param: `app_ids=id1,id2,id3` (comma-separated)
  - Response: `{ "data": { "app_id_1": Deploy, "app_id_2": Deploy, ... } }`
  - Or: `GET /api/v1/apps/summary` that returns apps with their latest deploy embedded
- [ ] Single SQL query: `SELECT * FROM deploys WHERE app_id IN (?) GROUP BY app_id ORDER BY created_at DESC`

### Frontend
- [ ] `dashboard/src/islands/dashboard/AppGrid/AppGrid.tsx` — Replace `Promise.allSettled(data.map(app => api.listDeploys(app.id)))` with a single batch call
- [ ] Dashboard load should require exactly 2 HTTP requests: `listApps` + `getLatestDeploys`

### Database
- [ ] Add `get_latest_deploys_for_apps(&self, app_ids: &[String]) -> Result<HashMap<String, Deploy>, DbError>` to the Database trait
- [ ] Implement in SQLite

## Technical Notes

- The batch approach reduces 21 requests to 2, eliminating the waterfall entirely
- The SQL can use a window function: `ROW_NUMBER() OVER (PARTITION BY app_id ORDER BY created_at DESC)`
- The API cache (cache.ts) will cache this response for 30s, further reducing repeat loads

## Dependencies

- None
