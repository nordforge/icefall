use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/users", get(list_users).post(create_user))
}

async fn list_users(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let users = state.db.list_users().await?;
    Ok(Json(serde_json::json!({ "data": users })))
}

async fn create_user(
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "User creation not yet implemented".to_string(),
    ))
}
