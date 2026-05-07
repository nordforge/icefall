pub mod error;
pub mod middleware;
pub mod routes;

use std::sync::Arc;

use axum::Router;

use crate::caddy::CaddyClient;
use crate::config::IcefallConfig;
use crate::db::Database;
use crate::docker::DockerClient;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<dyn Database>,
    pub docker: Arc<DockerClient>,
    pub caddy: Arc<CaddyClient>,
    pub config: Arc<IcefallConfig>,
}

pub fn build_router(state: AppState) -> Router {
    let api_routes = routes::api_routes();

    let router = Router::new().nest("/api/v1", api_routes);

    middleware::apply_middleware(router, &state.config).with_state(state)
}
