use axum::body::Body;
use axum::extract::{Path, Query, State};
use axum::http::header;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::docker::DockerError;

/// Maximum upload size: 50 MB
const MAX_UPLOAD_BYTES: usize = 50 * 1024 * 1024;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/apps/{id}/volumes", get(list_volumes))
        .route(
            "/apps/{id}/volumes/{mount_index}/browse",
            get(browse_volume),
        )
        .route(
            "/apps/{id}/volumes/{mount_index}/download",
            get(download_file),
        )
        .route("/apps/{id}/volumes/{mount_index}/upload", post(upload_file))
        .route("/apps/{id}/volumes/{mount_index}/size", get(volume_size))
        .route("/apps/{id}/volumes/{mount_index}/delete", post(delete_file))
}

// ── Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct VolumeEntry {
    #[serde(default)]
    source: String,
    target: String,
    #[serde(default)]
    read_only: bool,
    /// Volume type: "local" (default) or "s3". S3 volumes cannot be browsed.
    #[serde(default = "default_volume_type", rename = "type")]
    volume_type: String,
}

fn default_volume_type() -> String {
    "local".to_string()
}

#[derive(Debug, Clone, serde::Serialize)]
struct FileEntry {
    name: String,
    size: u64,
    modified: String,
    is_dir: bool,
    permissions: String,
}

#[derive(Deserialize)]
struct BrowseQuery {
    path: Option<String>,
}

#[derive(Deserialize)]
struct DownloadQuery {
    path: String,
}

#[derive(Deserialize)]
struct UploadQuery {
    path: String,
    filename: String,
}

#[derive(Deserialize)]
struct DeleteBody {
    path: String,
}

// ── Path safety ────────────────────────────────────────────────────────

/// Validate that a user-supplied path stays within the volume mount target.
/// Returns the canonicalized absolute path inside the container.
fn safe_path(mount_target: &str, user_path: &str) -> Result<String, ApiError> {
    // Reject empty paths
    if user_path.is_empty() {
        return Ok(mount_target.to_string());
    }

    // Reject null bytes
    if user_path.contains('\0') {
        return Err(ApiError::BadRequest(
            "Path contains invalid characters".into(),
        ));
    }

    // Reject explicit traversal attempts
    for segment in user_path.split('/') {
        if segment == ".." {
            return Err(ApiError::BadRequest("Path traversal is not allowed".into()));
        }
    }

    // Build the full path
    let mount = mount_target.trim_end_matches('/');
    let sub = user_path.trim_start_matches('/');
    let full = if sub.is_empty() {
        mount.to_string()
    } else {
        format!("{mount}/{sub}")
    };

    // Ensure the resolved path starts with the mount target
    if !full.starts_with(mount) {
        return Err(ApiError::BadRequest(
            "Path is outside the volume mount".into(),
        ));
    }

    Ok(full)
}

/// Sanitize a filename for upload — strip path separators and traversal.
fn sanitize_filename(name: &str) -> Result<String, ApiError> {
    let name = name.trim();
    if name.is_empty() || name == "." || name == ".." {
        return Err(ApiError::BadRequest("Invalid filename".into()));
    }
    if name.contains('/') || name.contains('\\') || name.contains('\0') {
        return Err(ApiError::BadRequest(
            "Filename must not contain path separators".into(),
        ));
    }
    if name.len() > 255 {
        return Err(ApiError::BadRequest("Filename is too long".into()));
    }
    Ok(name.to_string())
}

// ── Helpers ────────────────────────────────────────────────────────────

/// Get the parsed volumes array and the running container name for an app.
async fn resolve_volume(
    state: &AppState,
    app_id: &str,
    mount_index: usize,
) -> Result<(VolumeEntry, String), ApiError> {
    let app = state
        .db
        .get_app(app_id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("App '{app_id}' not found")))?;

    // Parse volumes JSON
    let volumes_json = app
        .volumes
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("App has no volumes configured".into()))?;

    let volumes: Vec<VolumeEntry> = serde_json::from_str(volumes_json)
        .map_err(|_| ApiError::BadRequest("Invalid volumes configuration".into()))?;

    let volume = volumes
        .get(mount_index)
        .ok_or_else(|| {
            ApiError::NotFound(format!(
                "Volume mount index {mount_index} not found (app has {} mounts)",
                volumes.len()
            ))
        })?
        .clone();

    if volume.volume_type == "s3" {
        return Err(ApiError::BadRequest(
            "S3 volumes cannot be browsed through the container".into(),
        ));
    }

    // Find a running container for this app
    let label = format!("icefall.app={app_id}");
    let containers = state.docker.list_containers(Some(&label)).await?;
    let container = containers
        .iter()
        .find(|c| c.state == "running")
        .ok_or_else(|| {
            ApiError::BadRequest("No running container for this app. Start the app first.".into())
        })?;

    Ok((volume, container.name.clone()))
}

// ── Handlers ───────────────────────────────────────────────────────────

/// List volume mounts configured for an app.
async fn list_volumes(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let app = state
        .db
        .get_app(&id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("App '{id}' not found")))?;

    let volumes: Vec<VolumeEntry> = app
        .volumes
        .as_deref()
        .and_then(|v| serde_json::from_str(v).ok())
        .unwrap_or_default();

    Ok(Json(serde_json::json!({ "data": volumes })))
}

/// Browse files in a volume at the given path.
async fn browse_volume(
    State(state): State<AppState>,
    Path((id, mount_index)): Path<(String, usize)>,
    Query(query): Query<BrowseQuery>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (volume, container_name) = resolve_volume(&state, &id, mount_index).await?;
    let user_path = query.path.as_deref().unwrap_or("/");
    let full_path = safe_path(&volume.target, user_path)?;

    // Run ls inside the container
    let cmd: Vec<String> = vec![
        "ls".into(),
        "-la".into(),
        "--time-style=long-iso".into(),
        full_path.clone(),
    ];

    let output = state
        .docker
        .exec_in_container(&container_name, &cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let entries = parse_ls_output(&output);

    Ok(Json(serde_json::json!({
        "data": entries,
        "path": user_path,
        "mount_target": volume.target,
    })))
}

/// Parse `ls -la --time-style=long-iso` output into structured entries.
fn parse_ls_output(output: &str) -> Vec<FileEntry> {
    let mut entries = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        // Skip empty lines and the "total" header
        if line.is_empty() || line.starts_with("total") {
            continue;
        }

        // Format: permissions links owner group size date time name
        // Example: drwxr-xr-x 2 root root 4096 2025-01-15 10:30 mydir
        // Example: -rw-r--r-- 1 root root 1234 2025-01-15 10:30 myfile.txt
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 8 {
            continue;
        }

        let permissions = parts[0];
        let name = parts[7..].join(" ");

        // Skip . and ..
        if name == "." || name == ".." {
            continue;
        }

        let is_dir = permissions.starts_with('d');
        let size: u64 = parts[4].parse().unwrap_or(0);
        let modified = format!("{} {}", parts[5], parts[6]);

        entries.push(FileEntry {
            name,
            size,
            modified,
            is_dir,
            permissions: permissions.to_string(),
        });
    }

    entries
}

/// Download a file from a volume.
async fn download_file(
    State(state): State<AppState>,
    Path((id, mount_index)): Path<(String, usize)>,
    Query(query): Query<DownloadQuery>,
) -> Result<Response, ApiError> {
    let (volume, container_name) = resolve_volume(&state, &id, mount_index).await?;
    let full_path = safe_path(&volume.target, &query.path)?;

    // Verify it's a file (not a directory) using stat
    let check_cmd: Vec<String> = vec![
        "sh".into(),
        "-c".into(),
        format!("[ -f '{}' ] && echo FILE || echo NOTFILE", full_path),
    ];
    let check_output = state
        .docker
        .exec_in_container(&container_name, &check_cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;
    if check_output.trim() != "FILE" {
        return Err(ApiError::NotFound(format!(
            "File not found or is a directory: {}",
            query.path
        )));
    }

    // Read the file via base64 encoding to safely transfer binary data
    let cmd: Vec<String> = vec!["base64".into(), full_path.clone()];

    let output = state
        .docker
        .exec_in_container(&container_name, &cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        output.trim().replace('\n', ""),
    )
    .map_err(|_| {
        ApiError::Internal(Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Failed to decode file contents",
        )))
    })?;

    // Extract filename from path
    let filename = query.path.rsplit('/').next().unwrap_or("download");

    let response = Response::builder()
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{filename}\""),
        )
        .body(Body::from(bytes))
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    Ok(response)
}

/// Upload a file to a volume path.
async fn upload_file(
    State(state): State<AppState>,
    Path((id, mount_index)): Path<(String, usize)>,
    Query(query): Query<UploadQuery>,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (volume, container_name) = resolve_volume(&state, &id, mount_index).await?;

    if volume.read_only {
        return Err(ApiError::BadRequest(
            "Cannot upload to a read-only volume".into(),
        ));
    }

    // Enforce size limit
    if body.len() > MAX_UPLOAD_BYTES {
        return Err(ApiError::BadRequest(format!(
            "File too large. Maximum upload size is {} MB.",
            MAX_UPLOAD_BYTES / (1024 * 1024)
        )));
    }

    let filename = sanitize_filename(&query.filename)?;
    let dest_dir = safe_path(&volume.target, &query.path)?;
    let dest_path = format!("{}/{}", dest_dir.trim_end_matches('/'), filename);

    // Ensure the destination path stays within the volume
    if !dest_path.starts_with(volume.target.trim_end_matches('/')) {
        return Err(ApiError::BadRequest(
            "Destination path is outside the volume mount".into(),
        ));
    }

    // Ensure destination directory exists
    let mkdir_cmd: Vec<String> = vec!["mkdir".into(), "-p".into(), dest_dir.clone()];
    let _ = state
        .docker
        .exec_in_container(&container_name, &mkdir_cmd)
        .await;

    // Build a tar archive containing the file, then upload via docker cp
    let mut tar_buf = Vec::new();
    {
        let mut builder = tar::Builder::new(&mut tar_buf);
        let mut header = tar::Header::new_gnu();
        header.set_size(body.len() as u64);
        header.set_mode(0o644);
        header.set_cksum();
        builder
            .append_data(&mut header, &filename, &body[..])
            .map_err(|e| ApiError::Internal(Box::new(e)))?;
        builder
            .finish()
            .map_err(|e| ApiError::Internal(Box::new(e)))?;
    }

    use bollard::container::UploadToContainerOptions;
    state
        .docker
        .inner()
        .upload_to_container(
            &container_name,
            Some(UploadToContainerOptions {
                path: dest_dir.clone(),
                ..Default::default()
            }),
            bytes::Bytes::from(tar_buf),
        )
        .await
        .map_err(|e| ApiError::Internal(Box::new(DockerError::Api(e))))?;

    Ok(Json(serde_json::json!({
        "message": "uploaded",
        "path": dest_path,
        "size": body.len(),
    })))
}

/// Get the disk usage of a volume mount.
async fn volume_size(
    State(state): State<AppState>,
    Path((id, mount_index)): Path<(String, usize)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (volume, container_name) = resolve_volume(&state, &id, mount_index).await?;

    let cmd: Vec<String> = vec!["du".into(), "-sb".into(), volume.target.clone()];

    let output = state
        .docker
        .exec_in_container(&container_name, &cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    // Output format: "12345\t/path"
    let bytes_used: u64 = output
        .split_whitespace()
        .next()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    Ok(Json(serde_json::json!({
        "data": {
            "bytes_used": bytes_used,
            "mount_target": volume.target,
        }
    })))
}

/// Delete a file or directory from a volume.
async fn delete_file(
    State(state): State<AppState>,
    Path((id, mount_index)): Path<(String, usize)>,
    Json(body): Json<DeleteBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (volume, container_name) = resolve_volume(&state, &id, mount_index).await?;

    if volume.read_only {
        return Err(ApiError::BadRequest(
            "Cannot delete from a read-only volume".into(),
        ));
    }

    let full_path = safe_path(&volume.target, &body.path)?;

    // Don't allow deleting the mount root itself
    if full_path.trim_end_matches('/') == volume.target.trim_end_matches('/') {
        return Err(ApiError::BadRequest(
            "Cannot delete the volume mount root".into(),
        ));
    }

    let cmd: Vec<String> = vec!["rm".into(), "-rf".into(), full_path.clone()];

    state
        .docker
        .exec_in_container(&container_name, &cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    Ok(Json(serde_json::json!({
        "message": "deleted",
        "path": full_path,
    })))
}
