use bollard::volume::CreateVolumeOptions;
use serde::{Deserialize, Serialize};

use crate::docker::{DockerClient, DockerError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeInfo {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
}

impl DockerClient {
    pub async fn create_volume(&self, name: &str) -> Result<(), DockerError> {
        let options = CreateVolumeOptions {
            name: name.to_string(),
            ..Default::default()
        };
        self.inner().create_volume(options).await?;
        Ok(())
    }

    pub async fn remove_volume(&self, name: &str) -> Result<(), DockerError> {
        self.inner().remove_volume(name, None).await?;
        Ok(())
    }

    pub async fn list_volumes(&self) -> Result<Vec<VolumeInfo>, DockerError> {
        let response = self.inner().list_volumes::<String>(None).await?;

        let volumes = response
            .volumes
            .unwrap_or_default()
            .into_iter()
            .map(|v| VolumeInfo {
                name: v.name,
                driver: v.driver,
                mountpoint: v.mountpoint,
            })
            .collect();

        Ok(volumes)
    }
}
