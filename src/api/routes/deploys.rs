use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/apps/{id}/deploys",
        get(list_deploys).post(create_deploy),
    )
}

async fn list_deploys(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let deploys = state.db.list_deploys(&id, 50).await?;
    Ok(Json(serde_json::json!({ "data": deploys })))
}

async fn create_deploy(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "Deploy trigger not yet implemented".to_string(),
    ))
}
