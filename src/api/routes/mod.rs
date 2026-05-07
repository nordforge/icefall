pub mod apps;
pub mod databases;
pub mod deploys;
pub mod domains;
pub mod env_vars;
pub mod events;
pub mod server;
pub mod settings;
pub mod users;
pub mod webhooks;

use axum::Router;

use crate::api::AppState;

pub fn api_routes() -> Router<AppState> {
    Router::new()
        .merge(apps::routes())
        .merge(databases::routes())
        .merge(deploys::routes())
        .merge(domains::routes())
        .merge(env_vars::routes())
        .merge(users::routes())
        .merge(settings::routes())
        .merge(server::routes())
        .merge(events::routes())
        .merge(webhooks::routes())
}
