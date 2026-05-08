-- Instance backup configuration (singleton row)
CREATE TABLE IF NOT EXISTS instance_backup_config (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    enabled INTEGER NOT NULL DEFAULT 0,
    cron_schedule TEXT NOT NULL DEFAULT 'daily',
    retention_count INTEGER NOT NULL DEFAULT 7,
    updated_at TEXT NOT NULL
);

-- Instance backup history
CREATE TABLE IF NOT EXISTS instance_backup_history (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    error_message TEXT,
    s3_key TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT
);
