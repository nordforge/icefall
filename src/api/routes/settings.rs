use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/settings", get(get_settings).put(update_settings))
}

async fn get_settings() -> Result<Json<serde_json::Value>, ApiError> {
    Ok(Json(serde_json::json!({ "data": {} })))
}

async fn update_settings() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "Settings update not yet implemented".to_string(),
    ))
}
