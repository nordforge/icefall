pub mod error;
pub mod middleware;
pub mod routes;
pub mod utils;

use std::collections::HashMap;
use std::sync::Arc;

use axum::Router;
use tokio::sync::{Mutex, RwLock};
use tower_http::services::ServeDir;

use crate::api::routes::server::ServerMetrics;
use crate::caddy::CaddyClient;
use crate::config::IcefallConfig;
use crate::db::Database;
use crate::docker::DockerClient;
use crate::events::EventBus;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<dyn Database>,
    pub docker: Arc<DockerClient>,
    pub caddy: Arc<CaddyClient>,
    pub config: Arc<IcefallConfig>,
    pub event_bus: Arc<EventBus>,
    pub build_locks: Arc<BuildLockMap>,
    pub server_metrics: Arc<RwLock<ServerMetrics>>,
}

pub struct BuildLockMap {
    locks: Mutex<HashMap<String, Arc<Mutex<()>>>>,
}

impl Default for BuildLockMap {
    fn default() -> Self {
        Self::new()
    }
}

impl BuildLockMap {
    pub fn new() -> Self {
        Self {
            locks: Mutex::new(HashMap::new()),
        }
    }

    pub async fn acquire(&self, app_id: &str) -> Arc<Mutex<()>> {
        let mut map = self.locks.lock().await;
        map.entry(app_id.to_string())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }
}

pub fn build_router(state: AppState) -> Router {
    let api_routes = routes::api_routes();

    let router = Router::new()
        .nest("/api/v1", api_routes)
        .fallback_service(ServeDir::new("dashboard/dist").append_index_html_on_directories(true));

    middleware::apply_middleware(router, &state.config).with_state(state)
}
