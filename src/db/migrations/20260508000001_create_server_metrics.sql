CREATE TABLE IF NOT EXISTS server_metrics (
    id TEXT PRIMARY KEY NOT NULL,
    timestamp TEXT NOT NULL,
    cpu_percent REAL NOT NULL,
    memory_used_bytes INTEGER NOT NULL,
    memory_total_bytes INTEGER NOT NULL,
    disk_used_bytes INTEGER NOT NULL,
    disk_total_bytes INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_server_metrics_ts ON server_metrics(timestamp);
