use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::db::models::App;
use crate::db::Database;
use crate::deploy::DeployError;
use crate::docker::containers::{ContainerConfig, PortMapping, VolumeMount};
use crate::docker::DockerClient;
use crate::events::{EventBus, EventType};

// --- Compose file types (MVP subset of the Docker Compose spec) ---

/// Top-level Compose file structure.
#[derive(Debug, Clone, Deserialize)]
pub struct ComposeFile {
    #[serde(default)]
    pub services: HashMap<String, ComposeService>,
    #[serde(default)]
    pub volumes: HashMap<String, Option<serde_yaml::Value>>,
}

/// A single service within a compose file.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct ComposeService {
    pub image: Option<String>,
    #[serde(default)]
    pub environment: ComposeEnvironment,
    #[serde(default, deserialize_with = "deserialize_string_or_number_vec")]
    pub ports: Vec<String>,
    #[serde(default)]
    pub volumes: Vec<String>,
    #[serde(default)]
    pub depends_on: ComposeDependsOn,
    pub command: Option<ComposeCommand>,
    pub entrypoint: Option<ComposeCommand>,
    pub restart: Option<String>,
    // Ignored fields — accept but don't act on them
    #[serde(default)]
    pub build: Option<serde_yaml::Value>,
    #[serde(default)]
    pub profiles: Option<serde_yaml::Value>,
    #[serde(default)]
    pub configs: Option<serde_yaml::Value>,
    #[serde(default)]
    pub secrets: Option<serde_yaml::Value>,
    #[serde(default)]
    pub deploy: Option<serde_yaml::Value>,
    #[serde(default)]
    pub networks: Option<serde_yaml::Value>,
    #[serde(default)]
    pub healthcheck: Option<serde_yaml::Value>,
    #[serde(default)]
    pub labels: Option<serde_yaml::Value>,
    #[serde(default)]
    pub logging: Option<serde_yaml::Value>,
    // Catch any other unrecognised keys
    #[serde(flatten)]
    pub _extra: HashMap<String, serde_yaml::Value>,
}

/// Environment variables — either a list of "KEY=VALUE" strings or a map.
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(untagged)]
pub enum ComposeEnvironment {
    List(Vec<String>),
    Map(HashMap<String, Option<String>>),
    #[default]
    Empty,
}

/// depends_on — either a list of service names or a map of service-name -> condition.
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(untagged)]
pub enum ComposeDependsOn {
    List(Vec<String>),
    Map(HashMap<String, serde_yaml::Value>),
    #[default]
    Empty,
}

impl ComposeDependsOn {
    fn names(&self) -> Vec<String> {
        match self {
            ComposeDependsOn::List(v) => v.clone(),
            ComposeDependsOn::Map(m) => m.keys().cloned().collect(),
            ComposeDependsOn::Empty => Vec::new(),
        }
    }
}

/// Command — either a single string or a list of arguments.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ComposeCommand {
    Simple(String),
    Args(Vec<String>),
}

/// Deserialize a Vec where each element can be a string or a number (converted to string).
/// Handles compose ports like `- 3000` (number) and `- "80:80"` (string).
fn deserialize_string_or_number_vec<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let values: Vec<serde_yaml::Value> = Vec::deserialize(deserializer)?;
    Ok(values
        .into_iter()
        .filter_map(|v| match v {
            serde_yaml::Value::String(s) => Some(s),
            serde_yaml::Value::Number(n) => Some(n.to_string()),
            _ => None,
        })
        .collect())
}

// --- Deploy result types ---

/// Result of deploying a full compose stack.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeDeployResult {
    pub network_name: String,
    pub services: Vec<ComposeServiceResult>,
}

/// Result of deploying a single compose service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeServiceResult {
    pub service_name: String,
    pub container_id: String,
    pub image: String,
}

// --- Deployer ---

pub struct ComposeDeployer {
    docker: Arc<DockerClient>,
    db: Arc<dyn Database>,
    event_bus: Arc<EventBus>,
}

impl ComposeDeployer {
    pub fn new(docker: Arc<DockerClient>, db: Arc<dyn Database>, event_bus: Arc<EventBus>) -> Self {
        Self {
            docker,
            db,
            event_bus,
        }
    }

    /// Parse a compose YAML string into a ComposeFile.
    pub fn parse(yaml: &str) -> Result<ComposeFile, DeployError> {
        serde_yaml::from_str::<ComposeFile>(yaml)
            .map_err(|e| DeployError::ComposeParseError(e.to_string()))
    }

    /// Extract all `${VAR}` and `${VAR:-default}` references from the raw YAML.
    pub fn extract_variables(yaml: &str) -> Vec<(String, Option<String>)> {
        let mut vars = Vec::new();
        let mut seen = std::collections::HashSet::new();

        let mut chars = yaml.chars().peekable();
        while let Some(ch) = chars.next() {
            if ch == '$' && chars.peek() == Some(&'{') {
                chars.next(); // consume '{'
                let mut name = String::new();
                let mut default = None;
                let mut in_default = false;
                let mut default_buf = String::new();

                loop {
                    match chars.next() {
                        None | Some('}') => break,
                        Some(':') if !in_default => {
                            if chars.peek() == Some(&'-') {
                                chars.next();
                                in_default = true;
                            } else {
                                name.push(':');
                            }
                        }
                        Some(c) => {
                            if in_default {
                                default_buf.push(c);
                            } else {
                                name.push(c);
                            }
                        }
                    }
                }

                if in_default {
                    default = Some(default_buf);
                }

                if !name.is_empty() && seen.insert(name.clone()) {
                    vars.push((name, default));
                }
            }
        }

        vars
    }

    /// Interpolate `${VAR}` and `${VAR:-default}` in the YAML string with provided values.
    fn interpolate(yaml: &str, env_vars: &HashMap<String, String>) -> String {
        let mut result = String::with_capacity(yaml.len());
        let mut chars = yaml.chars().peekable();

        while let Some(ch) = chars.next() {
            if ch == '$' && chars.peek() == Some(&'{') {
                chars.next(); // consume '{'
                let mut name = String::new();
                let mut default = None;
                let mut in_default = false;
                let mut default_buf = String::new();

                loop {
                    match chars.next() {
                        None | Some('}') => break,
                        Some(':') if !in_default => {
                            if chars.peek() == Some(&'-') {
                                chars.next();
                                in_default = true;
                            } else {
                                name.push(':');
                            }
                        }
                        Some(c) => {
                            if in_default {
                                default_buf.push(c);
                            } else {
                                name.push(c);
                            }
                        }
                    }
                }

                if in_default {
                    default = Some(default_buf);
                }

                if let Some(val) = env_vars.get(&name) {
                    result.push_str(val);
                } else if let Some(def) = default {
                    result.push_str(&def);
                }
                // If no value and no default, omit (empty string)
            } else {
                result.push(ch);
            }
        }

        result
    }

    /// Return service names in dependency order (dependencies first).
    fn dependency_order(compose: &ComposeFile) -> Vec<String> {
        let all_names: Vec<String> = compose.services.keys().cloned().collect();

        // Build: service -> list of services it depends on
        let mut deps: HashMap<String, Vec<String>> = HashMap::new();
        for (name, service) in &compose.services {
            deps.insert(name.clone(), service.depends_on.names());
        }

        // Kahn's algorithm: nodes with in-degree 0 have no unmet dependencies.
        // If A depends_on B, then A has in-degree 1 (needs B first).
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        for name in &all_names {
            in_degree.entry(name.clone()).or_insert(0);
        }
        for (name, service_deps) in &deps {
            // Each dependency of `name` increases name's in-degree
            let count = service_deps
                .iter()
                .filter(|d| compose.services.contains_key(d.as_str()))
                .count();
            *in_degree.entry(name.clone()).or_insert(0) += count;
        }

        let mut queue: Vec<String> = in_degree
            .iter()
            .filter(|(_, &deg)| deg == 0)
            .map(|(name, _)| name.clone())
            .collect();
        queue.sort(); // deterministic

        let mut ordered = Vec::new();
        while let Some(current) = queue.pop() {
            ordered.push(current.clone());
            // For every service that depends on `current`, decrease its in-degree
            for (name, service_deps) in &deps {
                if service_deps.contains(&current) {
                    if let Some(count) = in_degree.get_mut(name) {
                        *count = count.saturating_sub(1);
                        if *count == 0 {
                            queue.push(name.clone());
                            queue.sort();
                        }
                    }
                }
            }
        }

        // Append any remaining (circular deps — best-effort)
        for name in &all_names {
            if !ordered.contains(name) {
                ordered.push(name.clone());
            }
        }

        ordered
    }

    /// Deploy a compose stack for the given app.
    pub async fn deploy(
        &self,
        app: &App,
        deploy_id: &str,
        yaml: &str,
        env_vars: &HashMap<String, String>,
    ) -> Result<ComposeDeployResult, DeployError> {
        // Interpolate variables in the YAML
        let interpolated = Self::interpolate(yaml, env_vars);

        // Parse the interpolated YAML
        let compose = Self::parse(&interpolated)?;

        if compose.services.is_empty() {
            return Err(DeployError::ComposeParseError(
                "No services defined in compose file".to_string(),
            ));
        }

        let network_name = format!("icefall-{}-compose", app.name);

        // Create the isolated bridge network
        if let Err(e) = self.docker.create_network(&network_name).await {
            tracing::debug!("Network {network_name} may already exist: {e}");
        }

        self.emit_event(app, deploy_id, "deploying_compose");

        // Create named volumes if declared at top level
        for vol_name in compose.volumes.keys() {
            let full_name = format!("icefall-{}-{}", app.name, vol_name);
            if let Err(e) = self.docker.create_volume(&full_name).await {
                tracing::debug!("Volume {full_name} may already exist: {e}");
            }
        }

        // Determine deploy order
        let order = Self::dependency_order(&compose);

        let mut results = Vec::new();

        for service_name in &order {
            let service = match compose.services.get(service_name) {
                Some(s) => s,
                None => continue,
            };

            let image = match &service.image {
                Some(img) => img.clone(),
                None => {
                    tracing::warn!(
                        "Skipping service '{service_name}': no image specified (build directive not supported in compose MVP)"
                    );
                    continue;
                }
            };

            // Pull the image
            let (img_name, img_tag) = parse_image_ref(&image);
            tracing::info!("Pulling image {img_name}:{img_tag} for service {service_name}");
            self.docker
                .pull_image(&img_name, &img_tag)
                .await
                .map_err(|e| {
                    DeployError::ContainerCreate(format!(
                        "Failed to pull image {image} for service {service_name}: {e}"
                    ))
                })?;

            // Build container config
            let container_name = format!("icefall-{}-{}", app.name, service_name);

            let env = resolve_service_env(service);
            let ports = resolve_service_ports(service);
            let volumes = resolve_service_volumes(service, &app.name);
            let cmd = resolve_service_command(service);
            let restart_policy = resolve_restart_policy(service);

            let mut labels = HashMap::new();
            labels.insert("icefall.app".to_string(), app.id.clone());
            labels.insert("icefall.stack".to_string(), app.name.clone());
            labels.insert("icefall.service".to_string(), service_name.clone());
            labels.insert("icefall.deploy-id".to_string(), deploy_id.to_string());
            labels.insert("icefall.compose".to_string(), "true".to_string());

            // Don't set network here — we connect manually below with a DNS alias
            let container_config = ContainerConfig {
                name: container_name,
                image: image.clone(),
                env,
                cmd,
                ports,
                volumes,
                memory_bytes: None,
                cpu_shares: None,
                restart_policy: Some(restart_policy),
                labels,
                network: None,
            };

            // Remove any existing containers for this service in this app
            let app_label = format!("icefall.app={}", app.id);
            if let Ok(containers) = self.docker.list_containers(Some(&app_label)).await {
                for c in containers {
                    if c.labels.get("icefall.service").map(|s| s.as_str()) == Some(service_name)
                        && c.labels.get("icefall.compose").map(|s| s.as_str()) == Some("true")
                    {
                        let _ = self.docker.stop_container(&c.id, Some(5)).await;
                        let _ = self.docker.remove_container(&c.id, true).await;
                    }
                }
            }

            let container_id = self
                .docker
                .create_container(&container_config)
                .await
                .map_err(|e| {
                    DeployError::ContainerCreate(format!(
                        "Failed to create container for service {service_name}: {e}"
                    ))
                })?;

            // Connect to the compose network with the service name as a DNS alias
            // so other services can reach this one by name
            self.docker
                .connect_container_to_network_with_alias(&network_name, &container_id, service_name)
                .await
                .map_err(|e| {
                    DeployError::ContainerCreate(format!(
                        "Failed to connect service {service_name} to network: {e}"
                    ))
                })?;

            self.docker.start_container(&container_id).await?;

            tracing::info!(
                "Started compose service '{service_name}' (container {}) for app {}",
                &container_id[..12.min(container_id.len())],
                app.name
            );

            results.push(ComposeServiceResult {
                service_name: service_name.clone(),
                container_id,
                image,
            });
        }

        // Update the deploy record with the first container's ID (for compatibility)
        if let Some(first) = results.first() {
            let _ = self
                .db
                .update_deploy_container_id(deploy_id, &first.container_id)
                .await;
        }

        let _ = self
            .db
            .update_deploy_status(deploy_id, "running", None)
            .await;

        self.emit_event(app, deploy_id, "running");

        Ok(ComposeDeployResult {
            network_name,
            services: results,
        })
    }

    /// Stop and remove all containers belonging to a compose stack.
    pub async fn teardown(&self, app: &App) -> Result<(), DeployError> {
        let label = format!("icefall.app={}", app.id);
        let containers = self.docker.list_containers(Some(&label)).await?;

        for container in containers {
            if container.labels.get("icefall.compose").map(|s| s.as_str()) == Some("true") {
                let _ = self.docker.stop_container(&container.id, Some(10)).await;
                let _ = self.docker.remove_container(&container.id, true).await;
            }
        }

        // Remove the compose network
        let network_name = format!("icefall-{}-compose", app.name);
        let _ = self.docker.remove_network(&network_name).await;

        Ok(())
    }

    fn emit_event(&self, app: &App, deploy_id: &str, status: &str) {
        self.event_bus.emit(
            EventType::DeployStatus,
            Some(&app.id),
            Some(deploy_id),
            serde_json::json!({"status": status, "compose": true}),
        );
    }
}

// --- Helper functions ---

/// Parse "nginx:latest" into ("nginx", "latest"), "postgres" into ("postgres", "latest").
fn parse_image_ref(image: &str) -> (String, String) {
    if let Some((name, tag)) = image.rsplit_once(':') {
        // Guard against registry URLs like registry.example.com:5000/image
        if tag.contains('/') {
            (image.to_string(), "latest".to_string())
        } else {
            (name.to_string(), tag.to_string())
        }
    } else {
        (image.to_string(), "latest".to_string())
    }
}

/// Extract environment variables from a compose service.
fn resolve_service_env(service: &ComposeService) -> Vec<String> {
    match &service.environment {
        ComposeEnvironment::List(list) => list.clone(),
        ComposeEnvironment::Map(map) => map
            .iter()
            .map(|(k, v)| {
                let val = v.as_deref().unwrap_or("");
                format!("{k}={val}")
            })
            .collect(),
        ComposeEnvironment::Empty => Vec::new(),
    }
}

/// Extract port mappings from a compose service.
fn resolve_service_ports(service: &ComposeService) -> Vec<PortMapping> {
    service
        .ports
        .iter()
        .filter_map(|p| {
            let p = p.trim();
            if p.contains(':') {
                let parts: Vec<&str> = p.split(':').collect();
                if parts.len() >= 2 {
                    let host_part = parts[parts.len() - 2];
                    let container_part = parts[parts.len() - 1];
                    let (container_port_str, protocol) =
                        if let Some((port, proto)) = container_part.rsplit_once('/') {
                            (port, proto)
                        } else {
                            (container_part, "tcp")
                        };
                    let container_port = container_port_str.parse::<u16>().ok()?;
                    let host_port = host_part.parse::<u16>().ok();
                    Some(PortMapping {
                        container_port,
                        host_port,
                        protocol: protocol.to_string(),
                    })
                } else {
                    None
                }
            } else {
                let (port_str, protocol) = if let Some((port, proto)) = p.rsplit_once('/') {
                    (port, proto)
                } else {
                    (p, "tcp")
                };
                let container_port = port_str.parse::<u16>().ok()?;
                Some(PortMapping {
                    container_port,
                    host_port: None,
                    protocol: protocol.to_string(),
                })
            }
        })
        .collect()
}

/// Extract volume mounts, prefixing named volumes with the app name.
fn resolve_service_volumes(service: &ComposeService, app_name: &str) -> Vec<VolumeMount> {
    service
        .volumes
        .iter()
        .filter_map(|v| {
            let v = v.trim();
            if v.contains(':') {
                let parts: Vec<&str> = v.splitn(3, ':').collect();
                if parts.len() >= 2 {
                    let source = parts[0];
                    let target = parts[1];
                    let read_only = parts.get(2).map(|&s| s == "ro").unwrap_or(false);

                    let resolved_source = if source.starts_with('/') || source.starts_with('.') {
                        source.to_string()
                    } else {
                        format!("icefall-{}-{}", app_name, source)
                    };

                    Some(VolumeMount {
                        source: resolved_source,
                        target: target.to_string(),
                        read_only,
                    })
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect()
}

/// Extract command override from a compose service.
fn resolve_service_command(service: &ComposeService) -> Option<Vec<String>> {
    match &service.command {
        Some(ComposeCommand::Simple(s)) => Some(s.split_whitespace().map(String::from).collect()),
        Some(ComposeCommand::Args(args)) => Some(args.clone()),
        None => None,
    }
}

/// Extract restart policy from a compose service.
fn resolve_restart_policy(service: &ComposeService) -> String {
    service
        .restart
        .as_deref()
        .unwrap_or("unless-stopped")
        .to_string()
}

/// List the service names parsed from a compose YAML (public utility for the frontend API).
pub fn list_compose_services(yaml: &str) -> Result<Vec<String>, DeployError> {
    let compose = ComposeDeployer::parse(yaml)?;
    Ok(compose.services.keys().cloned().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_image_ref_with_tag() {
        let (name, tag) = parse_image_ref("postgres:16-alpine");
        assert_eq!(name, "postgres");
        assert_eq!(tag, "16-alpine");
    }

    #[test]
    fn parse_image_ref_without_tag() {
        let (name, tag) = parse_image_ref("nginx");
        assert_eq!(name, "nginx");
        assert_eq!(tag, "latest");
    }

    #[test]
    fn parse_image_ref_with_registry_port() {
        let (name, tag) = parse_image_ref("registry.example.com:5000/myapp");
        assert_eq!(name, "registry.example.com:5000/myapp");
        assert_eq!(tag, "latest");
    }

    #[test]
    fn extract_variables_from_yaml() {
        let yaml = r#"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-mydb}
"#;
        let vars = ComposeDeployer::extract_variables(yaml);
        assert_eq!(vars.len(), 2);
        assert_eq!(vars[0], ("DB_PASSWORD".to_string(), None));
        assert_eq!(vars[1], ("DB_NAME".to_string(), Some("mydb".to_string())));
    }

    #[test]
    fn interpolate_variables() {
        let yaml = "image: ${REGISTRY:-docker.io}/${IMAGE}:${TAG:-latest}";
        let mut env = HashMap::new();
        env.insert("IMAGE".to_string(), "myapp".to_string());

        let result = ComposeDeployer::interpolate(yaml, &env);
        assert_eq!(result, "image: docker.io/myapp:latest");
    }

    #[test]
    fn parse_simple_compose() {
        let yaml = r#"
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
"#;
        let compose = ComposeDeployer::parse(yaml).unwrap();
        assert_eq!(compose.services.len(), 2);
        assert!(compose.services.contains_key("web"));
        assert!(compose.services.contains_key("db"));
        assert_eq!(compose.volumes.len(), 1);
    }

    #[test]
    fn dependency_order_respects_depends_on() {
        let yaml = r#"
services:
  app:
    image: myapp:latest
    depends_on:
      - db
      - redis
  db:
    image: postgres:16
  redis:
    image: redis:7
"#;
        let compose = ComposeDeployer::parse(yaml).unwrap();
        let order = ComposeDeployer::dependency_order(&compose);
        let app_idx = order.iter().position(|n| n == "app").unwrap();
        let db_idx = order.iter().position(|n| n == "db").unwrap();
        let redis_idx = order.iter().position(|n| n == "redis").unwrap();
        assert!(db_idx < app_idx);
        assert!(redis_idx < app_idx);
    }
}
