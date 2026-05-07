pub mod containers;
pub mod images;
pub mod logs;
pub mod networks;
pub mod stats;
pub mod volumes;

use bollard::Docker;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DockerError {
    #[error("container not found: {0}")]
    ContainerNotFound(String),
    #[error("image not found: {0}")]
    ImageNotFound(String),
    #[error("docker engine unavailable: {0}")]
    Unavailable(String),
    #[error("docker API error: {0}")]
    Api(#[from] bollard::errors::Error),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Clone)]
pub struct DockerClient {
    inner: Docker,
}

impl DockerClient {
    pub async fn connect(socket_path: &str) -> Result<Self, DockerError> {
        let docker = Docker::connect_with_socket(socket_path, 120, bollard::API_DEFAULT_VERSION)
            .map_err(|e| DockerError::Unavailable(e.to_string()))?;

        let client = Self { inner: docker };
        client.ping().await?;
        Ok(client)
    }

    pub async fn connect_default() -> Result<Self, DockerError> {
        Self::connect("/var/run/docker.sock").await
    }

    pub async fn ping(&self) -> Result<(), DockerError> {
        self.inner
            .ping()
            .await
            .map_err(|e| DockerError::Unavailable(format!("Docker ping failed: {e}")))?;
        Ok(())
    }

    pub(crate) fn inner(&self) -> &Docker {
        &self.inner
    }
}
