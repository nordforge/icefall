use bollard::container::LogsOptions;
use futures_util::Stream;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

use crate::docker::{DockerClient, DockerError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogLine {
    pub stream: String,
    pub message: String,
}

impl DockerClient {
    pub fn stream_logs(
        &self,
        container_id: &str,
        follow: bool,
        tail: Option<usize>,
    ) -> impl Stream<Item = Result<LogLine, DockerError>> {
        let options = LogsOptions::<String> {
            follow,
            stdout: true,
            stderr: true,
            tail: tail.map(|t| t.to_string()).unwrap_or_else(|| "all".to_string()),
            ..Default::default()
        };

        self.inner()
            .logs(container_id, Some(options))
            .map(|result| {
                result
                    .map(|output| {
                        let (stream, message) = match output {
                            bollard::container::LogOutput::StdOut { message } => {
                                ("stdout".to_string(), String::from_utf8_lossy(&message).to_string())
                            }
                            bollard::container::LogOutput::StdErr { message } => {
                                ("stderr".to_string(), String::from_utf8_lossy(&message).to_string())
                            }
                            bollard::container::LogOutput::Console { message } => {
                                ("console".to_string(), String::from_utf8_lossy(&message).to_string())
                            }
                            bollard::container::LogOutput::StdIn { message } => {
                                ("stdin".to_string(), String::from_utf8_lossy(&message).to_string())
                            }
                        };
                        LogLine { stream, message }
                    })
                    .map_err(DockerError::Api)
            })
    }
}
