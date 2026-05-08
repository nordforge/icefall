use bollard::network::{ConnectNetworkOptions, CreateNetworkOptions};
use bollard::models::EndpointSettings;

use crate::docker::{DockerClient, DockerError};

impl DockerClient {
    pub async fn create_network(&self, name: &str) -> Result<String, DockerError> {
        let options = CreateNetworkOptions {
            name: name.to_string(),
            driver: "bridge".to_string(),
            ..Default::default()
        };

        let response = self.inner().create_network(options).await?;
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
        let options = ConnectNetworkOptions {
            container: container.to_string(),
            endpoint_config: EndpointSettings::default(),
        };
        self.inner().connect_network(network, options).await?;
        Ok(())
    }

    pub async fn connect_container_to_network_with_alias(
        &self,
        network: &str,
        container: &str,
        alias: &str,
    ) -> Result<(), DockerError> {
        let options = ConnectNetworkOptions {
            container: container.to_string(),
            endpoint_config: EndpointSettings {
                aliases: Some(vec![alias.to_string()]),
                ..Default::default()
            },
        };
        self.inner().connect_network(network, options).await?;
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
                bollard::network::DisconnectNetworkOptions {
                    container: container.to_string(),
                    force: false,
                },
            )
            .await?;
        Ok(())
    }
}
