CREATE TABLE IF NOT EXISTS onboarding (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    current_step TEXT NOT NULL DEFAULT 'admin_account',
    completed_steps TEXT NOT NULL DEFAULT '[]',
    started_at TEXT NOT NULL,
    completed_at TEXT
);
