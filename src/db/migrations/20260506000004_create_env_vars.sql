CREATE TABLE IF NOT EXISTS env_vars (
    id TEXT PRIMARY KEY NOT NULL,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value_encrypted BLOB NOT NULL,
    scope TEXT NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared', 'production', 'preview')),
    created_at TEXT NOT NULL,
    UNIQUE (environment_id, key, scope)
);

CREATE INDEX IF NOT EXISTS idx_env_vars_environment_id ON env_vars(environment_id);
