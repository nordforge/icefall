CREATE TABLE IF NOT EXISTS notification_rules (
    id TEXT PRIMARY KEY NOT NULL,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('deploy_success', 'deploy_failure', 'health_down', 'health_recovered', 'auto_restart'))
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_app_id ON notification_rules(app_id);
