use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::db::models::NewDomain;

#[derive(Deserialize)]
struct AddDomainRequest {
    domain: String,
}

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
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<AddDomainRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let domain = state
        .db
        .add_domain(&NewDomain {
            app_id: id,
            domain: body.domain,
        })
        .await?;

    Ok(Json(serde_json::json!({ "data": domain })))
}
