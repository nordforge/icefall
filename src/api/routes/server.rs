use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};

use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/server/status", get(server_status))
}

async fn server_status(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
