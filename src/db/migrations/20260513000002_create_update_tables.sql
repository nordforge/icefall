CREATE TABLE IF NOT EXISTS update_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    highest_seen_version TEXT NOT NULL,
    available_version TEXT,
    release_url TEXT,
    release_notes TEXT,
    changelog_highlights TEXT,
    channel TEXT NOT NULL DEFAULT 'stable',
    download_state TEXT NOT NULL DEFAULT 'none',
    download_progress INTEGER DEFAULT 0,
    download_path TEXT,
    last_check_at TEXT,
    last_update_at TEXT,
    last_update_version TEXT,
    error_message TEXT
);

INSERT OR IGNORE INTO update_state (id, highest_seen_version) VALUES (1, '0.1.0');

CREATE TABLE IF NOT EXISTS skipped_updates (
    version TEXT PRIMARY KEY,
    skipped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS update_history (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    previous_version TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_secs REAL,
    error TEXT,
    changelog_url TEXT,
    applied_at TEXT NOT NULL
);
