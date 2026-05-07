use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::utils::{check_dns_points_to, detect_server_ip};
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/settings", get(get_settings))
        .route("/settings/base-domain", post(setup_base_domain))
        .route("/settings/base-domain/verify", post(verify_base_domain))
}

async fn get_settings(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    Ok(Json(serde_json::json!({
        "data": {
            "base_domain": state.config.base_domain,
            "version": env!("CARGO_PKG_VERSION"),
        }
    })))
}

#[derive(Deserialize)]
struct SetupBaseDomainRequest {
    base_domain: String,
}

async fn setup_base_domain(
    State(state): State<AppState>,
    Json(body): Json<SetupBaseDomainRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let domain = body.base_domain.trim().to_lowercase();
    if domain.is_empty() {
        return Err(ApiError::BadRequest("base_domain is required".into()));
    }

    let server_ip = detect_server_ip().await;

    let wildcard = format!("*.{domain}");
    if let Err(e) = state.caddy.add_route(&wildcard, "localhost:0").await {
        tracing::warn!("Failed to configure Caddy wildcard for {wildcard}: {e}");
    }

    Ok(Json(serde_json::json!({
        "base_domain": domain,
        "dns_instructions": {
            "records": [
                {
                    "type": "A",
                    "name": &domain,
                    "value": server_ip.as_deref().unwrap_or("YOUR_SERVER_IP"),
                },
                {
                    "type": "A",
                    "name": format!("*.{domain}"),
                    "value": server_ip.as_deref().unwrap_or("YOUR_SERVER_IP"),
                }
            ],
            "note": "Create both A records pointing to your server. The wildcard record enables automatic subdomains for all apps."
        }
    })))
}

async fn verify_base_domain(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let base_domain = match &state.config.base_domain {
        Some(d) => d.clone(),
        None => {
            return Ok(Json(serde_json::json!({
                "configured": false,
                "error": "No base domain configured. Use POST /settings/base-domain first."
            })));
        }
    };

    let server_ip = detect_server_ip().await;

    let base_ok = check_dns_points_to(&base_domain, server_ip.as_deref()).await;

    let test_subdomain = format!("_icefall-verify.{base_domain}");
    let wildcard_ok = check_dns_points_to(&test_subdomain, server_ip.as_deref()).await;

    Ok(Json(serde_json::json!({
        "configured": true,
        "base_domain": base_domain,
        "server_ip": server_ip,
        "base_dns_ok": base_ok,
        "wildcard_dns_ok": wildcard_ok,
        "fully_verified": base_ok && wildcard_ok,
    })))
}
