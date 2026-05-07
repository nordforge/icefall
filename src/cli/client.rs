use std::path::PathBuf;

use reqwest::Client;
use serde::de::DeserializeOwned;

pub struct CliClient {
    http: Client,
    base_url: String,
    token: Option<String>,
}

#[derive(serde::Deserialize, serde::Serialize, Default)]
pub struct Credentials {
    pub server_url: String,
    pub token: String,
}

impl Credentials {
    pub fn path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("icefall")
            .join("credentials.toml")
    }

    pub fn load() -> Option<Self> {
        let content = std::fs::read_to_string(Self::path()).ok()?;
        toml::from_str(&content).ok()
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let content = toml::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, content).map_err(|e| e.to_string())
    }
}

impl CliClient {
    pub fn new() -> Result<Self, String> {
        let creds = Credentials::load()
            .ok_or_else(|| "Not logged in. Run `icefall login` first.".to_string())?;

        Ok(Self {
            http: Client::new(),
            base_url: creds.server_url.trim_end_matches('/').to_string(),
            token: Some(creds.token),
        })
    }

    pub fn new_or_exit() -> Self {
        match Self::new() {
            Ok(c) => c,
            Err(e) => {
                eprintln!("{e}");
                std::process::exit(2);
            }
        }
    }

    pub fn from_url(url: &str, token: &str) -> Self {
        Self {
            http: Client::new(),
            base_url: url.trim_end_matches('/').to_string(),
            token: Some(token.to_string()),
        }
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T, String> {
        let url = format!("{}/api/v1{path}", self.base_url);
        let mut req = self.http.get(&url);
        if let Some(ref token) = self.token {
            req = req.header("Authorization", format!("Bearer {token}"));
        }
        let resp = req.send().await.map_err(|e| format!("Connection failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("API error {status}: {body}"));
        }
        resp.json().await.map_err(|e| format!("Parse error: {e}"))
    }

    pub async fn post<T: DeserializeOwned>(&self, path: &str, body: &serde_json::Value) -> Result<T, String> {
        let url = format!("{}/api/v1{path}", self.base_url);
        let mut req = self.http.post(&url).json(body);
        if let Some(ref token) = self.token {
            req = req.header("Authorization", format!("Bearer {token}"));
        }
        let resp = req.send().await.map_err(|e| format!("Connection failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("API error {status}: {body}"));
        }
        resp.json().await.map_err(|e| format!("Parse error: {e}"))
    }

    pub async fn delete(&self, path: &str) -> Result<serde_json::Value, String> {
        let url = format!("{}/api/v1{path}", self.base_url);
        let mut req = self.http.delete(&url);
        if let Some(ref token) = self.token {
            req = req.header("Authorization", format!("Bearer {token}"));
        }
        let resp = req.send().await.map_err(|e| format!("Connection failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("API error {status}: {body}"));
        }
        resp.json().await.map_err(|e| format!("Parse error: {e}"))
    }
}
