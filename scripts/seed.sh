#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Icefall Seed Script — comprehensive test data
#
# Prerequisites:
#   1. Stop the icefall daemon
#   2. Delete the database:  rm ~/.local/share/icefall/icefall.db*
#   3. Start the icefall daemon (migrations re-run on boot)
#   4. Run this script:  bash scripts/seed.sh
#
# The script assumes a fresh database. It is NOT idempotent — run against a
# clean DB only.
###############################################################################

API="http://localhost:3001/api/v1"
DB_PATH="$HOME/.local/share/icefall/icefall.db"
COOKIE_JAR="/tmp/icefall-cookies.txt"

ADMIN_EMAIL="admin@icefall.dev"
ADMIN_PASS="icefall-admin-2026"

# --- Helpers -----------------------------------------------------------------

api() {
  curl -s -b "$COOKIE_JAR" -H "Content-Type: application/json" "$@"
}

# Extract the first "id" field from a JSON response
extract_id() {
  grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

# Generate a lowercase UUID (macOS)
gen_uuid() {
  uuidgen | tr '[:upper:]' '[:lower:]'
}

# ISO-8601 timestamp for N days ago (macOS date)
days_ago() {
  date -u -v-"${1}"d +%Y-%m-%dT%H:%M:%SZ
}

# ISO-8601 timestamp for N hours ago
hours_ago() {
  date -u -v-"${1}"H +%Y-%m-%dT%H:%M:%SZ
}

# Current ISO-8601 timestamp
now_ts() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

# Generate a fake git SHA
fake_sha() {
  openssl rand -hex 20
}

# Generate a fake container ID (64 hex chars like Docker)
fake_container_id() {
  openssl rand -hex 32
}

echo "============================================================"
echo "  Icefall Seed Script"
echo "============================================================"
echo ""

# --- Wait for API to be ready ------------------------------------------------
echo "Waiting for API to be ready..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" "$API/../health" 2>/dev/null | grep -q "200\|404"; then
    break
  fi
  if [ "$i" = "30" ]; then
    echo "  API not responding after 30s — is the daemon running?"
    exit 1
  fi
  sleep 1
done
echo "  API is ready."
echo ""

###############################################################################
# 1. ADMIN ACCOUNT
###############################################################################
echo "--- 1. Admin Account ---"
HTTP_CODE=$(curl -s -o /tmp/icefall-setup-body.txt -w "%{http_code}" \
  -X POST "$API/auth/setup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" \
  -c "$COOKIE_JAR")
BODY=$(cat /tmp/icefall-setup-body.txt)

if [ "$HTTP_CODE" = "200" ]; then
  echo "  Created admin: $ADMIN_EMAIL"
elif echo "$BODY" | grep -q "already exists"; then
  echo "  Admin already exists — logging in..."
  curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" \
    -c "$COOKIE_JAR" > /dev/null
else
  echo "  Setup failed ($HTTP_CODE): $BODY"
  exit 1
fi
echo ""

###############################################################################
# 2. PROJECTS
###############################################################################
echo "--- 2. Projects ---"

P1=$(api -X POST "$API/projects" -d '{"name":"Frontend Apps","description":"All customer-facing web applications","color":"#3b82f6"}' | extract_id)
echo "  Frontend Apps       ($P1)"

P2=$(api -X POST "$API/projects" -d '{"name":"Backend Services","description":"APIs, workers, and microservices","color":"#10b981"}' | extract_id)
echo "  Backend Services    ($P2)"

P3=$(api -X POST "$API/projects" -d '{"name":"Internal Tools","description":"Admin dashboards and monitoring","color":"#f59e0b"}' | extract_id)
echo "  Internal Tools      ($P3)"
echo ""

###############################################################################
# 3. APPS
###############################################################################
echo "--- 3. Apps ---"

# Git-based apps
A1=$(api -X POST "$API/apps" -d '{"name":"marketing-site","git_repo":"https://github.com/acme/marketing","git_branch":"main","framework":"astro"}' | extract_id)
echo "  marketing-site  [astro]       ($A1)"

A2=$(api -X POST "$API/apps" -d '{"name":"dashboard-app","git_repo":"https://github.com/acme/dashboard","git_branch":"main","framework":"vite-react"}' | extract_id)
echo "  dashboard-app   [vite-react]  ($A2)"

A3=$(api -X POST "$API/apps" -d '{"name":"api-gateway","git_repo":"https://github.com/acme/api","git_branch":"main","framework":"nodejs"}' | extract_id)
echo "  api-gateway     [nodejs]      ($A3)"

A4=$(api -X POST "$API/apps" -d '{"name":"docs-site","git_repo":"https://github.com/acme/docs","git_branch":"main","framework":"next-js"}' | extract_id)
echo "  docs-site       [next-js]     ($A4)"

# Image-based apps
A5=$(api -X POST "$API/apps" -d '{"name":"uptime-monitor","image_ref":"louislam/uptime-kuma:1","port":3001}' | extract_id)
echo "  uptime-monitor  [image]       ($A5)"

A6=$(api -X POST "$API/apps" -d '{"name":"analytics","image_ref":"plausible/analytics:v2.1.4","port":8000}' | extract_id)
echo "  analytics       [image]       ($A6)"
echo ""

###############################################################################
# 4. ASSIGN APPS TO PROJECTS
###############################################################################
echo "--- 4. Project Assignments ---"
api -X PUT "$API/apps/$A1" -d "{\"project_id\":\"$P1\"}" > /dev/null
api -X PUT "$API/apps/$A2" -d "{\"project_id\":\"$P1\"}" > /dev/null
api -X PUT "$API/apps/$A4" -d "{\"project_id\":\"$P1\"}" > /dev/null
echo "  Frontend Apps     <- marketing-site, dashboard-app, docs-site"

api -X PUT "$API/apps/$A3" -d "{\"project_id\":\"$P2\"}" > /dev/null
echo "  Backend Services  <- api-gateway"

api -X PUT "$API/apps/$A5" -d "{\"project_id\":\"$P3\"}" > /dev/null
api -X PUT "$API/apps/$A6" -d "{\"project_id\":\"$P3\"}" > /dev/null
echo "  Internal Tools    <- uptime-monitor, analytics"
echo ""

###############################################################################
# 5. TAGS
###############################################################################
echo "--- 5. Tags ---"
api -X PUT "$API/apps/$A1" -d '{"tags":"frontend,marketing,static"}' > /dev/null
api -X PUT "$API/apps/$A2" -d '{"tags":"frontend,dashboard,react"}' > /dev/null
api -X PUT "$API/apps/$A3" -d '{"tags":"backend,api,node"}' > /dev/null
api -X PUT "$API/apps/$A4" -d '{"tags":"frontend,docs,nextjs"}' > /dev/null
api -X PUT "$API/apps/$A5" -d '{"tags":"monitoring,docker,uptime"}' > /dev/null
api -X PUT "$API/apps/$A6" -d '{"tags":"analytics,docker,plausible"}' > /dev/null
echo "  Tags assigned to all 6 apps"
echo ""

###############################################################################
# 6. RESOURCE LIMITS
###############################################################################
echo "--- 6. Resource Limits ---"

# 512 MB = 536870912 bytes, 1024 MB = 1073741824 bytes
api -X PUT "$API/apps/$A1" -d '{"resource_limits":"{\"memory_bytes\":536870912,\"cpu_shares\":1024}"}' > /dev/null
echo "  marketing-site   512MB / 1024 CPU shares"

api -X PUT "$API/apps/$A2" -d '{"resource_limits":"{\"memory_bytes\":1073741824,\"cpu_shares\":1024}"}' > /dev/null
echo "  dashboard-app    1024MB / 1024 CPU shares"

api -X PUT "$API/apps/$A3" -d '{"resource_limits":"{\"memory_bytes\":1073741824,\"cpu_shares\":2048}"}' > /dev/null
echo "  api-gateway      1024MB / 2048 CPU shares"

api -X PUT "$API/apps/$A4" -d '{"resource_limits":"{\"memory_bytes\":536870912,\"cpu_shares\":512}"}' > /dev/null
echo "  docs-site        512MB / 512 CPU shares"

api -X PUT "$API/apps/$A5" -d '{"resource_limits":"{\"memory_bytes\":536870912,\"cpu_shares\":1024}"}' > /dev/null
echo "  uptime-monitor   512MB / 1024 CPU shares"

api -X PUT "$API/apps/$A6" -d '{"resource_limits":"{\"memory_bytes\":1073741824,\"cpu_shares\":1024}"}' > /dev/null
echo "  analytics        1024MB / 1024 CPU shares"
echo ""

###############################################################################
# 7. ENVIRONMENT VARIABLES
###############################################################################
echo "--- 7. Environment Variables ---"

# Common env vars for all git-based apps
for APP_ID in $A1 $A2 $A3 $A4; do
  api -X POST "$API/apps/$APP_ID/env" -d '{"key":"NODE_ENV","value":"production","scope":"production"}' > /dev/null
  api -X POST "$API/apps/$APP_ID/env" -d '{"key":"LOG_LEVEL","value":"info","scope":"shared"}' > /dev/null
done
echo "  Common: NODE_ENV, LOG_LEVEL -> git-based apps"

# marketing-site specifics
api -X POST "$API/apps/$A1/env" -d '{"key":"SITE_URL","value":"https://marketing.example.com","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A1/env" -d '{"key":"ANALYTICS_ID","value":"plausible-mktg-001","scope":"production"}' > /dev/null
echo "  marketing-site: SITE_URL, ANALYTICS_ID"

# dashboard-app specifics
api -X POST "$API/apps/$A2/env" -d '{"key":"VITE_API_URL","value":"https://api.example.com","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A2/env" -d '{"key":"VITE_WS_URL","value":"wss://api.example.com/ws","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A2/env" -d '{"key":"SESSION_SECRET","value":"d84f2a91-bc3e-4e17-a5f9-c0b8e7d31a60","scope":"production"}' > /dev/null
echo "  dashboard-app: VITE_API_URL, VITE_WS_URL, SESSION_SECRET"

# api-gateway specifics
api -X POST "$API/apps/$A3/env" -d '{"key":"DATABASE_URL","value":"postgresql://api:s3cur3p4ss@main-postgres:5432/api_gateway","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A3/env" -d '{"key":"REDIS_URL","value":"redis://:r3d1sp4ss@cache-redis:6379","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A3/env" -d '{"key":"JWT_SECRET","value":"eyJhbGciOiJIUzI1NiJ9-change-me-in-prod","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A3/env" -d '{"key":"RATE_LIMIT_RPM","value":"120","scope":"shared"}' > /dev/null
api -X POST "$API/apps/$A3/env" -d '{"key":"CORS_ORIGINS","value":"https://app.example.com,https://marketing.example.com","scope":"production"}' > /dev/null
echo "  api-gateway: DATABASE_URL, REDIS_URL, JWT_SECRET, RATE_LIMIT_RPM, CORS_ORIGINS"

# docs-site specifics
api -X POST "$API/apps/$A4/env" -d '{"key":"NEXT_PUBLIC_API_URL","value":"https://api.example.com","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A4/env" -d '{"key":"NEXT_PUBLIC_ALGOLIA_APP_ID","value":"ABCDE12345","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A4/env" -d '{"key":"ALGOLIA_ADMIN_KEY","value":"algolia-admin-key-placeholder","scope":"production"}' > /dev/null
echo "  docs-site: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY"

# Image-based apps env vars
api -X POST "$API/apps/$A5/env" -d '{"key":"UPTIME_KUMA_PORT","value":"3001","scope":"shared"}' > /dev/null
api -X POST "$API/apps/$A5/env" -d '{"key":"NODE_ENV","value":"production","scope":"production"}' > /dev/null
echo "  uptime-monitor: UPTIME_KUMA_PORT, NODE_ENV"

api -X POST "$API/apps/$A6/env" -d '{"key":"BASE_URL","value":"https://analytics.example.com","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A6/env" -d '{"key":"SECRET_KEY_BASE","value":"rGbn8fT3mPL4k9Z2xWvJ5dA1qYcN7sUo","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A6/env" -d '{"key":"DATABASE_URL","value":"postgresql://plausible:pl4us1bl3@main-postgres:5432/plausible","scope":"production"}' > /dev/null
api -X POST "$API/apps/$A6/env" -d '{"key":"CLICKHOUSE_DATABASE_URL","value":"http://analytics-clickhouse:8123/plausible","scope":"production"}' > /dev/null
echo "  analytics: BASE_URL, SECRET_KEY_BASE, DATABASE_URL, CLICKHOUSE_DATABASE_URL"
echo ""

###############################################################################
# 8. CUSTOM DOMAINS
###############################################################################
echo "--- 8. Custom Domains ---"

api -X POST "$API/apps/$A1/domains" -d '{"domain":"marketing.example.com"}' > /dev/null
api -X POST "$API/apps/$A1/domains" -d '{"domain":"www.example.com"}' > /dev/null
echo "  marketing-site: marketing.example.com, www.example.com"

api -X POST "$API/apps/$A2/domains" -d '{"domain":"app.example.com"}' > /dev/null
api -X POST "$API/apps/$A2/domains" -d '{"domain":"dashboard.example.com"}' > /dev/null
echo "  dashboard-app: app.example.com, dashboard.example.com"

api -X POST "$API/apps/$A3/domains" -d '{"domain":"api.example.com"}' > /dev/null
api -X POST "$API/apps/$A3/domains" -d '{"domain":"gateway.example.com"}' > /dev/null
echo "  api-gateway: api.example.com, gateway.example.com"

api -X POST "$API/apps/$A4/domains" -d '{"domain":"docs.example.com"}' > /dev/null
echo "  docs-site: docs.example.com"

api -X POST "$API/apps/$A5/domains" -d '{"domain":"status.example.com"}' > /dev/null
echo "  uptime-monitor: status.example.com"

api -X POST "$API/apps/$A6/domains" -d '{"domain":"analytics.example.com"}' > /dev/null
echo "  analytics: analytics.example.com"

# Mark domains as verified + SSL active via direct DB update
echo "  Updating domains: verified=true, ssl_status=active..."
sqlite3 "$DB_PATH" "UPDATE domains SET verified = 1, ssl_status = 'active';"
echo ""

###############################################################################
# 9. HEALTH CHECKS
###############################################################################
echo "--- 9. Health Checks ---"

api -X PUT "$API/apps/$A1/health" \
  -d '{"check_type":"tcp","interval_secs":30,"failure_threshold":3,"auto_restart":true}' > /dev/null
echo "  marketing-site:  tcp / 30s / auto-restart"

api -X PUT "$API/apps/$A2/health" \
  -d '{"check_type":"tcp","interval_secs":30,"failure_threshold":3,"auto_restart":true}' > /dev/null
echo "  dashboard-app:   tcp / 30s / auto-restart"

api -X PUT "$API/apps/$A3/health" \
  -d '{"check_type":"tcp","interval_secs":15,"failure_threshold":2,"auto_restart":true}' > /dev/null
echo "  api-gateway:     tcp / 15s / auto-restart (stricter)"

api -X PUT "$API/apps/$A4/health" \
  -d '{"check_type":"tcp","interval_secs":60,"failure_threshold":3,"auto_restart":false}' > /dev/null
echo "  docs-site:       tcp / 60s / no auto-restart"

api -X PUT "$API/apps/$A5/health" \
  -d '{"check_type":"tcp","interval_secs":30,"failure_threshold":3,"auto_restart":true}' > /dev/null
echo "  uptime-monitor:  tcp / 30s / auto-restart"

api -X PUT "$API/apps/$A6/health" \
  -d '{"check_type":"tcp","interval_secs":30,"failure_threshold":3,"auto_restart":true}' > /dev/null
echo "  analytics:       tcp / 30s / auto-restart"
echo ""

###############################################################################
# 10. DEPLOY RECORDS (direct SQLite inserts)
#
# Deploys require environments, which are auto-created by the API. We look up
# the environment IDs that were created when apps were made.
###############################################################################
echo "--- 10. Deploy History ---"

# Grab environment IDs for each app
ENV1=$(sqlite3 "$DB_PATH" "SELECT id FROM environments WHERE app_id='$A1' AND env_type='production' LIMIT 1;")
ENV2=$(sqlite3 "$DB_PATH" "SELECT id FROM environments WHERE app_id='$A2' AND env_type='production' LIMIT 1;")
ENV3=$(sqlite3 "$DB_PATH" "SELECT id FROM environments WHERE app_id='$A3' AND env_type='production' LIMIT 1;")
ENV4=$(sqlite3 "$DB_PATH" "SELECT id FROM environments WHERE app_id='$A4' AND env_type='production' LIMIT 1;")
ENV5=$(sqlite3 "$DB_PATH" "SELECT id FROM environments WHERE app_id='$A5' AND env_type='production' LIMIT 1;")
ENV6=$(sqlite3 "$DB_PATH" "SELECT id FROM environments WHERE app_id='$A6' AND env_type='production' LIMIT 1;")

# --- marketing-site (5 deploys: 4 stopped, 1 running) -----------------------
SHA_M1=$(fake_sha); SHA_M2=$(fake_sha); SHA_M3=$(fake_sha); SHA_M4=$(fake_sha); SHA_M5=$(fake_sha)
CID_M5=$(fake_container_id)

sqlite3 "$DB_PATH" <<SQL
INSERT INTO deploys (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, container_id, created_at) VALUES
('$(gen_uuid)', '$A1', '$ENV1', 'stopped', '$SHA_M1',
'[build] Cloning https://github.com/acme/marketing (main)...
[build] Installing dependencies...
[build] astro build
[build] Generated 47 pages in 3.2s
[build] Building Docker image...
[build] Image built: icefall-marketing-site:${SHA_M1:0:8}
[deploy] Starting container...
[deploy] Container healthy on port 4321
[deploy] Deploy complete.',
'$(days_ago 6)', '$(days_ago 6)', NULL, '$(days_ago 6)'),

('$(gen_uuid)', '$A1', '$ENV1', 'stopped', '$SHA_M2',
'[build] Cloning https://github.com/acme/marketing (main)...
[build] Installing dependencies...
[build] astro build
[build] Generated 48 pages in 3.4s
[build] Building Docker image...
[build] Image built: icefall-marketing-site:${SHA_M2:0:8}
[deploy] Starting container...
[deploy] Container healthy on port 4321
[deploy] Deploy complete.',
'$(days_ago 5)', '$(days_ago 5)', NULL, '$(days_ago 5)'),

('$(gen_uuid)', '$A1', '$ENV1', 'stopped', '$SHA_M3',
'[build] Cloning https://github.com/acme/marketing (main)...
[build] Installing dependencies...
[build] astro build
[build] Generated 49 pages in 3.1s
[build] Building Docker image...
[build] Image built: icefall-marketing-site:${SHA_M3:0:8}
[deploy] Starting container...
[deploy] Container healthy on port 4321
[deploy] Deploy complete.',
'$(days_ago 3)', '$(days_ago 3)', NULL, '$(days_ago 3)'),

('$(gen_uuid)', '$A1', '$ENV1', 'failed', '$SHA_M4',
'[build] Cloning https://github.com/acme/marketing (main)...
[build] Installing dependencies...
[build] astro build
[error] Build failed: Cannot find module @astrojs/sitemap
[error] Exit code 1',
'$(days_ago 2)', '$(days_ago 2)', NULL, '$(days_ago 2)'),

('$(gen_uuid)', '$A1', '$ENV1', 'running', '$SHA_M5',
'[build] Cloning https://github.com/acme/marketing (main)...
[build] Installing dependencies...
[build] astro build
[build] Generated 49 pages in 2.9s
[build] Building Docker image...
[build] Image built: icefall-marketing-site:${SHA_M5:0:8}
[deploy] Starting container...
[deploy] Container healthy on port 4321
[deploy] Deploy complete.',
'$(days_ago 1)', '$(days_ago 1)', '$CID_M5', '$(days_ago 1)');
SQL
echo "  marketing-site:  5 deploys (4 stopped/failed, 1 running)"

# --- dashboard-app (4 deploys: 3 stopped, 1 running) ------------------------
SHA_D1=$(fake_sha); SHA_D2=$(fake_sha); SHA_D3=$(fake_sha); SHA_D4=$(fake_sha)
CID_D4=$(fake_container_id)

sqlite3 "$DB_PATH" <<SQL
INSERT INTO deploys (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, container_id, created_at) VALUES
('$(gen_uuid)', '$A2', '$ENV2', 'stopped', '$SHA_D1',
'[build] Cloning https://github.com/acme/dashboard (main)...
[build] npm ci
[build] vite build
[build] dist/assets/index-Bk4f9.js   412.3 kB | gzip: 128.7 kB
[build] Built in 8.4s
[build] Building Docker image...
[deploy] Starting container...
[deploy] Container healthy on port 5173
[deploy] Deploy complete.',
'$(days_ago 7)', '$(days_ago 7)', NULL, '$(days_ago 7)'),

('$(gen_uuid)', '$A2', '$ENV2', 'stopped', '$SHA_D2',
'[build] Cloning https://github.com/acme/dashboard (main)...
[build] npm ci
[build] vite build
[build] dist/assets/index-Xa9m2.js   418.1 kB | gzip: 131.2 kB
[build] Built in 9.1s
[build] Building Docker image...
[deploy] Starting container...
[deploy] Container healthy on port 5173
[deploy] Deploy complete.',
'$(days_ago 4)', '$(days_ago 4)', NULL, '$(days_ago 4)'),

('$(gen_uuid)', '$A2', '$ENV2', 'stopped', '$SHA_D3',
'[build] Cloning https://github.com/acme/dashboard (main)...
[build] npm ci
[build] vite build
[build] dist/assets/index-Qa1b7.js   421.0 kB | gzip: 132.4 kB
[build] Built in 8.9s
[build] Building Docker image...
[deploy] Starting container...
[deploy] Container healthy on port 5173
[deploy] Deploy complete.',
'$(days_ago 2)', '$(days_ago 2)', NULL, '$(days_ago 2)'),

('$(gen_uuid)', '$A2', '$ENV2', 'running', '$SHA_D4',
'[build] Cloning https://github.com/acme/dashboard (main)...
[build] npm ci
[build] vite build
[build] dist/assets/index-Mn3x8.js   423.5 kB | gzip: 133.1 kB
[build] Built in 8.7s
[build] Building Docker image...
[deploy] Starting container...
[deploy] Container healthy on port 5173
[deploy] Deploy complete.',
'$(hours_ago 6)', '$(hours_ago 6)', '$CID_D4', '$(hours_ago 6)');
SQL
echo "  dashboard-app:   4 deploys (3 stopped, 1 running)"

# --- api-gateway (5 deploys: 4 stopped, 1 running) --------------------------
SHA_A1=$(fake_sha); SHA_A2=$(fake_sha); SHA_A3=$(fake_sha); SHA_A4=$(fake_sha); SHA_A5=$(fake_sha)
CID_A5=$(fake_container_id)

sqlite3 "$DB_PATH" <<SQL
INSERT INTO deploys (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, container_id, created_at) VALUES
('$(gen_uuid)', '$A3', '$ENV3', 'stopped', '$SHA_A1',
'[build] Cloning https://github.com/acme/api (main)...
[build] npm ci --production
[build] Building Docker image...
[build] Image built: icefall-api-gateway:${SHA_A1:0:8}
[deploy] Starting container...
[deploy] Health check passed on port 3000
[deploy] Deploy complete.',
'$(days_ago 7)', '$(days_ago 7)', NULL, '$(days_ago 7)'),

('$(gen_uuid)', '$A3', '$ENV3', 'stopped', '$SHA_A2',
'[build] Cloning https://github.com/acme/api (main)...
[build] npm ci --production
[build] Building Docker image...
[build] Image built: icefall-api-gateway:${SHA_A2:0:8}
[deploy] Starting container...
[deploy] Health check passed on port 3000
[deploy] Deploy complete.',
'$(days_ago 5)', '$(days_ago 5)', NULL, '$(days_ago 5)'),

('$(gen_uuid)', '$A3', '$ENV3', 'failed', '$SHA_A3',
'[build] Cloning https://github.com/acme/api (main)...
[build] npm ci --production
[build] Building Docker image...
[deploy] Starting container...
[deploy] Health check FAILED after 3 attempts on port 3000
[error] Container exited with code 1
[error] EADDRINUSE: port 3000 already in use',
'$(days_ago 4)', '$(days_ago 4)', NULL, '$(days_ago 4)'),

('$(gen_uuid)', '$A3', '$ENV3', 'stopped', '$SHA_A4',
'[build] Cloning https://github.com/acme/api (main)...
[build] npm ci --production
[build] Building Docker image...
[build] Image built: icefall-api-gateway:${SHA_A4:0:8}
[deploy] Starting container...
[deploy] Health check passed on port 3000
[deploy] Deploy complete.',
'$(days_ago 2)', '$(days_ago 2)', NULL, '$(days_ago 2)'),

('$(gen_uuid)', '$A3', '$ENV3', 'running', '$SHA_A5',
'[build] Cloning https://github.com/acme/api (main)...
[build] npm ci --production
[build] Building Docker image...
[build] Image built: icefall-api-gateway:${SHA_A5:0:8}
[deploy] Starting container...
[deploy] Health check passed on port 3000
[deploy] Deploy complete.',
'$(hours_ago 3)', '$(hours_ago 3)', '$CID_A5', '$(hours_ago 3)');
SQL
echo "  api-gateway:     5 deploys (3 stopped, 1 failed, 1 running)"

# --- docs-site (3 deploys: 2 stopped, 1 running) ----------------------------
SHA_X1=$(fake_sha); SHA_X2=$(fake_sha); SHA_X3=$(fake_sha)
CID_X3=$(fake_container_id)

sqlite3 "$DB_PATH" <<SQL
INSERT INTO deploys (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, container_id, created_at) VALUES
('$(gen_uuid)', '$A4', '$ENV4', 'stopped', '$SHA_X1',
'[build] Cloning https://github.com/acme/docs (main)...
[build] npm ci
[build] next build
[build] Creating an optimized production build...
[build] Route (pages)             Size  First Load JS
[build] /                         5.2 kB     89 kB
[build] /docs/[...slug]           12.1 kB    96 kB
[build] Built in 14.3s
[deploy] Starting container...
[deploy] Container healthy on port 3000
[deploy] Deploy complete.',
'$(days_ago 5)', '$(days_ago 5)', NULL, '$(days_ago 5)'),

('$(gen_uuid)', '$A4', '$ENV4', 'stopped', '$SHA_X2',
'[build] Cloning https://github.com/acme/docs (main)...
[build] npm ci
[build] next build
[build] Creating an optimized production build...
[build] Route (pages)             Size  First Load JS
[build] /                         5.4 kB     89 kB
[build] /docs/[...slug]           12.3 kB    96 kB
[build] Built in 13.8s
[deploy] Starting container...
[deploy] Container healthy on port 3000
[deploy] Deploy complete.',
'$(days_ago 3)', '$(days_ago 3)', NULL, '$(days_ago 3)'),

('$(gen_uuid)', '$A4', '$ENV4', 'running', '$SHA_X3',
'[build] Cloning https://github.com/acme/docs (main)...
[build] npm ci
[build] next build
[build] Creating an optimized production build...
[build] Route (pages)             Size  First Load JS
[build] /                         5.5 kB     90 kB
[build] /docs/[...slug]           12.5 kB    97 kB
[build] Built in 13.2s
[deploy] Starting container...
[deploy] Container healthy on port 3000
[deploy] Deploy complete.',
'$(hours_ago 12)', '$(hours_ago 12)', '$CID_X3', '$(hours_ago 12)');
SQL
echo "  docs-site:       3 deploys (2 stopped, 1 running)"

# --- uptime-monitor (2 deploys: 1 stopped, 1 running) -----------------------
CID_U2=$(fake_container_id)

sqlite3 "$DB_PATH" <<SQL
INSERT INTO deploys (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, image_ref, container_id, created_at) VALUES
('$(gen_uuid)', '$A5', '$ENV5', 'stopped', NULL,
'[deploy] Pulling louislam/uptime-kuma:1...
[deploy] Image pulled successfully.
[deploy] Starting container...
[deploy] Container healthy on port 3001
[deploy] Deploy complete.',
'$(days_ago 5)', '$(days_ago 5)', 'louislam/uptime-kuma:1', NULL, '$(days_ago 5)'),

('$(gen_uuid)', '$A5', '$ENV5', 'running', NULL,
'[deploy] Pulling louislam/uptime-kuma:1...
[deploy] Image pulled successfully.
[deploy] Starting container...
[deploy] Container healthy on port 3001
[deploy] Deploy complete.',
'$(days_ago 1)', '$(days_ago 1)', 'louislam/uptime-kuma:1', '$CID_U2', '$(days_ago 1)');
SQL
echo "  uptime-monitor:  2 deploys (1 stopped, 1 running)"

# --- analytics (2 deploys: 1 stopped, 1 running) ----------------------------
CID_P2=$(fake_container_id)

sqlite3 "$DB_PATH" <<SQL
INSERT INTO deploys (id, app_id, environment_id, status, git_sha, build_log, started_at, finished_at, image_ref, container_id, created_at) VALUES
('$(gen_uuid)', '$A6', '$ENV6', 'stopped', NULL,
'[deploy] Pulling plausible/analytics:v2.1.4...
[deploy] Image pulled successfully.
[deploy] Starting container...
[deploy] Container healthy on port 8000
[deploy] Deploy complete.',
'$(days_ago 4)', '$(days_ago 4)', 'plausible/analytics:v2.1.4', NULL, '$(days_ago 4)'),

('$(gen_uuid)', '$A6', '$ENV6', 'running', NULL,
'[deploy] Pulling plausible/analytics:v2.1.4...
[deploy] Image pulled successfully.
[deploy] Starting container...
[deploy] Container healthy on port 8000
[deploy] Deploy complete.',
'$(hours_ago 18)', '$(hours_ago 18)', 'plausible/analytics:v2.1.4', '$CID_P2', '$(hours_ago 18)');
SQL
echo "  analytics:       2 deploys (1 stopped, 1 running)"
echo ""

###############################################################################
# 11. HEALTH CHECK EVENTS (direct SQLite)
#
# Seed some recent health-check history so uptime graphs have data.
###############################################################################
echo "--- 11. Health Check Events ---"

# Get health check IDs
HC1=$(sqlite3 "$DB_PATH" "SELECT id FROM health_checks WHERE app_id='$A1' LIMIT 1;")
HC2=$(sqlite3 "$DB_PATH" "SELECT id FROM health_checks WHERE app_id='$A2' LIMIT 1;")
HC3=$(sqlite3 "$DB_PATH" "SELECT id FROM health_checks WHERE app_id='$A3' LIMIT 1;")
HC4=$(sqlite3 "$DB_PATH" "SELECT id FROM health_checks WHERE app_id='$A4' LIMIT 1;")
HC5=$(sqlite3 "$DB_PATH" "SELECT id FROM health_checks WHERE app_id='$A5' LIMIT 1;")
HC6=$(sqlite3 "$DB_PATH" "SELECT id FROM health_checks WHERE app_id='$A6' LIMIT 1;")

# Generate health events for the last 48 hours (every 30 min = 96 events per app)
# Most are healthy; api-gateway had a brief unhealthy window 8-9 hours ago
echo "  Generating health events (last 48h)..."

EVENTS_SQL=""
for HOUR in $(seq 47 -1 0); do
  for HALF in 0 30; do
    TS=$(date -u -v-"${HOUR}"H -v-"${HALF}"M +%Y-%m-%dT%H:%M:%SZ)

    # api-gateway: unhealthy between 9h and 8h ago
    if [ "$HOUR" -ge 8 ] && [ "$HOUR" -le 9 ]; then
      A3_STATUS="unhealthy"
    else
      A3_STATUS="healthy"
    fi

    EVENTS_SQL="${EVENTS_SQL}
INSERT INTO health_check_events (id, health_check_id, status, checked_at) VALUES
('$(gen_uuid)', '$HC1', 'healthy', '$TS'),
('$(gen_uuid)', '$HC2', 'healthy', '$TS'),
('$(gen_uuid)', '$HC3', '$A3_STATUS', '$TS'),
('$(gen_uuid)', '$HC4', 'healthy', '$TS'),
('$(gen_uuid)', '$HC5', 'healthy', '$TS'),
('$(gen_uuid)', '$HC6', 'healthy', '$TS');"
  done
done

sqlite3 "$DB_PATH" "$EVENTS_SQL"
echo "  ~576 health check events inserted (6 apps x 96 checks)"
echo ""

###############################################################################
# 12. DATABASES (all 11 types via API)
###############################################################################
echo "--- 12. Databases ---"

api -X POST "$API/databases" -d '{"name":"main-postgres","db_type":"postgres","memory_mb":1024}' > /dev/null
echo "  main-postgres         (PostgreSQL 17)"

api -X POST "$API/databases" -d '{"name":"app-mysql","db_type":"mysql","memory_mb":1024}' > /dev/null
echo "  app-mysql             (MySQL 8)"

api -X POST "$API/databases" -d '{"name":"cache-redis","db_type":"redis","memory_mb":256}' > /dev/null
echo "  cache-redis           (Redis 7)"

api -X POST "$API/databases" -d '{"name":"docs-mongo","db_type":"mongo","memory_mb":512}' > /dev/null
echo "  docs-mongo            (MongoDB 7)"

api -X POST "$API/databases" -d '{"name":"app-mariadb","db_type":"mariadb","memory_mb":1024}' > /dev/null
echo "  app-mariadb           (MariaDB 11)"

api -X POST "$API/databases" -d '{"name":"analytics-clickhouse","db_type":"clickhouse","memory_mb":2048}' > /dev/null
echo "  analytics-clickhouse  (ClickHouse 24)"

api -X POST "$API/databases" -d '{"name":"fast-cache","db_type":"keydb","memory_mb":256}' > /dev/null
echo "  fast-cache            (KeyDB)"

api -X POST "$API/databases" -d '{"name":"session-store","db_type":"dragonfly","memory_mb":512}' > /dev/null
echo "  session-store         (DragonFly)"

api -X POST "$API/databases" -d '{"name":"queue-valkey","db_type":"valkey","memory_mb":256}' > /dev/null
echo "  queue-valkey          (Valkey 8)"

api -X POST "$API/databases" -d '{"name":"crdb-main","db_type":"cockroachdb","memory_mb":2048}' > /dev/null
echo "  crdb-main             (CockroachDB)"

api -X POST "$API/databases" -d '{"name":"events-cassandra","db_type":"cassandra","memory_mb":2048}' > /dev/null
echo "  events-cassandra      (Cassandra 5)"

# Set fake container_id values so the dashboard can show them as "running"
echo "  Setting container IDs..."
sqlite3 "$DB_PATH" <<SQL
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'main-postgres';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'app-mysql';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'cache-redis';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'docs-mongo';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'app-mariadb';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'analytics-clickhouse';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'fast-cache';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'session-store';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'queue-valkey';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'crdb-main';
UPDATE databases SET container_id = '$(fake_container_id)' WHERE name = 'events-cassandra';
SQL
echo ""

###############################################################################
# 13. NOTIFICATION CHANNELS
###############################################################################
echo "--- 13. Notification Channels ---"

api -X POST "$API/notifications/channels" \
  -d '{"channel_type":"webhook","config":{"url":"https://hooks.example.com/icefall","secret":"whsec_a1b2c3d4e5f6"}}' > /dev/null
echo "  Webhook  -> hooks.example.com"

api -X POST "$API/notifications/channels" \
  -d '{"channel_type":"slack","config":{"url":"https://hooks.slack.com/services/T04N3LKJH/B06ABCDEF/xyzSecretToken123"}}' > /dev/null 2>&1 || true
echo "  Slack    -> hooks.slack.com (may fail if DB constraint is strict)"

api -X POST "$API/notifications/channels" \
  -d '{"channel_type":"discord","config":{"url":"https://discord.com/api/webhooks/1234567890/abcdef-secret-token"}}' > /dev/null 2>&1 || true
echo "  Discord  -> discord.com/api/webhooks (may fail if DB constraint is strict)"

# Also add an SMTP channel which is guaranteed to work with the DB constraint
api -X POST "$API/notifications/channels" \
  -d '{"channel_type":"smtp","config":{"host":"smtp.example.com","port":587,"username":"alerts@example.com","password":"smtp-password","from":"alerts@example.com","to":"team@example.com"}}' > /dev/null
echo "  SMTP     -> smtp.example.com"
echo ""

###############################################################################
# 14. ADDITIONAL USERS
###############################################################################
echo "--- 14. Additional Users ---"

api -X POST "$API/users/invite" \
  -d '{"email":"developer@icefall.dev","role":"deployer"}' > /dev/null 2>&1 || true
echo "  developer@icefall.dev  (deployer)"

api -X POST "$API/users/invite" \
  -d '{"email":"viewer@icefall.dev","role":"viewer"}' > /dev/null 2>&1 || true
echo "  viewer@icefall.dev     (viewer)"
echo ""

###############################################################################
# 15. SERVER METRICS (direct SQLite — 24 hours of data)
###############################################################################
echo "--- 15. Server Metrics ---"

METRICS_SQL=""
for HOUR in $(seq 23 -1 0); do
  for QUARTER in 0 15 30 45; do
    TS=$(date -u -v-"${HOUR}"H -v-"${QUARTER}"M +%Y-%m-%dT%H:%M:%SZ)

    # Simulate realistic CPU usage: baseline 15-25%, spikes during deploys
    # Memory: 4GB used out of 8GB, with some variance
    # Disk: 32GB used out of 100GB
    CPU_BASE=$((15 + RANDOM % 15))
    MEM_USED=$((3758096384 + RANDOM % 536870912))   # ~3.5-4.0 GB
    MEM_TOTAL=8589934592                              # 8 GB
    DISK_USED=$((32212254720 + RANDOM % 2147483648))  # ~30-32 GB
    DISK_TOTAL=107374182400                            # 100 GB

    # Spike CPU during deploy windows (6h, 3h, 12h ago)
    if [ "$HOUR" -eq 6 ] || [ "$HOUR" -eq 3 ] || [ "$HOUR" -eq 12 ]; then
      CPU_BASE=$((45 + RANDOM % 30))
    fi

    METRICS_SQL="${METRICS_SQL}
INSERT INTO server_metrics (id, timestamp, cpu_percent, memory_used_bytes, memory_total_bytes, disk_used_bytes, disk_total_bytes) VALUES
('$(gen_uuid)', '$TS', ${CPU_BASE}.$(( RANDOM % 100 )), $MEM_USED, $MEM_TOTAL, $DISK_USED, $DISK_TOTAL);"
  done
done

sqlite3 "$DB_PATH" "$METRICS_SQL"
echo "  96 server metric entries (24h, every 15 min)"
echo ""

###############################################################################
# SUMMARY
###############################################################################
echo "============================================================"
echo "  Seed Complete"
echo "============================================================"
echo ""
echo "  Login:"
echo "    Email:     $ADMIN_EMAIL"
echo "    Password:  $ADMIN_PASS"
echo ""
echo "  Data created:"
echo "    1 admin + 2 invited users"
echo "    3 projects"
echo "    6 apps (4 git-based, 2 Docker image)"
echo "   21 deploy records with build logs"
echo "   ~576 health check events (48h history)"
echo "   11 databases (all supported types)"
echo "   10 custom domains (verified, SSL active)"
echo "    6 health check configs"
echo "   30+ environment variables"
echo "    3-4 notification channels"
echo "   96 server metric entries"
echo ""
echo "  Accounts:"
echo "    admin@icefall.dev      (admin)     password: icefall-admin-2026"
echo "    developer@icefall.dev  (deployer)  invite pending"
echo "    viewer@icefall.dev     (viewer)    invite pending"
echo ""
