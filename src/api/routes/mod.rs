pub mod apps;
pub mod auth;
pub mod backups;
pub mod databases;
pub mod deploys;
pub mod domains;
pub mod env_vars;
pub mod events;
pub mod health;
pub mod logs;
pub mod mcp;
pub mod metrics;
pub mod notifications;
pub mod openapi;
pub mod server;
pub mod settings;
pub mod users;
pub mod webhooks;

use axum::Router;

use crate::api::AppState;

pub fn api_routes() -> Router<AppState> {
    Router::new()
        .merge(apps::routes())
        .merge(auth::routes())
        .merge(backups::routes())
        .merge(databases::routes())
        .merge(deploys::routes())
        .merge(domains::routes())
        .merge(env_vars::routes())
        .merge(health::routes())
        .merge(logs::routes())
        .merge(metrics::routes())
        .merge(users::routes())
        .merge(settings::routes())
        .merge(server::routes())
        .merge(events::routes())
        .merge(webhooks::routes())
        .merge(notifications::routes())
        .merge(mcp::routes())
        .merge(openapi::routes())
}
