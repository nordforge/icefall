use axum::http::HeaderName;
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;

use crate::api::AppState;
use crate::config::IcefallConfig;

static X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

pub fn apply_middleware(router: Router<AppState>, _config: &IcefallConfig) -> Router<AppState> {
    router
        .layer(TraceLayer::new_for_http())
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID.clone()))
        .layer(SetRequestIdLayer::new(
            X_REQUEST_ID.clone(),
            MakeRequestUuid,
        ))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
}
