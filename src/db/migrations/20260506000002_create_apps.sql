CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    git_repo TEXT,
    git_branch TEXT NOT NULL DEFAULT 'main',
    framework TEXT,
    build_config TEXT,
    resource_limits TEXT,
    preview_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    preview_branch_pattern TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
