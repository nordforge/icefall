use axum::extract::State;
use axum::http::HeaderMap;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use tracing::{error, info};

use crate::api::error::ApiError;
use crate::api::routes::auth::authenticate_from_headers;
use crate::api::AppState;
use crate::db::models::{new_id, now_iso8601, UpdateHistoryEntry};
use crate::update::apply::UpdateApplier;
use crate::update::discovery::UpdateChecker;
use crate::update::download::UpdateDownloader;
use crate::update::rollback::UpdateRollback;
use crate::update::CURRENT_VERSION;

/// Default GitHub repository for Icefall releases.
const DEFAULT_GITHUB_REPO: &str = "nordforge/icefall";

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/system/update/check", get(check_for_update))
        .route("/system/update/status", get(get_update_status))
        .route("/system/update/download", post(start_download))
        .route("/system/update/apply", post(apply_update))
        .route("/system/update/rollback", post(rollback_update))
        .route("/system/update/skip", post(skip_version))
        .route(
            "/system/update/preferences",
            get(get_update_preferences).patch(update_preferences),
        )
        .route("/system/update/history", get(get_update_history))
}

/// Require an authenticated admin user. Returns the user or an ApiError.
async fn require_admin(state: &AppState, headers: &HeaderMap) -> Result<(), ApiError> {
    let user = authenticate_from_headers(state, headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;
    if user.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }
    Ok(())
}

/// GET /system/update/check
///
/// Triggers a fresh update check against GitHub Releases and returns the result.
async fn check_for_update(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let update_state = state.db.get_update_state().await?;

    // Record the check timestamp
    let now = now_iso8601();
    state.db.set_last_check_at(&now).await?;

    let checker = UpdateChecker::new(DEFAULT_GITHUB_REPO);
    let result = checker
        .check_for_update(
            CURRENT_VERSION,
            &update_state.channel,
            &update_state.highest_seen_version,
        )
        .await;

    match result {
        Ok(Some((manifest, info))) => {
            // Check if this version is skipped
            let skipped = state.db.is_version_skipped(&info.version).await?;
            if skipped {
                return Ok(Json(serde_json::json!({
                    "data": {
                        "available": false,
                        "current_version": CURRENT_VERSION,
                        "latest_version": info.version,
                        "skipped": true,
                        "checked_at": now,
                    }
                })));
            }

            // Store the available update
            let highlights_json =
                serde_json::to_string(&info.changelog_highlights).unwrap_or_default();
            state
                .db
                .set_update_available(
                    &info.version,
                    &info.release_url,
                    &info.release_notes,
                    &highlights_json,
                )
                .await?;
            state.db.update_highest_seen(&info.version).await?;

            Ok(Json(serde_json::json!({
                "data": {
                    "available": true,
                    "current_version": CURRENT_VERSION,
                    "latest_version": info.version,
                    "changelog_highlights": info.changelog_highlights,
                    "changelog_url": manifest.changelog_url,
                    "breaking": manifest.breaking,
                    "breaking_changes": manifest.breaking_changes,
                    "published_at": info.published_at,
                    "checked_at": now,
                }
            })))
        }
        Ok(None) => Ok(Json(serde_json::json!({
            "data": {
                "available": false,
                "current_version": CURRENT_VERSION,
                "latest_version": CURRENT_VERSION,
                "checked_at": now,
            }
        }))),
        Err(e) => {
            let _ = state.db.set_update_error(&e.to_string()).await;
            Err(ApiError::Internal(Box::new(std::io::Error::other(
                e.to_string(),
            ))))
        }
    }
}

/// GET /system/update/status
///
/// Returns the current update state from the database (download progress, etc.).
async fn get_update_status(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let update_state = state.db.get_update_state().await?;

    let highlights: Vec<String> = update_state
        .changelog_highlights
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    // Check rollback availability
    let rollback = UpdateRollback::new(&state.config.data_dir);
    let rollback_available = rollback.has_rollback();

    Ok(Json(serde_json::json!({
        "data": {
            "current_version": CURRENT_VERSION,
            "available_version": update_state.available_version,
            "release_url": update_state.release_url,
            "changelog_highlights": highlights,
            "channel": update_state.channel,
            "download_state": update_state.download_state,
            "download_progress": update_state.download_progress,
            "last_check_at": update_state.last_check_at,
            "last_update_at": update_state.last_update_at,
            "last_update_version": update_state.last_update_version,
            "error_message": update_state.error_message,
            "rollback_available": rollback_available,
        }
    })))
}

/// POST /system/update/download
///
/// Starts downloading the update artifact in the background.
async fn start_download(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let update_state = state.db.get_update_state().await?;

    let version = update_state
        .available_version
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("No update available to download".into()))?
        .to_string();

    // Check if already downloading
    if update_state.download_state == "downloading" {
        return Ok(Json(serde_json::json!({
            "data": {
                "status": "already_downloading",
                "version": version,
                "progress": update_state.download_progress,
            }
        })));
    }

    // Mark as downloading
    state
        .db
        .set_update_download_state("downloading", 0, None)
        .await?;

    // Clone version for the response before moving into the spawn
    let response_version = version.clone();

    // Spawn background download task
    let db = state.db.clone();
    let data_dir = state.config.data_dir.clone();

    tokio::spawn(async move {
        let updates_dir = data_dir.join("updates");
        let downloader = UpdateDownloader::new(updates_dir);

        // We need the manifest to get the artifact URL. Re-check to get it.
        let checker = UpdateChecker::new(DEFAULT_GITHUB_REPO);
        let check_state = match db.get_update_state().await {
            Ok(s) => s,
            Err(e) => {
                error!("failed to get update state for download: {e}");
                let _ = db.set_update_error(&e.to_string()).await;
                return;
            }
        };

        let result = checker
            .check_for_update(
                CURRENT_VERSION,
                &check_state.channel,
                // Use "0.0.0" to always find the version we already know about
                "0.0.0",
            )
            .await;

        let (manifest, _info) = match result {
            Ok(Some(pair)) => pair,
            Ok(None) => {
                let _ = db.set_update_error("Update no longer available").await;
                return;
            }
            Err(e) => {
                error!("re-check for download failed: {e}");
                let _ = db.set_update_error(&e.to_string()).await;
                return;
            }
        };

        let target = crate::update::artifact_target();
        let artifact = match manifest.artifact_for_target(target) {
            Some(a) => a.clone(),
            None => {
                let msg = format!("No artifact available for target {target}");
                error!("{msg}");
                let _ = db.set_update_error(&msg).await;
                return;
            }
        };

        // Clone db for progress callback
        let db_progress = db.clone();
        let download_version = version.clone();

        let result = downloader
            .download(&artifact, &download_version, |downloaded, total| {
                if total > 0 {
                    let pct = ((downloaded as f64 / total as f64) * 100.0) as i64;
                    // Fire-and-forget progress update
                    let db_inner = db_progress.clone();
                    tokio::spawn(async move {
                        let _ = db_inner
                            .set_update_download_state("downloading", pct, None)
                            .await;
                    });
                }
            })
            .await;

        match result {
            Ok(path) => {
                // Extract the archive
                let extract_result = downloader
                    .extract_and_validate(&path, &download_version)
                    .await;
                match extract_result {
                    Ok(binary_path) => {
                        let path_str = binary_path.to_string_lossy().to_string();
                        info!("download complete: {path_str}");
                        let _ = db
                            .set_update_download_state("ready", 100, Some(&path_str))
                            .await;
                    }
                    Err(e) => {
                        error!("extraction failed: {e}");
                        let _ = db.set_update_error(&e.to_string()).await;
                    }
                }
            }
            Err(e) => {
                error!("download failed: {e}");
                let _ = db.set_update_error(&e.to_string()).await;
            }
        }
    });

    Ok(Json(serde_json::json!({
        "data": {
            "status": "download_started",
            "version": response_version,
        }
    })))
}

/// POST /system/update/apply
///
/// Triggers the update apply sequence (backup, swap, restart).
async fn apply_update(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let update_state = state.db.get_update_state().await?;

    if update_state.download_state != "ready" {
        return Err(ApiError::BadRequest(
            "Update must be downloaded before applying. Current state: ".to_string()
                + &update_state.download_state,
        ));
    }

    let version = update_state
        .available_version
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("No update version available".into()))?
        .to_string();

    let binary_path = update_state
        .download_path
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("No downloaded binary path found".into()))?
        .to_string();

    let data_dir = state.config.data_dir.clone();
    let db = state.db.clone();
    let from_version = CURRENT_VERSION.to_string();
    let to_version = version.clone();

    // Spawn the apply in a background task so we can return a response
    tokio::spawn(async move {
        let applier = UpdateApplier::new(&data_dir);
        let start = std::time::Instant::now();

        let result = applier
            .apply(
                std::path::Path::new(&binary_path),
                &from_version,
                &to_version,
                db.as_ref(),
                |step, status| {
                    info!("update apply: {step} = {status}");
                },
            )
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(()) => {
                info!("update applied successfully: {from_version} -> {to_version}");

                // Record in history
                let entry = UpdateHistoryEntry {
                    id: new_id(),
                    version: to_version.clone(),
                    previous_version: from_version,
                    status: "success".to_string(),
                    duration_secs: Some(duration),
                    error: None,
                    changelog_url: None,
                    applied_at: now_iso8601(),
                };
                let _ = db.record_update_history(&entry).await;
                let _ = db.clear_update_available().await;
            }
            Err(e) => {
                error!("update apply failed: {e}");
                let _ = db.set_update_error(&e.to_string()).await;

                // Record failure in history
                let entry = UpdateHistoryEntry {
                    id: new_id(),
                    version: to_version,
                    previous_version: from_version,
                    status: "failed".to_string(),
                    duration_secs: Some(duration),
                    error: Some(e.to_string()),
                    changelog_url: None,
                    applied_at: now_iso8601(),
                };
                let _ = db.record_update_history(&entry).await;
            }
        }
    });

    Ok(Json(serde_json::json!({
        "data": {
            "status": "applying",
            "version": version,
            "message": "Update is being applied. The service will restart shortly.",
        }
    })))
}

/// POST /system/update/rollback
///
/// Triggers a rollback to the previous version.
async fn rollback_update(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let rollback = UpdateRollback::new(&state.config.data_dir);

    if !rollback.has_rollback() {
        return Err(ApiError::BadRequest("No rollback binary available".into()));
    }

    let info = rollback
        .rollback_info()
        .ok_or_else(|| ApiError::BadRequest("Could not read rollback binary metadata".into()))?;

    // Execute the rollback
    rollback
        .execute_rollback()
        .map_err(|e| ApiError::Internal(Box::new(std::io::Error::other(e.to_string()))))?;

    // Record in history
    let entry = UpdateHistoryEntry {
        id: new_id(),
        version: CURRENT_VERSION.to_string(),
        previous_version: CURRENT_VERSION.to_string(),
        status: "rolled_back".to_string(),
        duration_secs: None,
        error: None,
        changelog_url: None,
        applied_at: now_iso8601(),
    };
    let _ = state.db.record_update_history(&entry).await;

    Ok(Json(serde_json::json!({
        "data": {
            "status": "rolling_back",
            "rollback_binary": info.path,
            "message": "Rollback initiated. The service will restart shortly.",
        }
    })))
}

#[derive(Deserialize)]
struct SkipVersionRequest {
    version: String,
}

/// POST /system/update/skip
///
/// Skips a specific version so it won't be offered again.
async fn skip_version(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<SkipVersionRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let version = body.version.trim().to_string();
    if version.is_empty() {
        return Err(ApiError::BadRequest("version is required".into()));
    }

    state.db.skip_update_version(&version).await?;

    // Clear the available update if it matches the skipped version
    let update_state = state.db.get_update_state().await?;
    if update_state.available_version.as_deref() == Some(&version) {
        state.db.clear_update_available().await?;
    }

    Ok(Json(serde_json::json!({
        "data": {
            "skipped": version,
        },
        "message": "Version skipped"
    })))
}

/// GET /system/update/preferences
///
/// Returns the current update preferences (channel, auto-update settings).
async fn get_update_preferences(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let update_state = state.db.get_update_state().await?;

    Ok(Json(serde_json::json!({
        "data": {
            "channel": update_state.channel,
            "current_version": CURRENT_VERSION,
            "auto_update_enabled": update_state.auto_update_enabled,
            "auto_update_channel": update_state.auto_update_channel,
            "auto_update_window_start": update_state.auto_update_window_start,
            "auto_update_window_end": update_state.auto_update_window_end,
            "auto_update_notify_before_minutes": update_state.auto_update_notify_before_minutes,
        }
    })))
}

#[derive(Deserialize)]
struct UpdatePreferencesRequest {
    channel: Option<String>,
    auto_update_enabled: Option<bool>,
    auto_update_channel: Option<String>,
    auto_update_window_start: Option<String>,
    auto_update_window_end: Option<String>,
    auto_update_notify_before_minutes: Option<i64>,
}

/// PATCH /system/update/preferences
///
/// Updates the update channel and/or auto-update settings.
async fn update_preferences(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<UpdatePreferencesRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let valid_channels = ["stable", "beta", "nightly"];

    if let Some(ref channel) = body.channel {
        if !valid_channels.contains(&channel.as_str()) {
            return Err(ApiError::BadRequest(format!(
                "Invalid channel '{}'. Must be one of: {}",
                channel,
                valid_channels.join(", ")
            )));
        }
        state.db.set_update_channel(channel).await?;
    }

    // Update auto-update settings if any field is provided
    if body.auto_update_enabled.is_some()
        || body.auto_update_channel.is_some()
        || body.auto_update_window_start.is_some()
        || body.auto_update_window_end.is_some()
        || body.auto_update_notify_before_minutes.is_some()
    {
        let current = state.db.get_update_state().await?;

        let enabled = body
            .auto_update_enabled
            .unwrap_or(current.auto_update_enabled);
        let au_channel = body
            .auto_update_channel
            .as_deref()
            .unwrap_or(&current.auto_update_channel);

        if !valid_channels.contains(&au_channel) {
            return Err(ApiError::BadRequest(format!(
                "Invalid auto_update_channel '{}'. Must be one of: {}",
                au_channel,
                valid_channels.join(", ")
            )));
        }

        let window_start = body
            .auto_update_window_start
            .as_deref()
            .unwrap_or(&current.auto_update_window_start);
        let window_end = body
            .auto_update_window_end
            .as_deref()
            .unwrap_or(&current.auto_update_window_end);

        if chrono::NaiveTime::parse_from_str(window_start, "%H:%M").is_err() {
            return Err(ApiError::BadRequest(format!(
                "Invalid window_start '{}'. Use HH:MM format.",
                window_start
            )));
        }
        if chrono::NaiveTime::parse_from_str(window_end, "%H:%M").is_err() {
            return Err(ApiError::BadRequest(format!(
                "Invalid window_end '{}'. Use HH:MM format.",
                window_end
            )));
        }

        let notify_before = body
            .auto_update_notify_before_minutes
            .unwrap_or(current.auto_update_notify_before_minutes);

        state
            .db
            .set_auto_update_settings(enabled, au_channel, window_start, window_end, notify_before)
            .await?;
    }

    let update_state = state.db.get_update_state().await?;

    Ok(Json(serde_json::json!({
        "data": {
            "channel": update_state.channel,
            "current_version": CURRENT_VERSION,
            "auto_update_enabled": update_state.auto_update_enabled,
            "auto_update_channel": update_state.auto_update_channel,
            "auto_update_window_start": update_state.auto_update_window_start,
            "auto_update_window_end": update_state.auto_update_window_end,
            "auto_update_notify_before_minutes": update_state.auto_update_notify_before_minutes,
        },
        "message": "Update preferences saved"
    })))
}

/// GET /system/update/history
///
/// Returns the update history log.
async fn get_update_history(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    require_admin(&state, &headers).await?;

    let history = state.db.list_update_history(50).await?;

    let entries: Vec<serde_json::Value> = history
        .into_iter()
        .map(|e| {
            serde_json::json!({
                "id": e.id,
                "version": e.version,
                "previous_version": e.previous_version,
                "status": e.status,
                "duration_secs": e.duration_secs,
                "error": e.error,
                "changelog_url": e.changelog_url,
                "applied_at": e.applied_at,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "data": entries
    })))
}
