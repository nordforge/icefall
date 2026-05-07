pub mod health;
pub mod manager;
pub mod preview;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DeployError {
    #[error("container creation failed: {0}")]
    ContainerCreate(String),
    #[error("health check failed after {0} attempts")]
    HealthCheckFailed(u32),
    #[error("caddy route update failed: {0}")]
    RouteUpdate(String),
    #[error("rollback failed: {0}")]
    RollbackFailed(String),
    #[error("docker error: {0}")]
    Docker(#[from] crate::docker::DockerError),
    #[error("caddy error: {0}")]
    Caddy(#[from] crate::caddy::CaddyError),
    #[error("database error: {0}")]
    Database(#[from] crate::db::DbError),
}
