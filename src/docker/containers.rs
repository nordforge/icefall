use std::collections::HashMap;

use bollard::container::{
    Config, CreateContainerOptions, ListContainersOptions, RemoveContainerOptions,
    StopContainerOptions,
};
use bollard::models::{ContainerInspectResponse, ContainerSummary, HostConfig, PortBinding};
use serde::{Deserialize, Serialize};

use crate::docker::{DockerClient, DockerError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerConfig {
    pub name: String,
    pub image: String,
    pub env: Vec<String>,
    pub ports: Vec<PortMapping>,
    pub volumes: Vec<VolumeMount>,
    pub memory_bytes: Option<i64>,
    pub cpu_shares: Option<i64>,
    pub restart_policy: Option<String>,
    pub labels: HashMap<String, String>,
    pub network: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub container_port: u16,
    pub host_port: Option<u16>,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeMount {
    pub source: String,
    pub target: String,
    pub read_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub labels: HashMap<String, String>,
}

impl DockerClient {
    pub async fn create_container(
        &self,
        config: &ContainerConfig,
    ) -> Result<String, DockerError> {
        let mut port_bindings: HashMap<String, Option<Vec<PortBinding>>> = HashMap::new();
        let mut exposed_ports: HashMap<String, HashMap<(), ()>> = HashMap::new();

        for port in &config.ports {
            let key = format!("{}/{}", port.container_port, port.protocol);
            exposed_ports.insert(key.clone(), HashMap::new());
            port_bindings.insert(
                key,
                Some(vec![PortBinding {
                    host_ip: Some("0.0.0.0".to_string()),
                    host_port: port.host_port.map(|p| p.to_string()),
                }]),
            );
        }

        let binds: Vec<String> = config
            .volumes
            .iter()
            .map(|v| {
                if v.read_only {
                    format!("{}:{}:ro", v.source, v.target)
                } else {
                    format!("{}:{}", v.source, v.target)
                }
            })
            .collect();

        let restart_policy = config.restart_policy.as_deref().map(|policy| {
            bollard::models::RestartPolicy {
                name: Some(match policy {
                    "always" => bollard::models::RestartPolicyNameEnum::ALWAYS,
                    "unless-stopped" => bollard::models::RestartPolicyNameEnum::UNLESS_STOPPED,
                    "on-failure" => bollard::models::RestartPolicyNameEnum::ON_FAILURE,
                    _ => bollard::models::RestartPolicyNameEnum::NO,
                }),
                maximum_retry_count: None,
            }
        });

        let host_config = HostConfig {
            port_bindings: Some(port_bindings),
            binds: Some(binds),
            memory: config.memory_bytes,
            cpu_shares: config.cpu_shares,
            restart_policy,
            ..Default::default()
        };

        let container_config = Config {
            image: Some(config.image.clone()),
            env: Some(config.env.clone()),
            exposed_ports: Some(exposed_ports),
            host_config: Some(host_config),
            labels: Some(config.labels.clone()),
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name: &config.name,
            platform: None,
        };

        let response = self
            .inner()
            .create_container(Some(options), container_config)
            .await?;

        if let Some(ref network) = config.network {
            self.connect_container_to_network(network, &response.id)
                .await?;
        }

        Ok(response.id)
    }

    pub async fn start_container(&self, id: &str) -> Result<(), DockerError> {
        self.inner()
            .start_container::<String>(id, None)
            .await?;
        Ok(())
    }

    pub async fn stop_container(&self, id: &str, timeout: Option<i64>) -> Result<(), DockerError> {
        let options = timeout.map(|t| StopContainerOptions { t });
        self.inner().stop_container(id, options).await?;
        Ok(())
    }

    pub async fn restart_container(&self, id: &str) -> Result<(), DockerError> {
        self.inner()
            .restart_container(id, None::<bollard::container::RestartContainerOptions>)
            .await?;
        Ok(())
    }

    pub async fn remove_container(&self, id: &str, force: bool) -> Result<(), DockerError> {
        let options = RemoveContainerOptions {
            force,
            ..Default::default()
        };
        self.inner()
            .remove_container(id, Some(options))
            .await?;
        Ok(())
    }

    pub async fn list_containers(
        &self,
        label_filter: Option<&str>,
    ) -> Result<Vec<ContainerInfo>, DockerError> {
        let mut filters = HashMap::new();
        if let Some(label) = label_filter {
            filters.insert("label".to_string(), vec![label.to_string()]);
        }

        let options = ListContainersOptions {
            all: true,
            filters,
            ..Default::default()
        };

        let containers: Vec<ContainerSummary> =
            self.inner().list_containers(Some(options)).await?;

        let infos = containers
            .into_iter()
            .map(|c| ContainerInfo {
                id: c.id.unwrap_or_default(),
                name: c
                    .names
                    .and_then(|n| n.first().cloned())
                    .unwrap_or_default()
                    .trim_start_matches('/')
                    .to_string(),
                image: c.image.unwrap_or_default(),
                status: c.status.unwrap_or_default(),
                state: c.state.unwrap_or_default(),
                labels: c.labels.unwrap_or_default(),
            })
            .collect();

        Ok(infos)
    }

    pub async fn inspect_container(
        &self,
        id: &str,
    ) -> Result<ContainerInspectResponse, DockerError> {
        let info = self.inner().inspect_container(id, None).await?;
        Ok(info)
    }

    pub async fn exec_in_container(
        &self,
        container: &str,
        cmd: &[String],
    ) -> Result<String, DockerError> {
        use bollard::exec::{CreateExecOptions, StartExecResults};
        use futures_util::StreamExt;

        let exec = self
            .inner()
            .create_exec(
                container,
                CreateExecOptions {
                    cmd: Some(cmd.to_vec()),
                    attach_stdout: Some(true),
                    attach_stderr: Some(true),
                    ..Default::default()
                },
            )
            .await?;

        let mut output = String::new();
        if let StartExecResults::Attached { output: mut exec_output, .. } =
            self.inner().start_exec(&exec.id, None).await?
        {
            while let Some(Ok(msg)) = exec_output.next().await {
                use bollard::container::LogOutput;
                match msg {
                    LogOutput::StdOut { message } => {
                        output.push_str(&String::from_utf8_lossy(&message));
                    }
                    LogOutput::StdErr { message } => {
                        output.push_str(&String::from_utf8_lossy(&message));
                    }
                    _ => {}
                }
            }
        }

        Ok(output)
    }
}
