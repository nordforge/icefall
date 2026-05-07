use std::sync::Arc;

use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};
use tokio::sync::RwLock;

use crate::api::error::ApiError;
use crate::api::AppState;

#[derive(Clone, serde::Serialize, Default)]
pub struct ServerMetrics {
    pub cpu_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_total_bytes: u64,
}

pub fn spawn_metrics_collector(metrics: Arc<RwLock<ServerMetrics>>) {
    tokio::spawn(async move {
        let mut sys = sysinfo::System::new();
        loop {
            sys.refresh_cpu_all();
            sys.refresh_memory();
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            sys.refresh_cpu_all();

            let disks = sysinfo::Disks::new_with_refreshed_list();
            let (disk_used, disk_total) =
                disks.iter().fold((0u64, 0u64), |(used, total), disk| {
                    (
                        used + (disk.total_space() - disk.available_space()),
                        total + disk.total_space(),
                    )
                });

            let snapshot = ServerMetrics {
                cpu_percent: sys.global_cpu_usage(),
                memory_used_bytes: sys.used_memory(),
                memory_total_bytes: sys.total_memory(),
                disk_used_bytes: disk_used,
                disk_total_bytes: disk_total,
            };

            *metrics.write().await = snapshot;
        }
    });
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/server/status", get(server_status))
}

async fn server_status(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let metrics = state.server_metrics.read().await;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "cpu_percent": metrics.cpu_percent,
        "memory_used_bytes": metrics.memory_used_bytes,
        "memory_total_bytes": metrics.memory_total_bytes,
        "disk_used_bytes": metrics.disk_used_bytes,
        "disk_total_bytes": metrics.disk_total_bytes,
    })))
}
