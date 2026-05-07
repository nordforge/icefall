use crate::config::IcefallConfig;

pub fn generate_service_unit(_config: &IcefallConfig) -> String {
    let config_path = std::env::var("ICEFALL_CONFIG")
        .unwrap_or_else(|_| "/etc/icefall/config.toml".to_string());

    format!(
        r#"[Unit]
Description=Icefall Deployment Platform
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/icefall daemon start
Restart=on-failure
RestartSec=5
Environment=ICEFALL_CONFIG={config_path}

[Install]
WantedBy=multi-user.target
"#
    )
}
