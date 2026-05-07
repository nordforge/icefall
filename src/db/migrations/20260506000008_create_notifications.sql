CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('smtp', 'webhook', 'plunk')),
    config_encrypted BLOB NOT NULL,
    created_at TEXT NOT NULL
);
