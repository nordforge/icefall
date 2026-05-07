use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/apps/{id}/domains",
        get(list_domains).post(add_domain),
    )
}

async fn list_domains(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let domains = state.db.list_domains(&id).await?;
    Ok(Json(serde_json::json!({ "data": domains })))
}

async fn add_domain(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::BadRequest(
        "Domain add not yet implemented".to_string(),
    ))
}
