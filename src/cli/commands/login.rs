use std::io::{self, Write};

use crate::cli::client::Credentials;

pub async fn run() {
    print!("Server URL [http://localhost:3000]: ");
    io::stdout().flush().ok();
    let mut url = String::new();
    io::stdin().read_line(&mut url).ok();
    let url = url.trim();
    let url = if url.is_empty() {
        "http://localhost:3000"
    } else {
        url
    };

    print!("API token: ");
    io::stdout().flush().ok();
    let mut token = String::new();
    io::stdin().read_line(&mut token).ok();
    let token = token.trim().to_string();

    if token.is_empty() {
        eprintln!("Error: token is required");
        std::process::exit(2);
    }

    let creds = Credentials {
        server_url: url.to_string(),
        token,
    };

    match creds.save() {
        Ok(()) => println!("Logged in to {url}. Credentials saved."),
        Err(e) => {
            eprintln!("Failed to save credentials: {e}");
            std::process::exit(2);
        }
    }
}
