use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/apps/{id}/metrics", get(get_metrics))
        .route("/apps/{id}/metrics/history", get(get_metrics_history))
}

async fn get_metrics(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let snapshot = state.metrics_store.get_current(&id).await;
    match snapshot {
        Some(s) => Ok(Json(serde_json::json!({ "data": s }))),
        None => Ok(Json(serde_json::json!({ "data": null, "message": "No metrics available yet" }))),
    }
}

async fn get_metrics_history(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let history = state.metrics_store.get_history(&id).await;
    Ok(Json(serde_json::json!({ "data": history })))
}
