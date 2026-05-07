use std::path::PathBuf;

pub fn listen_addr() -> String {
    "0.0.0.0".to_string()
}

pub fn listen_port() -> u16 {
    3000
}

pub fn data_dir() -> PathBuf {
    PathBuf::from("/var/lib/icefall")
}

pub fn sqlite_path() -> PathBuf {
    data_dir().join("icefall.db")
}

pub fn docker_socket() -> String {
    "/var/run/docker.sock".to_string()
}

pub fn caddy_admin_url() -> String {
    "http://localhost:2019".to_string()
}

pub fn pid_file() -> PathBuf {
    PathBuf::from("/var/run/icefall.pid")
}

pub fn log_level() -> String {
    "info".to_string()
}

pub fn backup_interval_hours() -> u32 {
    24
}

pub fn backup_retain_count() -> u32 {
    7
}
