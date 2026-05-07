use axum::routing::get;
use axum::{Json, Router};
use sysinfo::System;

use crate::api::error::ApiError;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/server/status", get(server_status))
}

async fn server_status() -> Result<Json<serde_json::Value>, ApiError> {
    let mut sys = System::new();
    sys.refresh_cpu_all();
    sys.refresh_memory();

    // Brief pause to let CPU measurement settle
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    sys.refresh_cpu_all();

    let cpu_percent = sys.global_cpu_usage();
    let memory_used = sys.used_memory();
    let memory_total = sys.total_memory();

    let disks = sysinfo::Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = disks.iter().fold((0u64, 0u64), |(used, total), disk| {
        (
            used + (disk.total_space() - disk.available_space()),
            total + disk.total_space(),
        )
    });

    Ok(Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "cpu_percent": cpu_percent,
        "memory_used_bytes": memory_used,
        "memory_total_bytes": memory_total,
        "disk_used_bytes": disk_used,
        "disk_total_bytes": disk_total,
    })))
}
