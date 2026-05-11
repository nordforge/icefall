use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ServerRole {
    ControlPlane,
    Worker,
}

impl ServerRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ControlPlane => "control-plane",
            Self::Worker => "worker",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ServerStatus {
    Online,
    Offline,
    Enrolling,
    Draining,
}

impl ServerStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Online => "online",
            Self::Offline => "offline",
            Self::Enrolling => "enrolling",
            Self::Draining => "draining",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerMetrics {
    pub cpu_percent: Option<f64>,
    pub ram_used_bytes: Option<i64>,
    pub ram_total_bytes: Option<i64>,
    pub disk_used_bytes: Option<i64>,
    pub disk_total_bytes: Option<i64>,
    pub load_average: Option<[f64; 3]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerConfig {
    pub image: String,
    pub name: String,
    pub env: Vec<(String, String)>,
    pub ports: Vec<(u16, u16)>,
    pub volumes: Vec<(String, String)>,
    pub labels: Vec<(String, String)>,
    pub network: Option<String>,
    pub restart_policy: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaddyRoute {
    pub domain: String,
    pub upstream: String,
    pub path: Option<String>,
}

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
