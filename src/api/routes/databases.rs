use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/databases",
        get(list_databases).post(create_database),
    )
}

async fn list_databases(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let dbs = state.db.list_managed_dbs().await?;
    Ok(Json(serde_json::json!({ "data": dbs })))
}

async fn create_database(
    State(_state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "Database creation not yet implemented".to_string(),
    ))
}
