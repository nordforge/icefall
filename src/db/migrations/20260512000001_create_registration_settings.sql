CREATE TABLE IF NOT EXISTS registration_settings (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    allow_registration BOOLEAN NOT NULL DEFAULT 0,
    allowed_domains TEXT,
    default_role TEXT NOT NULL DEFAULT 'viewer',
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || 'Z')
);
