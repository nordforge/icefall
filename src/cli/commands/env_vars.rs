use crate::cli::client::CliClient;

pub async fn set(app: &str, pair: &str) {
    let client = CliClient::new_or_exit();

    let (key, value) = match pair.split_once('=') {
        Some((k, v)) => (k.to_string(), v.to_string()),
        None => {
            eprintln!("Invalid format. Use KEY=value");
            std::process::exit(1);
        }
    };

    match client
        .post::<serde_json::Value>(
            &format!("/apps/{app}/env"),
            &serde_json::json!({"key": key, "value": value}),
        )
        .await
    {
        Ok(_) => println!("Set {key} for {app}"),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

pub async fn list(app: &str) {
    let client = CliClient::new_or_exit();

    match client
        .get::<serde_json::Value>(&format!("/apps/{app}/env"))
        .await
    {
        Ok(resp) => {
            let vars = resp
                .get("data")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            if vars.is_empty() {
                println!("No environment variables.");
                return;
            }
            println!("{:<25} {:<15} VALUE", "KEY", "SCOPE");
            println!("{}", "-".repeat(60));
            for var in &vars {
                let key = var.get("key").and_then(|v| v.as_str()).unwrap_or("?");
                let scope = var.get("scope").and_then(|v| v.as_str()).unwrap_or("-");
                let value = var
                    .get("value")
                    .and_then(|v| v.as_str())
                    .unwrap_or("••••••••");
                println!("{:<25} {:<15} {}", key, scope, value);
            }
        }
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}
