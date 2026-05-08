CREATE TABLE IF NOT EXISTS oauth_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS oauth_settings (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    github_client_id TEXT,
    github_client_secret_encrypted BLOB,
    github_enabled INTEGER NOT NULL DEFAULT 0,
    google_client_id TEXT,
    google_client_secret_encrypted BLOB,
    google_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);
