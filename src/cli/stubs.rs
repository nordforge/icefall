pub async fn deploy() {
    println!("Deploy is not yet implemented.");
}

pub async fn apps_list() {
    println!("Apps list is not yet implemented.");
}

pub async fn apps_info(app: &str) {
    println!("Apps info for '{app}' is not yet implemented.");
}

pub async fn logs(app: &str, search: Option<&str>) {
    let _ = search;
    println!("Logs for '{app}' is not yet implemented.");
}

pub async fn env_set(app: &str, pair: &str) {
    let _ = pair;
    println!("Env set for '{app}' is not yet implemented.");
}

pub async fn env_list(app: &str) {
    println!("Env list for '{app}' is not yet implemented.");
}

pub async fn domains_add(app: &str, domain: &str) {
    let _ = domain;
    println!("Domains add for '{app}' is not yet implemented.");
}

pub async fn domains_list(app: &str) {
    println!("Domains list for '{app}' is not yet implemented.");
}

pub async fn db_create(db_type: &str) {
    println!("Database create ({db_type}) is not yet implemented.");
}

pub async fn db_list() {
    println!("Database list is not yet implemented.");
}

pub async fn db_backup(db: &str) {
    println!("Database backup for '{db}' is not yet implemented.");
}

pub async fn migrate_export(output: &str) {
    println!("Migrate export to '{output}' is not yet implemented.");
}

pub async fn migrate_import(from: &str) {
    println!("Migrate import from '{from}' is not yet implemented.");
}

pub async fn update() {
    println!("Self-update is not yet implemented.");
}

pub async fn status() {
    println!("Server status is not yet implemented.");
}
