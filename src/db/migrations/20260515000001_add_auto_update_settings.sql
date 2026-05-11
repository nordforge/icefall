ALTER TABLE update_state ADD COLUMN auto_update_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE update_state ADD COLUMN auto_update_channel TEXT NOT NULL DEFAULT 'stable';
ALTER TABLE update_state ADD COLUMN auto_update_window_start TEXT NOT NULL DEFAULT '03:00';
ALTER TABLE update_state ADD COLUMN auto_update_window_end TEXT NOT NULL DEFAULT '05:00';
ALTER TABLE update_state ADD COLUMN auto_update_notify_before_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE update_state ADD COLUMN auto_update_pre_downloaded INTEGER NOT NULL DEFAULT 0;
