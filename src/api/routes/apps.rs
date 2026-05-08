use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::db::models::{NewApp, NewEnvironment, UpdateApp};

#[derive(Deserialize, Default)]
struct ListAppsQuery {
    tag: Option<String>,
    project_id: Option<String>,
}

#[derive(Deserialize)]
struct CreateAppRequest {
    name: String,
    git_repo: Option<String>,
    git_branch: Option<String>,
    framework: Option<String>,
    image_ref: Option<String>,
    compose_content: Option<String>,
    port: Option<u16>,
    deploy_mode: Option<String>,
}

#[derive(Deserialize)]
struct UpdateAppRequest {
    name: Option<String>,
    git_repo: Option<String>,
    git_branch: Option<String>,
    framework: Option<String>,
    build_config: Option<String>,
    resource_limits: Option<String>,
    preview_enabled: Option<bool>,
    preview_branch_pattern: Option<Option<String>>,
    tags: Option<String>,
    volumes: Option<String>,
    image_ref: Option<Option<String>>,
    compose_content: Option<Option<String>>,
    project_id: Option<Option<String>>,
    deploy_mode: Option<String>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/apps", get(list_apps).post(create_app))
        .route(
            "/apps/{id}",
            get(get_app).put(update_app).delete(delete_app),
        )
        .route("/apps/{id}/start", post(start_app))
        .route("/apps/{id}/stop", post(stop_app))
        .route("/apps/{id}/restart", post(restart_app))
}

async fn list_apps(
    State(state): State<AppState>,
    Query(query): Query<ListAppsQuery>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let mut apps = if let Some(pid) = &query.project_id {
        state.db.list_apps_by_project(pid).await?
    } else {
        state.db.list_apps().await?
    };

    if let Some(tag) = &query.tag {
        let tag = tag.trim().to_lowercase();
        if !tag.is_empty() {
            apps.retain(|app| {
                app.tags
                    .as_deref()
                    .unwrap_or("")
                    .split(',')
                    .any(|t| t.trim() == tag)
            });
        }
    }

    Ok(Json(serde_json::json!({ "data": apps })))
}

async fn create_app(
    State(state): State<AppState>,
    Json(body): Json<CreateAppRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if body.name.trim().is_empty() {
        return Err(ApiError::BadRequest("App name must not be empty".to_string()));
    }

    // Validate compose YAML if provided
    if let Some(ref yaml) = body.compose_content {
        if crate::deploy::compose::ComposeDeployer::parse(yaml).is_err() {
            return Err(ApiError::BadRequest("Invalid Docker Compose YAML".to_string()));
        }
    }

    let app = state
        .db
        .create_app(&NewApp {
            name: body.name.clone(),
            git_repo: body.git_repo,
            git_branch: body.git_branch.unwrap_or_else(|| "main".into()),
            framework: body.framework,
            image_ref: body.image_ref,
            compose_content: body.compose_content,
            deploy_mode: body.deploy_mode,
        })
        .await?;

    // If a port was provided (typically for image-based apps), store it in build_config
    if let Some(port) = body.port {
        let build_config = serde_json::json!({ "port": port }).to_string();
        let _ = state
            .db
            .update_app(
                &app.id,
                &UpdateApp {
                    name: None,
                    git_repo: None,
                    git_branch: None,
                    framework: None,
                    build_config: Some(build_config),
                    resource_limits: None,
                    preview_enabled: None,
                    preview_branch_pattern: None,
                    tags: None,
                    volumes: None,
                    image_ref: None,
                    compose_content: None,
                    project_id: None,
                    deploy_mode: None,
                },
            )
            .await;
    }

    // Create a default production environment for the new app
    let _ = state
        .db
        .create_environment(&NewEnvironment {
            app_id: app.id.clone(),
            name: "production".into(),
            env_type: "production".into(),
            branch: None,
        })
        .await?;

    Ok(Json(serde_json::json!({ "data": app })))
}

async fn get_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let app = state
        .db
        .get_app(&id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("App '{id}' not found")))?;
    Ok(Json(serde_json::json!({ "data": app })))
}

async fn update_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateAppRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let app = state
        .db
        .update_app(
            &id,
            &UpdateApp {
                name: body.name,
                git_repo: body.git_repo,
                git_branch: body.git_branch,
                framework: body.framework,
                build_config: body.build_config,
                resource_limits: body.resource_limits,
                preview_enabled: body.preview_enabled,
                preview_branch_pattern: body.preview_branch_pattern,
                tags: body.tags.map(|t| {
                    t.split(',')
                        .map(|s| s.trim().to_lowercase())
                        .filter(|s| !s.is_empty())
                        .collect::<Vec<_>>()
                        .join(",")
                }),
                volumes: body.volumes,
                image_ref: body.image_ref,
                compose_content: body.compose_content,
                project_id: body.project_id,
                deploy_mode: body.deploy_mode,
            },
        )
        .await?;

    Ok(Json(serde_json::json!({ "data": app })))
}

async fn delete_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    state.db.delete_app(&id).await?;
    Ok(Json(serde_json::json!({ "message": "deleted" })))
}

async fn start_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    state
        .db
        .get_app(&id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("App '{id}' not found")))?;

    let label = format!("icefall.app={id}");
    let containers = state.docker.list_containers(Some(&label)).await?;

    let mut started = 0u32;
    for container in &containers {
        if container.state != "running" {
            state.docker.start_container(&container.id).await?;
            started += 1;
        }
    }

    Ok(Json(serde_json::json!({ "message": "started", "containers": started })))
}

async fn stop_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    state
        .db
        .get_app(&id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("App '{id}' not found")))?;

    let label = format!("icefall.app={id}");
    let containers = state.docker.list_containers(Some(&label)).await?;

    let mut stopped = 0u32;
    for container in &containers {
        if container.state == "running" {
            state.docker.stop_container(&container.id, Some(10)).await?;
            stopped += 1;
        }
    }

    Ok(Json(serde_json::json!({ "message": "stopped", "containers": stopped })))
}

async fn restart_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    state
        .db
        .get_app(&id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("App '{id}' not found")))?;

    let label = format!("icefall.app={id}");
    let containers = state.docker.list_containers(Some(&label)).await?;

    let mut restarted = 0u32;
    for container in &containers {
        if container.state == "running" {
            state.docker.restart_container(&container.id).await?;
            restarted += 1;
        }
    }

    Ok(Json(serde_json::json!({ "message": "restarted", "containers": restarted })))
}
