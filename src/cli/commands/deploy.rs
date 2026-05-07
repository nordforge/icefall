use crate::cli::client::CliClient;

pub async fn run() {
    let client = match CliClient::new() {
        Ok(c) => c,
        Err(e) => { eprintln!("{e}"); std::process::exit(2); }
    };

    let config = load_project_config();
    let app_id = match config.as_ref().and_then(|c| c.get("app_id").and_then(|v| v.as_str())) {
        Some(id) => id.to_string(),
        None => {
            eprintln!("No app configured. Create .icefall.toml with app_id or run `icefall deploy --init`");
            std::process::exit(1);
        }
    };

    println!("Deploying app {app_id}...");
    match client.post::<serde_json::Value>(&format!("/apps/{app_id}/deploys"), &serde_json::json!({})).await {
        Ok(resp) => {
            if let Some(data) = resp.get("data") {
                let id = data.get("id").and_then(|v| v.as_str()).unwrap_or("?");
                let status = data.get("status").and_then(|v| v.as_str()).unwrap_or("pending");
                println!("Deploy triggered: {id} ({status})");
            }
        }
        Err(e) => { eprintln!("Deploy failed: {e}"); std::process::exit(1); }
    }
}

fn load_project_config() -> Option<toml::Value> {
    let content = std::fs::read_to_string(".icefall.toml").ok()?;
    content.parse().ok()
}
