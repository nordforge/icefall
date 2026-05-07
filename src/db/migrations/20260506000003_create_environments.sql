CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY NOT NULL,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    env_type TEXT NOT NULL CHECK (env_type IN ('production', 'preview')),
    branch TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_environments_app_id ON environments(app_id);
