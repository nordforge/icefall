use crate::cli::client::CliClient;

const GREEN: &str = "\x1b[32m";
const RED: &str = "\x1b[31m";
const YELLOW: &str = "\x1b[33m";
const BOLD: &str = "\x1b[1m";
const DIM: &str = "\x1b[2m";
const RESET: &str = "\x1b[0m";

/// Interactive update flow (default when no subcommand given).
///
/// 1. Check for updates
/// 2. If available: show version + changelog
/// 3. Ask for confirmation
/// 4. Download with progress
/// 5. Apply update
/// 6. Print success message
pub async fn run() {
    let client = CliClient::new_or_exit();
    let current = env!("CARGO_PKG_VERSION");

    // Step 1: Check for updates
    print!("Checking for updates...  ");
    let check: serde_json::Value = match client.get("/system/update/check").await {
        Ok(v) => v,
        Err(e) => {
            println!("{RED}failed{RESET}");
            eprintln!("{RED}Error:{RESET} {e}");
            std::process::exit(1);
        }
    };

    let data = &check["data"];
    let available = data["available"].as_bool().unwrap_or(false);

    if !available {
        println!("{GREEN}up to date{RESET}");
        println!("\n  Icefall {GREEN}v{current}{RESET} is the latest version.");
        return;
    }

    let latest = data["latest_version"].as_str().unwrap_or("unknown");
    let breaking = data["breaking"].as_bool().unwrap_or(false);
    println!("{GREEN}done{RESET}");

    // Step 2: Show version info and changelog
    println!();
    println!("  {BOLD}Icefall v{current}{RESET} {DIM}->{RESET} {BOLD}{GREEN}v{latest}{RESET}");

    if breaking {
        println!();
        println!("  {YELLOW}Warning: This update contains breaking changes.{RESET}");
        if let Some(changes) = data["breaking_changes"].as_str() {
            println!("  {changes}");
        }
    }

    if let Some(highlights) = data["changelog_highlights"].as_array() {
        if !highlights.is_empty() {
            println!();
            println!("  {BOLD}What's new:{RESET}");
            for item in highlights {
                if let Some(s) = item.as_str() {
                    println!("    {DIM}-{RESET} {s}");
                }
            }
        }
    }
    println!();

    // Step 3: Ask for confirmation
    if !confirm("  Apply this update?") {
        println!("  Update cancelled.");
        return;
    }

    // Step 4: Download
    println!();
    print!("  Downloading update...   ");
    let download: serde_json::Value = match client
        .post("/system/update/download", &serde_json::json!({}))
        .await
    {
        Ok(v) => v,
        Err(e) => {
            println!("{RED}failed{RESET}");
            eprintln!("  {RED}Error:{RESET} {e}");
            std::process::exit(1);
        }
    };

    let dl_status = download["data"]["status"].as_str().unwrap_or("unknown");
    if dl_status != "download_started" && dl_status != "already_downloading" {
        println!("{RED}failed{RESET}");
        eprintln!("  Unexpected download status: {dl_status}");
        std::process::exit(1);
    }

    // Poll download progress
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        let status: serde_json::Value = match client.get("/system/update/status").await {
            Ok(v) => v,
            Err(e) => {
                println!("{RED}failed{RESET}");
                eprintln!("  {RED}Error:{RESET} {e}");
                std::process::exit(1);
            }
        };

        let state = status["data"]["download_state"]
            .as_str()
            .unwrap_or("unknown");
        let progress = status["data"]["download_progress"].as_i64().unwrap_or(0);

        match state {
            "downloading" => {
                print!("\r  Downloading update...   {progress}%  ");
            }
            "ready" => {
                println!("\r  Downloading update...   {GREEN}done{RESET}  ");
                break;
            }
            "error" => {
                println!("{RED}failed{RESET}");
                let err_msg = status["data"]["error_message"]
                    .as_str()
                    .unwrap_or("Unknown error");
                eprintln!("  {RED}Error:{RESET} {err_msg}");
                std::process::exit(1);
            }
            _ => {
                // Unknown state, keep polling briefly
            }
        }
    }

    // Step 5: Apply update
    print!("  Applying update...      ");
    let apply: serde_json::Value = match client
        .post("/system/update/apply", &serde_json::json!({}))
        .await
    {
        Ok(v) => v,
        Err(e) => {
            println!("{RED}failed{RESET}");
            eprintln!("  {RED}Error:{RESET} {e}");
            std::process::exit(1);
        }
    };

    let apply_status = apply["data"]["status"].as_str().unwrap_or("unknown");
    if apply_status == "applying" {
        println!("{GREEN}done{RESET}");
    } else {
        println!("{YELLOW}{apply_status}{RESET}");
    }

    // Step 6: Success
    println!();
    println!("  {GREEN}Update complete!{RESET} Icefall is restarting with v{latest}.");
    println!("  {DIM}If the service doesn't come back, run: icefall update rollback{RESET}");
}

/// Check for updates without applying. Prints result and exits.
///
/// Exit code 0 = up to date, exit code 1 = update available.
pub async fn check() {
    let client = CliClient::new_or_exit();
    let current = env!("CARGO_PKG_VERSION");

    print!("Checking for updates...  ");
    let check: serde_json::Value = match client.get("/system/update/check").await {
        Ok(v) => v,
        Err(e) => {
            println!("{RED}failed{RESET}");
            eprintln!("{RED}Error:{RESET} {e}");
            std::process::exit(2);
        }
    };

    let data = &check["data"];
    let available = data["available"].as_bool().unwrap_or(false);

    if !available {
        println!("{GREEN}up to date{RESET}");
        println!("\n  Icefall {GREEN}v{current}{RESET} is the latest version.");
        std::process::exit(0);
    }

    let latest = data["latest_version"].as_str().unwrap_or("unknown");
    let breaking = data["breaking"].as_bool().unwrap_or(false);
    println!("{GREEN}done{RESET}");

    println!();
    println!("  {BOLD}Update available:{RESET} v{current} -> {GREEN}v{latest}{RESET}");

    if breaking {
        println!("  {YELLOW}This update contains breaking changes.{RESET}");
    }

    if let Some(highlights) = data["changelog_highlights"].as_array() {
        if !highlights.is_empty() {
            println!();
            println!("  {BOLD}What's new:{RESET}");
            for item in highlights {
                if let Some(s) = item.as_str() {
                    println!("    {DIM}-{RESET} {s}");
                }
            }
        }
    }

    println!();
    println!("  Run {BOLD}icefall update{RESET} to apply this update.");

    // Exit code 1 signals "update available" (useful for scripting)
    std::process::exit(1);
}

/// Roll back to the previous version.
pub async fn rollback(yes: bool) {
    let client = CliClient::new_or_exit();

    // Check rollback availability via status endpoint
    print!("Checking rollback availability...  ");
    let status: serde_json::Value = match client.get("/system/update/status").await {
        Ok(v) => v,
        Err(e) => {
            println!("{RED}failed{RESET}");
            eprintln!("{RED}Error:{RESET} {e}");
            std::process::exit(1);
        }
    };

    let rollback_available = status["data"]["rollback_available"]
        .as_bool()
        .unwrap_or(false);

    if !rollback_available {
        println!("{RED}unavailable{RESET}");
        eprintln!(
            "\n  {RED}No rollback binary found.{RESET} A rollback is only available after a successful update."
        );
        std::process::exit(1);
    }
    println!("{GREEN}available{RESET}");

    let current = env!("CARGO_PKG_VERSION");
    println!();
    println!("  {YELLOW}This will roll back Icefall v{current} to the previous version.{RESET}");
    println!("  The database will also be restored from the pre-update backup.");

    // Confirm unless --yes
    if !yes {
        println!();
        if !confirm("  Proceed with rollback?") {
            println!("  Rollback cancelled.");
            return;
        }
    }

    println!();
    print!("  Rolling back...  ");
    let result: serde_json::Value = match client
        .post("/system/update/rollback", &serde_json::json!({}))
        .await
    {
        Ok(v) => v,
        Err(e) => {
            println!("{RED}failed{RESET}");
            eprintln!("  {RED}Error:{RESET} {e}");
            std::process::exit(1);
        }
    };

    let rb_status = result["data"]["status"].as_str().unwrap_or("unknown");
    if rb_status == "rolling_back" {
        println!("{GREEN}done{RESET}");
        println!();
        println!(
            "  {GREEN}Rollback initiated.{RESET} The service will restart with the previous version."
        );
    } else {
        println!("{YELLOW}{rb_status}{RESET}");
    }
}

/// Simple yes/no confirmation prompt. Returns `true` if the user responds with y/Y/yes.
fn confirm(prompt: &str) -> bool {
    use std::io::{self, Write};

    print!("{prompt} [y/N] ");
    io::stdout().flush().ok();

    let mut input = String::new();
    if io::stdin().read_line(&mut input).is_err() {
        return false;
    }

    matches!(input.trim().to_lowercase().as_str(), "y" | "yes")
}
