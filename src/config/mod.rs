pub mod defaults;

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("config file not found at {0}")]
    NotFound(PathBuf),
    #[error("failed to read config: {0}")]
    Read(#[from] std::io::Error),
    #[error("failed to parse config: {0}")]
    Parse(#[from] toml::de::Error),
    #[error("validation failed: {0}")]
    Validation(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub from_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BackupConfig {
    #[serde(default = "defaults::backup_interval_hours")]
    pub interval_hours: u32,
    #[serde(default = "defaults::backup_retain_count")]
    pub retain_count: u32,
    pub s3_bucket: Option<String>,
    pub s3_endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcefallConfig {
    #[serde(default = "defaults::listen_addr")]
    pub listen_addr: String,
    #[serde(default = "defaults::listen_port")]
    pub listen_port: u16,
    #[serde(default = "defaults::data_dir")]
    pub data_dir: PathBuf,
    #[serde(default = "defaults::sqlite_path")]
    pub sqlite_path: PathBuf,
    #[serde(default = "defaults::docker_socket")]
    pub docker_socket: String,
    #[serde(default = "defaults::caddy_admin_url")]
    pub caddy_admin_url: String,
    pub base_domain: Option<String>,
    pub encryption_key: Option<String>,
    #[serde(default)]
    pub smtp: Option<SmtpConfig>,
    #[serde(default)]
    pub backup: BackupConfig,
    #[serde(default = "defaults::pid_file")]
    pub pid_file: PathBuf,
    #[serde(default = "defaults::log_level")]
    pub log_level: String,
}

impl IcefallConfig {
    pub fn load() -> Result<Self, ConfigError> {
        let config_path = Self::find_config_file()?;
        let contents = std::fs::read_to_string(&config_path)?;
        let mut config: Self = toml::from_str(&contents)?;
        config.apply_env_overrides();
        Ok(config)
    }

    pub fn load_or_default() -> Self {
        match Self::load() {
            Ok(config) => config,
            Err(_) => {
                let mut config = Self::default();
                config.apply_env_overrides();
                config
            }
        }
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.encryption_key.is_none() {
            return Err(ConfigError::Validation(
                "encryption_key is required — run `icefall init` to generate one".to_string(),
            ));
        }

        if let Some(ref key) = self.encryption_key {
            let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, key)
                .map_err(|_| {
                    ConfigError::Validation("encryption_key is not valid base64".to_string())
                })?;
            if decoded.len() != 32 {
                return Err(ConfigError::Validation(
                    "encryption_key must be 32 bytes (256 bits)".to_string(),
                ));
            }
        }

        Ok(())
    }

    fn find_config_file() -> Result<PathBuf, ConfigError> {
        if let Ok(path) = std::env::var("ICEFALL_CONFIG") {
            let p = PathBuf::from(path);
            if p.exists() {
                return Ok(p);
            }
            return Err(ConfigError::NotFound(p));
        }

        let paths = [
            PathBuf::from("/etc/icefall/config.toml"),
            dirs::config_dir()
                .unwrap_or_default()
                .join("icefall")
                .join("config.toml"),
        ];

        for p in &paths {
            if p.exists() {
                return Ok(p.clone());
            }
        }

        Err(ConfigError::NotFound(paths[0].clone()))
    }

    fn apply_env_overrides(&mut self) {
        if let Ok(val) = std::env::var("ICEFALL_LISTEN_ADDR") {
            self.listen_addr = val;
        }
        if let Ok(val) = std::env::var("ICEFALL_PORT") {
            if let Ok(port) = val.parse() {
                self.listen_port = port;
            }
        }
        if let Ok(val) = std::env::var("ICEFALL_DATA_DIR") {
            self.data_dir = PathBuf::from(val);
        }
        if let Ok(val) = std::env::var("ICEFALL_SQLITE_PATH") {
            self.sqlite_path = PathBuf::from(val);
        }
        if let Ok(val) = std::env::var("ICEFALL_DOCKER_SOCKET") {
            self.docker_socket = val;
        }
        if let Ok(val) = std::env::var("ICEFALL_CADDY_URL") {
            self.caddy_admin_url = val;
        }
        if let Ok(val) = std::env::var("ICEFALL_BASE_DOMAIN") {
            self.base_domain = Some(val);
        }
        if let Ok(val) = std::env::var("ICEFALL_ENCRYPTION_KEY") {
            self.encryption_key = Some(val);
        }
        if let Ok(val) = std::env::var("ICEFALL_LOG_LEVEL") {
            self.log_level = val;
        }
        if let Ok(val) = std::env::var("ICEFALL_PID_FILE") {
            self.pid_file = PathBuf::from(val);
        }
    }
}

impl Default for IcefallConfig {
    fn default() -> Self {
        Self {
            listen_addr: defaults::listen_addr(),
            listen_port: defaults::listen_port(),
            data_dir: defaults::data_dir(),
            sqlite_path: defaults::sqlite_path(),
            docker_socket: defaults::docker_socket(),
            caddy_admin_url: defaults::caddy_admin_url(),
            base_domain: None,
            encryption_key: None,
            smtp: None,
            backup: BackupConfig::default(),
            pid_file: defaults::pid_file(),
            log_level: defaults::log_level(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_has_expected_port() {
        let config = IcefallConfig::default();
        assert_eq!(config.listen_port, 3000);
    }

    #[test]
    fn config_parses_from_toml() {
        let toml_str = r#"
listen_addr = "127.0.0.1"
listen_port = 8080
base_domain = "apps.example.com"
encryption_key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
"#;
        let config: IcefallConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.listen_port, 8080);
        assert_eq!(config.base_domain, Some("apps.example.com".to_string()));
    }

    #[test]
    fn validation_requires_encryption_key() {
        let config = IcefallConfig::default();
        assert!(config.validate().is_err());
    }
}
