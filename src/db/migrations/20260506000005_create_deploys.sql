CREATE TABLE IF NOT EXISTS deploys (
    id TEXT PRIMARY KEY NOT NULL,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deploying', 'running', 'failed', 'stopped')),
    git_sha TEXT,
    build_log TEXT,
    started_at TEXT,
    finished_at TEXT,
    image_ref TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deploys_app_id ON deploys(app_id);
CREATE INDEX IF NOT EXISTS idx_deploys_status ON deploys(status);
