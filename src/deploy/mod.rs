pub mod compose;
pub mod health;
pub mod manager;
pub mod native;
pub mod preview;
pub mod s3_mount;

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
    #[error("compose file parse error: {0}")]
    ComposeParseError(String),
    #[error("native build failed: {0}")]
    NativeBuild(String),
    #[error("docker error: {0}")]
    Docker(#[from] crate::docker::DockerError),
    #[error("caddy error: {0}")]
    Caddy(#[from] crate::caddy::CaddyError),
    #[error("database error: {0}")]
    Database(#[from] crate::db::DbError),
}
