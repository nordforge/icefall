use std::sync::Arc;

use tracing::{debug, error, info, warn};

use crate::config::IcefallConfig;
use crate::db::models::now_iso8601;
use crate::db::Database;
use crate::events::{EventBus, EventType};
use crate::update::discovery::UpdateChecker;
use crate::update::CURRENT_VERSION;

/// Default interval between update checks: 6 hours.
const CHECK_INTERVAL: std::time::Duration = std::time::Duration::from_secs(6 * 60 * 60);

/// Default GitHub repository for Icefall releases.
const DEFAULT_GITHUB_REPO: &str = "nordforge/icefall";

/// Spawn a background task that periodically checks for Icefall updates.
///
/// When a new update is found, the state is persisted to the database and an
/// SSE event is emitted so the dashboard can show a notification.
pub fn spawn_update_checker(
    db: Arc<dyn Database>,
    _config: Arc<IcefallConfig>,
    event_bus: Arc<EventBus>,
) {
    tokio::spawn(async move {
        // Small initial delay so the daemon finishes startup first
        tokio::time::sleep(std::time::Duration::from_secs(30)).await;

        let checker = UpdateChecker::new(DEFAULT_GITHUB_REPO);

        loop {
            debug!("running periodic update check");
            if let Err(e) = run_check(&checker, &db, &event_bus).await {
                warn!("update check failed: {e}");
            }

            tokio::time::sleep(CHECK_INTERVAL).await;
        }
    });
}

async fn run_check(
    checker: &UpdateChecker,
    db: &Arc<dyn Database>,
    event_bus: &Arc<EventBus>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Record the check timestamp
    let now = now_iso8601();
    db.set_last_check_at(&now).await.map_err(|e| {
        error!("failed to set last_check_at: {e}");
        e
    })?;

    // Load current state
    let state = db.get_update_state().await?;

    // Check for updates
    let result = checker
        .check_for_update(CURRENT_VERSION, &state.channel, &state.highest_seen_version)
        .await;

    match result {
        Ok(Some((manifest, info))) => {
            // Check if this version is skipped
            if db.is_version_skipped(&info.version).await? {
                debug!("version {} is skipped, ignoring", info.version);
                return Ok(());
            }

            info!(
                "new update available: {} (current: {CURRENT_VERSION})",
                info.version
            );

            // Store the available update in the database
            let highlights_json = serde_json::to_string(&info.changelog_highlights)?;
            db.set_update_available(
                &info.version,
                &info.release_url,
                &info.release_notes,
                &highlights_json,
            )
            .await?;

            // Update highest seen version
            db.update_highest_seen(&info.version).await?;

            // Emit SSE event so the dashboard can show a notification
            event_bus.emit(
                EventType::UpdateAvailable,
                None,
                None,
                serde_json::json!({
                    "version": info.version,
                    "release_url": info.release_url,
                    "breaking": manifest.breaking,
                    "requires_migration": manifest.requires_migration,
                    "changelog_highlights": info.changelog_highlights,
                }),
            );
        }
        Ok(None) => {
            debug!("no update available (current: {CURRENT_VERSION})");
        }
        Err(e) => {
            warn!("update check error: {e}");
            // Store error state but don't fail the whole check loop
            let _ = db.set_update_error(&e.to_string()).await;
        }
    }

    Ok(())
}
