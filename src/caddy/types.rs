use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaddyRoute {
    #[serde(rename = "match")]
    pub matchers: Vec<CaddyMatch>,
    pub handle: Vec<CaddyHandler>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terminal: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaddyMatch {
    pub host: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaddyHandler {
    pub handler: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upstreams: Option<Vec<CaddyUpstream>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaddyUpstream {
    pub dial: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteInfo {
    pub domain: String,
    pub upstream: String,
}

impl CaddyRoute {
    pub fn reverse_proxy(domain: &str, upstream: &str) -> Self {
        Self {
            matchers: vec![CaddyMatch {
                host: vec![domain.to_string()],
            }],
            handle: vec![CaddyHandler {
                handler: "reverse_proxy".to_string(),
                upstreams: Some(vec![CaddyUpstream {
                    dial: upstream.to_string(),
                }]),
            }],
            terminal: Some(true),
        }
    }
}
