CREATE TABLE IF NOT EXISTS health_checks (
    id TEXT PRIMARY KEY NOT NULL,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL CHECK (check_type IN ('tcp', 'docker')),
    config TEXT,
    interval_secs INTEGER NOT NULL DEFAULT 30,
    failure_threshold INTEGER NOT NULL DEFAULT 3,
    auto_restart BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_checks_app_id ON health_checks(app_id);
