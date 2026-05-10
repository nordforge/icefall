use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

use crate::db::Database;
use crate::docker::DockerClient;
use crate::update::UpdateError;

/// Orchestrates atomic binary updates with rollback support.
///
/// The sequence is: backup current binary -> backup database -> write pending
/// marker -> atomic binary swap -> trigger restart.  If the new version starts
/// successfully it clears the marker; if it crashes or fails health checks the
/// marker stays on disk so the rollback module can restore the previous state.
pub struct UpdateApplier {
    data_dir: PathBuf,
    binary_path: PathBuf,
}

/// Marker file written before update, deleted on success.
///
/// Persists across restarts so the rollback module can detect a failed update
/// even if the new binary never finishes starting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingUpdate {
    pub from_version: String,
    pub to_version: String,
    pub rollback_binary: String,
    pub db_backup: String,
    pub started_at: String,
}

impl UpdateApplier {
    pub fn new(data_dir: &Path) -> Self {
        let binary_path =
            std::env::current_exe().unwrap_or_else(|_| PathBuf::from("/usr/local/bin/icefall"));
        Self {
            data_dir: data_dir.to_path_buf(),
            binary_path,
        }
    }

    /// Execute the full update sequence.
    ///
    /// Calls `on_step(step_name, status)` at each phase so callers can report
    /// progress (e.g. over SSE or CLI output).  Returns `Ok(())` once the swap
    /// is complete and a restart has been requested.
    pub async fn apply(
        &self,
        new_binary_path: &Path,
        from_version: &str,
        to_version: &str,
        on_step: impl Fn(&str, &str),
    ) -> Result<(), UpdateError> {
        info!(
            from = from_version,
            to = to_version,
            "starting update apply sequence"
        );

        // Step 1: Backup current binary
        on_step("backup", "running");
        let rollback_path = self.backup_binary()?;
        on_step("backup", "done");
        info!(path = %rollback_path.display(), "binary backup complete");

        // Step 2: Backup database
        on_step("backup_db", "running");
        let db_backup_path = self.backup_database().await?;
        on_step("backup_db", "done");
        info!(path = %db_backup_path.display(), "database backup complete");

        // Step 3: Write pending update marker
        let marker = PendingUpdate {
            from_version: from_version.to_string(),
            to_version: to_version.to_string(),
            rollback_binary: rollback_path.to_string_lossy().to_string(),
            db_backup: db_backup_path.to_string_lossy().to_string(),
            started_at: chrono::Utc::now().to_rfc3339(),
        };
        self.write_pending_marker(&marker)?;
        info!("pending update marker written");

        // Step 4: Atomic binary swap
        on_step("swap", "running");
        self.swap_binary(new_binary_path)?;
        on_step("swap", "done");
        info!("binary swap complete");

        // Step 5: Trigger restart (non-blocking)
        on_step("restart", "running");
        self.trigger_restart()?;

        Ok(())
    }

    /// Copy the current binary to the rollback location.
    fn backup_binary(&self) -> Result<PathBuf, UpdateError> {
        let rollback_dir = self.data_dir.join("updates");
        std::fs::create_dir_all(&rollback_dir)?;

        let rollback_path = rollback_dir.join("icefall.rollback");
        std::fs::copy(&self.binary_path, &rollback_path).map_err(|e| {
            UpdateError::Apply(format!(
                "failed to backup binary from {} to {}: {e}",
                self.binary_path.display(),
                rollback_path.display()
            ))
        })?;

        Ok(rollback_path)
    }

    /// Copy the SQLite database file to a timestamped backup.
    async fn backup_database(&self) -> Result<PathBuf, UpdateError> {
        let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
        let backup_dir = self.data_dir.join("backups");
        std::fs::create_dir_all(&backup_dir)?;

        let backup_path = backup_dir.join(format!("icefall-{timestamp}-pre-update.db"));
        let db_path = self.data_dir.join("icefall.db");

        if db_path.exists() {
            std::fs::copy(&db_path, &backup_path).map_err(|e| {
                UpdateError::Apply(format!(
                    "failed to backup database from {} to {}: {e}",
                    db_path.display(),
                    backup_path.display()
                ))
            })?;
        } else {
            warn!(
                path = %db_path.display(),
                "database file not found, skipping backup"
            );
        }

        Ok(backup_path)
    }

    /// Persist the pending update marker to disk.
    fn write_pending_marker(&self, marker: &PendingUpdate) -> Result<(), UpdateError> {
        let marker_dir = self.data_dir.join("updates");
        std::fs::create_dir_all(&marker_dir)?;

        let marker_path = marker_dir.join("pending_update");
        let json = serde_json::to_string_pretty(marker)?;
        std::fs::write(&marker_path, json).map_err(|e| {
            UpdateError::Apply(format!(
                "failed to write pending marker at {}: {e}",
                marker_path.display()
            ))
        })?;

        Ok(())
    }

    /// Replace the running binary with the new one using an atomic rename.
    ///
    /// The new binary is first staged alongside the target (same filesystem) so
    /// that `rename(2)` is atomic.  Executable permissions are set before the
    /// rename so the process can be restarted immediately.
    fn swap_binary(&self, new_binary: &Path) -> Result<(), UpdateError> {
        let staging = self.binary_path.with_extension("new");

        std::fs::copy(new_binary, &staging).map_err(|e| {
            UpdateError::Apply(format!(
                "failed to stage new binary at {}: {e}",
                staging.display()
            ))
        })?;

        // Set executable permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&staging, std::fs::Permissions::from_mode(0o755))?;
        }

        // Atomic rename
        std::fs::rename(&staging, &self.binary_path).map_err(|e| {
            // Clean up staging file on failure
            let _ = std::fs::remove_file(&staging);
            UpdateError::Apply(format!(
                "failed to rename {} -> {}: {e}",
                staging.display(),
                self.binary_path.display()
            ))
        })?;

        Ok(())
    }

    /// Trigger a daemon restart, non-blocking.
    ///
    /// Under systemd the daemon is restarted via `systemctl restart icefall`.
    /// Outside systemd this is a no-op; the caller is expected to handle the
    /// restart (e.g. the CLI can exec the new binary directly).
    fn trigger_restart(&self) -> Result<(), UpdateError> {
        if Self::is_systemd_managed() {
            info!("triggering restart via systemd");
            std::process::Command::new("systemctl")
                .args(["restart", "icefall"])
                .spawn()
                .map_err(|e| UpdateError::Apply(format!("failed to restart via systemd: {e}")))?;
        } else {
            info!("not running under systemd, skipping automatic restart");
        }

        Ok(())
    }

    /// Returns `true` when the process was started by systemd (the
    /// `INVOCATION_ID` env var is set by systemd for every service).
    fn is_systemd_managed() -> bool {
        std::env::var("INVOCATION_ID").is_ok()
    }

    /// Read the pending update marker, if one exists.
    ///
    /// Called on startup to detect whether an update was in progress when the
    /// daemon last stopped.
    pub fn read_pending_marker(&self) -> Option<PendingUpdate> {
        let path = self.data_dir.join("updates").join("pending_update");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    /// Delete the pending update marker after a successful startup.
    pub fn clear_pending_marker(&self) -> Result<(), UpdateError> {
        let path = self.data_dir.join("updates").join("pending_update");
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }
}

/// Run post-update health checks on daemon startup.
///
/// If a pending update marker exists, we verify that the new version is
/// operational by running basic health checks (Docker connectivity, database
/// accessibility).  On success the marker is cleared and the update is
/// recorded.  On failure the marker is left in place so the rollback module
/// can restore the previous version.
pub async fn post_update_check(
    data_dir: &Path,
    db: &dyn Database,
    docker: &DockerClient,
) -> Result<(), UpdateError> {
    let applier = UpdateApplier::new(data_dir);

    let marker = match applier.read_pending_marker() {
        Some(m) => m,
        None => return Ok(()),
    };

    info!(
        from = marker.from_version,
        to = marker.to_version,
        "detected pending update, running post-update health checks"
    );

    // Health check 1: Docker connectivity
    let docker_ok = docker.ping().await.is_ok();
    if !docker_ok {
        error!("post-update health check failed: Docker is unreachable");
        return Err(UpdateError::Apply(
            "post-update health check failed: Docker unreachable".to_string(),
        ));
    }

    // Health check 2: Database accessibility
    let db_ok = db.list_projects().await.is_ok();
    if !db_ok {
        error!("post-update health check failed: database query failed");
        return Err(UpdateError::Apply(
            "post-update health check failed: database query failed".to_string(),
        ));
    }

    // All checks passed -- clear marker
    info!(
        version = marker.to_version,
        "post-update health checks passed, update complete"
    );
    applier.clear_pending_marker()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_applier(dir: &Path) -> UpdateApplier {
        UpdateApplier {
            data_dir: dir.to_path_buf(),
            binary_path: dir.join("fake-icefall"),
        }
    }

    #[test]
    fn pending_marker_roundtrip() {
        let tmp = TempDir::new().unwrap();
        let applier = make_applier(tmp.path());

        // No marker yet
        assert!(applier.read_pending_marker().is_none());

        // Write one
        let marker = PendingUpdate {
            from_version: "0.1.0".into(),
            to_version: "0.2.0".into(),
            rollback_binary: "/tmp/rollback".into(),
            db_backup: "/tmp/backup.db".into(),
            started_at: "2026-05-10T12:00:00Z".into(),
        };
        applier.write_pending_marker(&marker).unwrap();

        // Read it back
        let read = applier.read_pending_marker().unwrap();
        assert_eq!(read.from_version, "0.1.0");
        assert_eq!(read.to_version, "0.2.0");

        // Clear it
        applier.clear_pending_marker().unwrap();
        assert!(applier.read_pending_marker().is_none());
    }

    #[test]
    fn clear_missing_marker_is_ok() {
        let tmp = TempDir::new().unwrap();
        let applier = make_applier(tmp.path());
        assert!(applier.clear_pending_marker().is_ok());
    }

    #[test]
    fn backup_binary_copies_file() {
        let tmp = TempDir::new().unwrap();
        let binary = tmp.path().join("fake-icefall");
        std::fs::write(&binary, b"binary-content").unwrap();

        let applier = UpdateApplier {
            data_dir: tmp.path().to_path_buf(),
            binary_path: binary,
        };

        let rollback_path = applier.backup_binary().unwrap();
        assert!(rollback_path.exists());
        assert_eq!(std::fs::read(&rollback_path).unwrap(), b"binary-content");
    }

    #[test]
    fn swap_binary_replaces_file() {
        let tmp = TempDir::new().unwrap();
        let target = tmp.path().join("icefall");
        std::fs::write(&target, b"old-binary").unwrap();

        let new_binary = tmp.path().join("new-icefall");
        std::fs::write(&new_binary, b"new-binary").unwrap();

        let applier = UpdateApplier {
            data_dir: tmp.path().to_path_buf(),
            binary_path: target.clone(),
        };

        applier.swap_binary(&new_binary).unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"new-binary");

        // Staging file should be cleaned up (renamed away)
        assert!(!target.with_extension("new").exists());
    }

    #[tokio::test]
    async fn backup_database_copies_db() {
        let tmp = TempDir::new().unwrap();
        let db_file = tmp.path().join("icefall.db");
        std::fs::write(&db_file, b"sqlite-data").unwrap();

        let applier = make_applier(tmp.path());
        let backup = applier.backup_database().await.unwrap();
        assert!(backup.exists());
        assert_eq!(std::fs::read(&backup).unwrap(), b"sqlite-data");
    }

    #[tokio::test]
    async fn backup_database_handles_missing_db() {
        let tmp = TempDir::new().unwrap();
        let applier = make_applier(tmp.path());
        // Should not error when db file doesn't exist
        let backup = applier.backup_database().await.unwrap();
        assert!(!backup.exists());
    }
}
