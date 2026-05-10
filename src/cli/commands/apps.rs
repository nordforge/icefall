use crate::cli::client::CliClient;

pub async fn list() {
    let client = CliClient::new_or_exit();

    match client.get::<serde_json::Value>("/apps").await {
        Ok(resp) => {
            let apps = resp
                .get("data")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            if apps.is_empty() {
                println!("No apps found.");
                return;
            }
            println!(
                "{:<20} {:<12} {:<30} UPDATED",
                "NAME", "FRAMEWORK", "BRANCH"
            );
            println!("{}", "-".repeat(80));
            for app in &apps {
                let name = app.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                let framework = app.get("framework").and_then(|v| v.as_str()).unwrap_or("-");
                let branch = app
                    .get("git_branch")
                    .and_then(|v| v.as_str())
                    .unwrap_or("-");
                let updated = app
                    .get("updated_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("-");
                println!(
                    "{:<20} {:<12} {:<30} {}",
                    name,
                    framework,
                    branch,
                    &updated[..19.min(updated.len())]
                );
            }
        }
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

pub async fn info(app: &str) {
    let client = CliClient::new_or_exit();

    match client
        .get::<serde_json::Value>(&format!("/apps/{app}"))
        .await
    {
        Ok(resp) => {
            if let Some(data) = resp.get("data") {
                println!("{}", serde_json::to_string_pretty(data).unwrap_or_default());
            }
        }
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}
