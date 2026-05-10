use bollard::models::{
    EndpointSettings, NetworkConnectRequest, NetworkCreateRequest, NetworkDisconnectRequest,
};

use crate::docker::{DockerClient, DockerError};

impl DockerClient {
    pub async fn create_network(&self, name: &str) -> Result<String, DockerError> {
        let config = NetworkCreateRequest {
            name: name.to_string(),
            driver: Some("bridge".to_string()),
            ..Default::default()
        };

        let response = self.inner().create_network(config).await?;
        Ok(response.id)
    }

    pub async fn remove_network(&self, name: &str) -> Result<(), DockerError> {
        self.inner().remove_network(name).await?;
        Ok(())
    }

    pub async fn connect_container_to_network(
        &self,
        network: &str,
        container: &str,
    ) -> Result<(), DockerError> {
        let config = NetworkConnectRequest {
            container: container.to_string(),
            endpoint_config: Some(EndpointSettings::default()),
        };
        self.inner().connect_network(network, config).await?;
        Ok(())
    }

    pub async fn connect_container_to_network_with_alias(
        &self,
        network: &str,
        container: &str,
        alias: &str,
    ) -> Result<(), DockerError> {
        let config = NetworkConnectRequest {
            container: container.to_string(),
            endpoint_config: Some(EndpointSettings {
                aliases: Some(vec![alias.to_string()]),
                ..Default::default()
            }),
        };
        self.inner().connect_network(network, config).await?;
        Ok(())
    }

    pub async fn disconnect_container_from_network(
        &self,
        network: &str,
        container: &str,
    ) -> Result<(), DockerError> {
        self.inner()
            .disconnect_network(
                network,
                NetworkDisconnectRequest {
                    container: container.to_string(),
                    force: Some(false),
                },
            )
            .await?;
        Ok(())
    }
}
