use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AgentMessage {
    #[serde(rename = "request")]
    Request {
        id: String,
        method: String,
        params: serde_json::Value,
    },
    #[serde(rename = "response")]
    Response {
        id: String,
        result: Option<serde_json::Value>,
        error: Option<String>,
    },
    #[serde(rename = "event")]
    Event {
        event_type: String,
        data: serde_json::Value,
    },
}
