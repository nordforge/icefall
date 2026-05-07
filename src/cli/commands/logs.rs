use crate::cli::client::CliClient;

pub async fn stream(app: &str, search: Option<&str>) {
    let client = match CliClient::new() {
        Ok(c) => c,
        Err(e) => { eprintln!("{e}"); std::process::exit(2); }
    };

    let query = match search {
        Some(s) => format!("/apps/{app}/logs?search={s}&limit=100"),
        None => format!("/apps/{app}/logs?limit=100"),
    };

    match client.get::<serde_json::Value>(&query).await {
        Ok(resp) => {
            let lines = resp.get("data").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            for line in &lines {
                let ts = line.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
                let stream = line.get("stream").and_then(|v| v.as_str()).unwrap_or("");
                let msg = line.get("message").and_then(|v| v.as_str()).unwrap_or("");
                println!("{ts} [{stream}] {msg}");
            }
        }
        Err(e) => { eprintln!("Error: {e}"); std::process::exit(1); }
    }
}
