use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::db::models::{NewApp, NewEnvironment, UpdateApp};

#[derive(Deserialize)]
struct CreateAppRequest {
    name: String,
    git_repo: Option<String>,
    git_branch: Option<String>,
    framework: Option<String>,
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
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/apps", get(list_apps).post(create_app))
        .route(
            "/apps/{id}",
            get(get_app).put(update_app).delete(delete_app),
        )
}

async fn list_apps(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let apps = state.db.list_apps().await?;
    Ok(Json(serde_json::json!({ "data": apps })))
}

async fn create_app(
    State(state): State<AppState>,
    Json(body): Json<CreateAppRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if body.name.trim().is_empty() {
        return Err(ApiError::BadRequest("App name must not be empty".to_string()));
    }

    let app = state
        .db
        .create_app(&NewApp {
            name: body.name,
            git_repo: body.git_repo,
            git_branch: body.git_branch.unwrap_or_else(|| "main".into()),
            framework: body.framework,
        })
        .await?;

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
