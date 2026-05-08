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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<Vec<String>>,
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
        Self::reverse_proxy_with_path(domain, None, upstream)
    }

    pub fn reverse_proxy_with_path(domain: &str, path: Option<&str>, upstream: &str) -> Self {
        let path_matcher = path.map(|p| {
            let pattern = if p.ends_with('*') {
                p.to_string()
            } else if p.ends_with('/') {
                format!("{p}*")
            } else {
                format!("{p}*")
            };
            vec![pattern]
        });

        Self {
            matchers: vec![CaddyMatch {
                host: vec![domain.to_string()],
                path: path_matcher,
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
