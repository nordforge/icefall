CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    db_type TEXT NOT NULL CHECK (db_type IN ('postgres', 'mysql', 'redis', 'mongo')),
    container_id TEXT,
    credentials_encrypted BLOB NOT NULL,
    backup_schedule TEXT,
    app_id TEXT REFERENCES apps(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);
