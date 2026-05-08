use std::collections::HashMap;
use std::sync::Arc;

use crate::caddy::CaddyClient;
use crate::config::IcefallConfig;
use crate::db::models::{App, Deploy, Environment};
use crate::db::Database;
use crate::deploy::health::wait_for_healthy;
use crate::deploy::DeployError;
use crate::docker::containers::{ContainerConfig, PortMapping};
use crate::docker::DockerClient;
use crate::events::{EventBus, EventType};

pub struct DeployManager {
    docker: Arc<DockerClient>,
    caddy: Arc<CaddyClient>,
    db: Arc<dyn Database>,
    config: Arc<IcefallConfig>,
    event_bus: Arc<EventBus>,
}

impl DeployManager {
    pub fn new(
        docker: Arc<DockerClient>,
        caddy: Arc<CaddyClient>,
        db: Arc<dyn Database>,
        config: Arc<IcefallConfig>,
        event_bus: Arc<EventBus>,
    ) -> Self {
        Self {
            docker,
            caddy,
            db,
            config,
            event_bus,
        }
    }

    pub async fn deploy(
        &self,
        deploy: &Deploy,
        app: &App,
        env: &Environment,
        image_ref: &str,
    ) -> Result<(), DeployError> {
        self.emit_status(app, deploy, "deploying");

        let network_name = format!("icefall-{}", app.name);
        if let Err(e) = self.docker.create_network(&network_name).await {
            tracing::debug!("Network {network_name} may already exist: {e}");
        }

        let env_vars = self.resolve_env_vars(env).await?;

        let detected_port = self.detected_port(app);
        let container_name = format!(
            "icefall-{}-{}-{}",
            app.name,
            env.env_type,
            &deploy.id[..8.min(deploy.id.len())]
        );

        let mut labels = HashMap::new();
        labels.insert("icefall.app".to_string(), app.id.clone());
        labels.insert("icefall.environment".to_string(), env.id.clone());
        labels.insert("icefall.deploy-id".to_string(), deploy.id.clone());

        let resource_limits: Option<ResourceLimits> = app
            .resource_limits
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());

        let container_config = ContainerConfig {
            name: container_name,
            image: image_ref.to_string(),
            env: env_vars,
            cmd: None,
            ports: vec![PortMapping {
                container_port: detected_port,
                host_port: None,
                protocol: "tcp".to_string(),
            }],
            volumes: Vec::new(),
            memory_bytes: resource_limits.as_ref().and_then(|r| r.memory_bytes),
            cpu_shares: resource_limits.as_ref().and_then(|r| r.cpu_shares),
            restart_policy: Some("unless-stopped".to_string()),
            labels,
            network: Some(network_name),
        };

        let container_id = self
            .docker
            .create_container(&container_config)
            .await
            .map_err(|e| DeployError::ContainerCreate(e.to_string()))?;

        self.docker.start_container(&container_id).await?;
        self.db
            .update_deploy_container_id(&deploy.id, &container_id)
            .await?;
        self.db
            .update_deploy_image_ref(&deploy.id, image_ref)
            .await?;

        self.emit_status(app, deploy, "starting");

        let host_port = self.get_host_port(&container_id, detected_port).await?;

        let health_result = wait_for_healthy(
            host_port,
            self.config.health_check_attempts,
            self.config.health_check_interval_ms,
        )
        .await;

        if let Err(e) = health_result {
            tracing::error!("Health check failed for deploy {}: {e}", deploy.id);
            self.emit_status(app, deploy, "failed");
            let _ = self.docker.stop_container(&container_id, Some(5)).await;
            let _ = self.docker.remove_container(&container_id, true).await;
            self.db
                .update_deploy_status(&deploy.id, "failed", Some("Health check failed"))
                .await?;
            return Err(e);
        }

        let upstream = format!("localhost:{host_port}");
        let domains = self.resolve_domains(app, env).await?;

        for domain in &domains {
            if self.caddy.update_route(domain, &upstream).await.is_err() {
                self.caddy
                    .add_route(domain, &upstream)
                    .await
                    .map_err(|e| DeployError::RouteUpdate(e.to_string()))?;
            }
        }

        self.db
            .update_deploy_status(&deploy.id, "running", None)
            .await?;
        self.emit_status(app, deploy, "running");

        self.stop_old_containers(app, env, &deploy.id).await;

        Ok(())
    }

    pub async fn teardown(
        &self,
        app: &App,
        env: &Environment,
        deploy_id: &str,
    ) -> Result<(), DeployError> {
        let label = format!("icefall.environment={}", env.id);
        let containers = self.docker.list_containers(Some(&label)).await?;

        for container in containers {
            let _ = self
                .docker
                .stop_container(&container.id, Some(self.config.deploy_stop_timeout_secs))
                .await;
            let _ = self.docker.remove_container(&container.id, true).await;
        }

        let domains = self.resolve_domains(app, env).await?;
        for domain in &domains {
            let _ = self.caddy.remove_route(domain).await;
        }

        if !deploy_id.is_empty() {
            let _ = self
                .db
                .update_deploy_status(deploy_id, "stopped", None)
                .await;
        }

        Ok(())
    }

    async fn resolve_env_vars(&self, env: &Environment) -> Result<Vec<String>, DeployError> {
        let vars = self.db.get_env_vars(&env.id).await?;
        let mut result: Vec<String> = vars
            .into_iter()
            .map(|v| format!("{}={}", v.key, v.value))
            .collect();
        if !result.iter().any(|v| v.starts_with("PORT=")) {
            result.push("PORT=3000".to_string());
        }
        if !result.iter().any(|v| v.starts_with("HOST=")) {
            result.push("HOST=0.0.0.0".to_string());
        }
        Ok(result)
    }

    fn detected_port(&self, app: &App) -> u16 {
        app.build_config
            .as_deref()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
            .and_then(|v| v.get("port")?.as_u64())
            .map(|p| p as u16)
            .unwrap_or(3000)
    }

    async fn get_host_port(
        &self,
        container_id: &str,
        container_port: u16,
    ) -> Result<u16, DeployError> {
        let info = self.docker.inspect_container(container_id).await?;
        let port_key = format!("{container_port}/tcp");

        let host_port = info
            .network_settings
            .and_then(|ns| ns.ports)
            .and_then(|ports| ports.get(&port_key).cloned())
            .and_then(|bindings| bindings)
            .and_then(|bindings| bindings.first().cloned())
            .and_then(|b| b.host_port)
            .and_then(|p| p.parse::<u16>().ok())
            .ok_or_else(|| {
                DeployError::ContainerCreate(format!(
                    "could not determine host port for container {container_id}"
                ))
            })?;

        Ok(host_port)
    }

    async fn resolve_domains(
        &self,
        app: &App,
        env: &Environment,
    ) -> Result<Vec<String>, DeployError> {
        let mut domains = Vec::new();

        if env.env_type == "preview" {
            if let (Some(ref branch), Some(ref base_domain)) =
                (&env.branch, &self.config.base_domain)
            {
                let sanitized =
                    crate::deploy::preview::sanitize_branch_for_subdomain(branch);
                domains.push(format!("{sanitized}--{}.{base_domain}", app.name));
            }
        } else {
            let custom_domains = self.db.list_domains(&app.id).await?;
            for d in custom_domains {
                domains.push(d.domain);
            }

            if let Some(ref base_domain) = self.config.base_domain {
                domains.push(format!("{}.{base_domain}", app.name));
            }
        }

        Ok(domains)
    }

    async fn stop_old_containers(&self, app: &App, env: &Environment, current_deploy_id: &str) {
        let label = format!("icefall.environment={}", env.id);
        let containers = match self.docker.list_containers(Some(&label)).await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to list old containers: {e}");
                return;
            }
        };

        for container in containers {
            let is_current = container
                .labels
                .get("icefall.deploy-id")
                .map(|id| id == current_deploy_id)
                .unwrap_or(false);

            if is_current {
                continue;
            }

            tracing::info!("Stopping old container {} for app {}", container.id, app.name);
            let _ = self
                .docker
                .stop_container(&container.id, Some(self.config.deploy_stop_timeout_secs))
                .await;
            let _ = self.docker.remove_container(&container.id, false).await;
        }
    }

    fn emit_status(&self, app: &App, deploy: &Deploy, status: &str) {
        self.event_bus.emit(
            EventType::DeployStatus,
            Some(&app.id),
            Some(&deploy.id),
            serde_json::json!({"status": status}),
        );
    }
}

#[derive(serde::Deserialize)]
struct ResourceLimits {
    memory_bytes: Option<i64>,
    cpu_shares: Option<i64>,
}

#[cfg(test)]
mod tests {
    #[test]
    fn resolve_env_vars_adds_port_and_host() {
        let vars: Vec<String> = vec!["FOO=bar".to_string(), "BAZ=qux".to_string()];
        assert!(!vars.iter().any(|v| v.starts_with("PORT=")));

        let mut result = vars;
        result.push("PORT=3000".to_string());
        result.push("HOST=0.0.0.0".to_string());

        assert!(result.iter().any(|v| v.starts_with("PORT=")));
        assert!(result.iter().any(|v| v.starts_with("HOST=")));
    }
}
