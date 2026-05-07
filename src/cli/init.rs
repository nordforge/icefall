use std::io::{self, Write};
use std::path::PathBuf;

use crate::config::IcefallConfig;
use crate::db::encryption::Encryptor;

pub async fn run() {
    println!("Icefall — Initial Setup\n");

    let data_dir = prompt("Data directory", "/var/lib/icefall");
    let listen_port: u16 = prompt("Listen port", "3000")
        .parse()
        .unwrap_or(3000);
    let base_domain = prompt_optional("Base domain (e.g. apps.example.com)");

    let encryption_key = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        Encryptor::generate_key(),
    );

    let config = IcefallConfig {
        listen_addr: "0.0.0.0".to_string(),
        listen_port,
        data_dir: PathBuf::from(&data_dir),
        sqlite_path: PathBuf::from(&data_dir).join("icefall.db"),
        docker_socket: "/var/run/docker.sock".to_string(),
        caddy_admin_url: "http://localhost:2019".to_string(),
        base_domain,
        encryption_key: Some(encryption_key),
        smtp: None,
        backup: Default::default(),
        pid_file: PathBuf::from("/var/run/icefall.pid"),
        log_level: "info".to_string(),
    };

    let toml_str = toml::to_string_pretty(&config).expect("Failed to serialize config");

    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("/etc/icefall"));
    let config_path = config_dir.join("icefall").join("config.toml");

    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    std::fs::write(&config_path, &toml_str)
        .unwrap_or_else(|e| {
            eprintln!("Failed to write config to {}: {e}", config_path.display());
            std::process::exit(1);
        });

    println!("\nConfiguration written to {}", config_path.display());
    println!("Run `icefall daemon start` to start the daemon.");
}

fn prompt(label: &str, default: &str) -> String {
    print!("{label} [{default}]: ");
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    let trimmed = input.trim();
    if trimmed.is_empty() {
        default.to_string()
    } else {
        trimmed.to_string()
    }
}

fn prompt_optional(label: &str) -> Option<String> {
    print!("{label}: ");
    io::stdout().flush().ok();
    let mut input = String::new();
    io::stdin().read_line(&mut input).ok();
    let trimmed = input.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}
