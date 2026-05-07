use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/apps", get(list_apps).post(create_app))
        .route(
            "/apps/{id}",
            get(get_app).put(update_app).delete(delete_app),
        )
        .merge(super::deploys::routes())
        .merge(super::env_vars::routes())
        .merge(super::domains::routes())
}

async fn list_apps(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let apps = state.db.list_apps().await?;
    Ok(Json(serde_json::json!({ "data": apps })))
}

async fn create_app(
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "App creation not yet implemented".to_string(),
    ))
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
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "App update not yet implemented".to_string(),
    ))
}

async fn delete_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    state.db.delete_app(&id).await?;
    Ok(Json(serde_json::json!({ "message": "deleted" })))
}
