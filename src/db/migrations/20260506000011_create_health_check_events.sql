CREATE TABLE IF NOT EXISTS health_check_events (
    id TEXT PRIMARY KEY NOT NULL,
    health_check_id TEXT NOT NULL REFERENCES health_checks(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy')),
    checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_check_events_hc_id ON health_check_events(health_check_id);
CREATE INDEX IF NOT EXISTS idx_health_check_events_checked_at ON health_check_events(checked_at);
