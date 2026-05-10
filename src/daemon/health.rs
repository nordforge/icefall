use std::path::Path;

use crate::caddy::CaddyClient;
use crate::daemon::DaemonError;
use crate::docker::DockerClient;

pub async fn check_docker(docker: &DockerClient) -> Result<(), DaemonError> {
    docker.ping().await.map_err(DaemonError::Docker)
}

pub fn check_data_dir(path: &Path) -> Result<(), DaemonError> {
    if path.exists() && !path.is_dir() {
        return Err(DaemonError::Other(format!(
            "Data path {} exists but is not a directory",
            path.display()
        )));
    }

    if path.exists() {
        let test_file = path.join(".icefall-write-test");
        std::fs::write(&test_file, b"test").map_err(|e| {
            DaemonError::Other(format!(
                "Data directory {} is not writable: {e}",
                path.display()
            ))
        })?;
        std::fs::remove_file(&test_file).ok();
    }

    Ok(())
}

pub async fn check_caddy(caddy: &CaddyClient) -> Result<(), DaemonError> {
    caddy
        .health_check()
        .await
        .map_err(|e| DaemonError::Other(format!("Caddy health check failed: {e}")))
}
