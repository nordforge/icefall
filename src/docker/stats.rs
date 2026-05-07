use bollard::container::{NetworkStats, Stats, StatsOptions};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

use crate::docker::{DockerClient, DockerError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerStats {
    pub cpu_percent: f64,
    pub memory_usage_bytes: u64,
    pub memory_limit_bytes: u64,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
}

impl DockerClient {
    pub async fn get_stats(&self, container_id: &str) -> Result<ContainerStats, DockerError> {
        let options = StatsOptions {
            stream: false,
            one_shot: true,
        };

        let mut stream = self.inner().stats(container_id, Some(options));

        let stats = stream
            .next()
            .await
            .ok_or_else(|| DockerError::ContainerNotFound(container_id.to_string()))??;

        Ok(parse_stats(&stats))
    }
}

fn parse_stats(stats: &Stats) -> ContainerStats {
    let cpu_percent = calculate_cpu_percent(stats);

    let memory_usage_bytes = stats
        .memory_stats
        .usage
        .unwrap_or(0);

    let memory_limit_bytes = stats
        .memory_stats
        .limit
        .unwrap_or(0);

    let (network_rx_bytes, network_tx_bytes) = stats
        .networks
        .as_ref()
        .map(|nets: &std::collections::HashMap<String, NetworkStats>| {
            nets.values().fold((0u64, 0u64), |(rx, tx), net| {
                (rx + net.rx_bytes, tx + net.tx_bytes)
            })
        })
        .unwrap_or((0, 0));

    ContainerStats {
        cpu_percent,
        memory_usage_bytes,
        memory_limit_bytes,
        network_rx_bytes,
        network_tx_bytes,
    }
}

fn calculate_cpu_percent(stats: &Stats) -> f64 {
    let cpu_delta = stats.cpu_stats.cpu_usage.total_usage as f64
        - stats.precpu_stats.cpu_usage.total_usage as f64;

    let system_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0) as f64
        - stats.precpu_stats.system_cpu_usage.unwrap_or(0) as f64;

    let num_cpus = stats
        .cpu_stats
        .online_cpus
        .unwrap_or(1) as f64;

    if system_delta > 0.0 && cpu_delta > 0.0 {
        (cpu_delta / system_delta) * num_cpus * 100.0
    } else {
        0.0
    }
}
