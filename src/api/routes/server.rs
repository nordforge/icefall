use std::collections::VecDeque;
use std::sync::Arc;

use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use tokio::sync::RwLock;

use crate::api::error::ApiError;
use crate::api::AppState;

const SERVER_HISTORY_CAPACITY: usize = 360;

#[derive(Clone, serde::Serialize, Default)]
pub struct ServerMetrics {
    pub cpu_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_total_bytes: u64,
}

#[derive(Clone, serde::Serialize)]
pub struct ServerMetricsSnapshot {
    pub timestamp: String,
    pub cpu_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_total_bytes: u64,
}

pub struct ServerMetricsHistory {
    buffer: RwLock<VecDeque<ServerMetricsSnapshot>>,
}

impl ServerMetricsHistory {
    pub fn new() -> Self {
        Self {
            buffer: RwLock::new(VecDeque::with_capacity(SERVER_HISTORY_CAPACITY + 1)),
        }
    }

    pub async fn record(&self, snapshot: &ServerMetrics) {
        let mut buf = self.buffer.write().await;
        buf.push_back(ServerMetricsSnapshot {
            timestamp: crate::db::models::now_iso8601(),
            cpu_percent: snapshot.cpu_percent,
            memory_used_bytes: snapshot.memory_used_bytes,
            memory_total_bytes: snapshot.memory_total_bytes,
            disk_used_bytes: snapshot.disk_used_bytes,
            disk_total_bytes: snapshot.disk_total_bytes,
        });
        if buf.len() > SERVER_HISTORY_CAPACITY {
            buf.pop_front();
        }
    }

    pub async fn get_history(&self, limit: Option<usize>) -> Vec<ServerMetricsSnapshot> {
        let buf = self.buffer.read().await;
        match limit {
            Some(n) => buf.iter().rev().take(n).rev().cloned().collect(),
            None => buf.iter().cloned().collect(),
        }
    }
}

pub fn spawn_metrics_collector(
    metrics: Arc<RwLock<ServerMetrics>>,
    history: Arc<ServerMetricsHistory>,
) {
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

            history.record(&snapshot).await;
            *metrics.write().await = snapshot;
        }
    });
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/server/status", get(server_status))
        .route("/server/metrics/history", get(server_metrics_history))
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

#[derive(Deserialize)]
struct HistoryParams {
    limit: Option<usize>,
}

async fn server_metrics_history(
    State(state): State<AppState>,
    Query(params): Query<HistoryParams>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let limit = params.limit.map(|l| l.min(360));
    let data = state.server_metrics_history.get_history(limit).await;
    Ok(Json(serde_json::json!({ "data": data })))
}
