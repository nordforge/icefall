use std::io::{self, Read as _, Write as _};
use std::path::Path;
use std::process::Command;

use sha2::Digest;

const MANIFEST_FILE: &str = "manifest.json";

pub async fn export(output: &str, dry_run: bool) {
    let is_s3 = output.starts_with("s3://") || output.starts_with("r2://");
    let local_output = if is_s3 {
        "icefall-export-temp.tar.gz".to_string()
    } else {
        output.to_string()
    };
    let output_path = Path::new(&local_output);
    let data_dir =
        std::env::var("ICEFALL_DATA_DIR").unwrap_or_else(|_| "/var/lib/icefall".to_string());
    let data_path = Path::new(&data_dir);

    if !data_path.exists() {
        eprintln!("Data directory not found: {data_dir}");
        std::process::exit(1);
    }

    // Pre-flight: estimate size
    let db_size = file_size(&data_path.join("icefall.db"));
    let logs_size = dir_size(&data_path.join("logs"));
    let backups_size = dir_size(&data_path.join("backups"));
    let volumes = list_icefall_volumes();
    let db_containers = list_icefall_db_containers();

    println!("Export summary:");
    println!("  SQLite database:     {}", format_bytes(db_size));
    println!("  Log files:           {}", format_bytes(logs_size));
    println!("  Backup archives:     {}", format_bytes(backups_size));
    println!("  Docker volumes:      {} volume(s)", volumes.len());
    println!("  Managed databases:   {} container(s)", db_containers.len());
    println!(
        "  Estimated total:     {} (before compression)",
        format_bytes(db_size + logs_size + backups_size)
    );
    println!();

    if dry_run {
        println!("Dry run — no files written.");
        return;
    }

    // Warn about daemon
    if is_daemon_running() {
        println!("⚠ The Icefall daemon is running. For a fully consistent export,");
        println!("  consider stopping it first: systemctl stop icefall");
        print!("  Continue anyway? [y/N] ");
        io::stdout().flush().ok();
        let mut answer = String::new();
        io::stdin().read_line(&mut answer).ok();
        if !answer.trim().eq_ignore_ascii_case("y") {
            println!("Export cancelled.");
            return;
        }
    }

    println!("Exporting full Icefall instance...");
    println!();

    let temp_dir = tempfile::TempDir::new().unwrap_or_else(|e| {
        eprintln!("Failed to create temp directory: {e}");
        std::process::exit(1);
    });
    let staging = temp_dir.path();

    // Step 1: SQLite database
    println!("  [1/8] Exporting SQLite database...");
    let db_path = data_path.join("icefall.db");
    if db_path.exists() {
        let _ = Command::new("sqlite3")
            .arg(&db_path)
            .arg("PRAGMA wal_checkpoint(TRUNCATE);")
            .output();
        copy_or_exit(&db_path, &staging.join("icefall.db"));
    }

    // Step 2: Configuration
    println!("  [2/8] Exporting configuration (includes encryption key)...");
    let config_path = find_config();
    if let Some(ref path) = config_path {
        copy_or_exit(Path::new(path), &staging.join("config.toml"));
        println!("    ⚠ config.toml contains your encryption key — keep this archive secure");
    }

    // Step 3: Fresh database dumps
    println!("  [3/8] Running fresh database dumps...");
    let dumps_dir = staging.join("db-dumps");
    std::fs::create_dir_all(&dumps_dir).ok();
    export_managed_database_dumps(&dumps_dir);

    // Step 4: Docker volumes
    println!("  [4/8] Exporting Docker volume data...");
    let volumes_dir = staging.join("volumes");
    std::fs::create_dir_all(&volumes_dir).ok();
    export_docker_volumes(&volumes_dir);

    // Step 5: Logs
    println!("  [5/8] Exporting log files...");
    let logs_dir = data_path.join("logs");
    if logs_dir.exists() {
        copy_dir_recursive(&logs_dir, &staging.join("logs"));
    }

    // Step 6: Backups
    println!("  [6/8] Exporting backup archives...");
    let backups_dir = data_path.join("backups");
    if backups_dir.exists() {
        copy_dir_recursive(&backups_dir, &staging.join("backups"));
    }

    // Step 7: Write manifest
    println!("  [7/8] Writing manifest...");
    let manifest = serde_json::json!({
        "icefall_version": env!("CARGO_PKG_VERSION"),
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "contents": {
            "database": db_path.exists(),
            "config": config_path.is_some(),
            "db_dumps": db_containers.len(),
            "volumes": volumes.len(),
            "has_logs": logs_dir.exists(),
            "has_backups": backups_dir.exists(),
        }
    });
    std::fs::write(
        staging.join(MANIFEST_FILE),
        serde_json::to_string_pretty(&manifest).unwrap(),
    )
    .ok();

    // Step 8: Create archive with checksum
    println!("  [8/8] Creating archive...");
    let file = std::fs::File::create(output_path).unwrap_or_else(|e| {
        eprintln!("Failed to create output file: {e}");
        std::process::exit(1);
    });
    let encoder = flate2::write::GzEncoder::new(file, flate2::Compression::default());
    let mut archive = tar::Builder::new(encoder);

    archive.append_dir_all(".", staging).unwrap_or_else(|e| {
        eprintln!("Failed to create archive: {e}");
        std::process::exit(1);
    });

    let encoder = archive.into_inner().unwrap();
    encoder.finish().unwrap();

    // Write checksum alongside the archive
    let checksum = sha256_file(output_path);
    let checksum_path = format!("{local_output}.sha256");
    std::fs::write(&checksum_path, format!("{checksum}  {local_output}\n")).ok();

    let size = std::fs::metadata(output_path).map(|m| m.len()).unwrap_or(0);

    // Upload to S3/R2 if requested
    if is_s3 {
        println!();
        println!("  Uploading to {output}...");
        let s3_url = output.replacen("r2://", "s3://", 1);
        let upload_result = Command::new("aws")
            .args(["s3", "cp", &local_output, &s3_url])
            .status();

        match upload_result {
            Ok(status) if status.success() => {
                println!("  ✓ Uploaded to {output}");
                let _ = std::fs::remove_file(&local_output);
                let _ = std::fs::remove_file(&checksum_path);
            }
            Ok(_) => {
                eprintln!("  ✗ S3 upload failed. Archive saved locally as {local_output}");
                eprintln!("    Make sure `aws` CLI is installed and configured.");
                eprintln!("    For R2: aws configure --profile r2, then set AWS_PROFILE=r2");
            }
            Err(_) => {
                eprintln!("  ✗ `aws` CLI not found. Install it to enable S3/R2 uploads.");
                eprintln!("    Archive saved locally as {local_output}");
            }
        }
    }

    println!();
    println!("Export complete: {} ({})", if is_s3 { output } else { &local_output }, format_bytes(size));
    if !is_s3 {
        println!("Checksum:        {checksum_path}");
    }
    println!();
    println!("Included:");
    println!("  ✓ SQLite database (apps, users, sessions, env vars)");
    println!("  ✓ Configuration with encryption key");
    println!("  ✓ Fresh database dumps ({} database(s))", db_containers.len());
    println!("  ✓ Docker volume snapshots ({} volume(s))", volumes.len());
    println!("  ✓ Log files and backup archives");
    println!();
    println!("Not included (auto-handled on new server):");
    println!("  - Container images (re-pulled on deploy)");
    println!("  - SSL certificates (re-issued by Caddy)");
}

pub async fn import(from: &str, dry_run: bool) {
    let is_s3 = from.starts_with("s3://") || from.starts_with("r2://");
    let local_path = if is_s3 {
        let local = "icefall-import-temp.tar.gz".to_string();
        println!("  Downloading from {from}...");
        let s3_url = from.replacen("r2://", "s3://", 1);
        let result = Command::new("aws")
            .args(["s3", "cp", &s3_url, &local])
            .status();
        match result {
            Ok(status) if status.success() => {
                let size = file_size(Path::new(&local));
                println!("  ✓ Downloaded ({})", format_bytes(size));
            }
            Ok(_) => {
                eprintln!("  ✗ S3 download failed. Make sure `aws` CLI is configured.");
                std::process::exit(1);
            }
            Err(_) => {
                eprintln!("  ✗ `aws` CLI not found. Install it to import from S3/R2.");
                std::process::exit(1);
            }
        }
        local
    } else {
        from.to_string()
    };

    let archive_path = Path::new(&local_path);
    if !archive_path.exists() {
        eprintln!("Archive not found: {from}");
        std::process::exit(1);
    }

    // Verify checksum if .sha256 file exists alongside
    let checksum_path = format!("{local_path}.sha256");
    if Path::new(&checksum_path).exists() {
        print!("  Verifying checksum...");
        let expected = std::fs::read_to_string(&checksum_path)
            .unwrap_or_default()
            .split_whitespace()
            .next()
            .unwrap_or("")
            .to_string();
        let actual = sha256_file(archive_path);
        if expected == actual {
            println!(" ✓ valid");
        } else {
            println!(" ✗ MISMATCH");
            eprintln!("Expected: {expected}");
            eprintln!("Got:      {actual}");
            eprintln!("The archive may be corrupted or tampered with.");
            std::process::exit(1);
        }
    }

    let data_dir =
        std::env::var("ICEFALL_DATA_DIR").unwrap_or_else(|_| "/var/lib/icefall".to_string());
    let data_path = Path::new(&data_dir);

    let temp_dir = tempfile::TempDir::new().unwrap();
    let staging = temp_dir.path();

    // Extract to peek at manifest
    println!("  Extracting archive...");
    let file = std::fs::File::open(archive_path).unwrap();
    let decoder = flate2::read::GzDecoder::new(file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(staging).unwrap_or_else(|e| {
        eprintln!("Failed to extract archive: {e}");
        std::process::exit(1);
    });

    // Read manifest
    let manifest_path = staging.join(MANIFEST_FILE);
    if manifest_path.exists() {
        let manifest: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&manifest_path).unwrap_or_default())
                .unwrap_or_default();
        let version = manifest
            .get("icefall_version")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let exported_at = manifest
            .get("exported_at")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        println!();
        println!("Archive manifest:");
        println!("  Icefall version: {version}");
        println!("  Exported at:     {exported_at}");
        if let Some(contents) = manifest.get("contents") {
            let dumps = contents.get("db_dumps").and_then(|v| v.as_u64()).unwrap_or(0);
            let vols = contents.get("volumes").and_then(|v| v.as_u64()).unwrap_or(0);
            println!("  Database dumps:  {dumps}");
            println!("  Docker volumes:  {vols}");
        }
        println!();
    }

    if dry_run {
        println!("Dry run — no files restored.");
        return;
    }

    // Warn if daemon is running
    if is_daemon_running() {
        println!("⚠ Stopping the Icefall daemon before import...");
        let _ = Command::new("systemctl").args(["stop", "icefall"]).output();
    }

    println!("Importing full Icefall instance...");
    println!();

    // Step 1: Restore database
    println!("  [1/6] Restoring SQLite database...");
    std::fs::create_dir_all(data_path).ok();
    let db_src = staging.join("icefall.db");
    if db_src.exists() {
        copy_or_exit(&db_src, &data_path.join("icefall.db"));
        println!("    ✓ Database restored");
    } else {
        println!("    ⚠ No database in archive");
    }

    // Step 2: Restore configuration
    println!("  [2/6] Restoring configuration...");
    let config_src = staging.join("config.toml");
    if config_src.exists() {
        std::fs::create_dir_all("/etc/icefall").ok();
        copy_or_exit(&config_src, Path::new("/etc/icefall/config.toml"));
        println!("    ✓ Config restored (encryption key intact)");
    }

    // Step 3: Restore Docker volumes
    println!("  [3/6] Restoring Docker volumes...");
    let volumes_src = staging.join("volumes");
    if volumes_src.exists() {
        import_docker_volumes(&volumes_src);
    } else {
        println!("    No volume snapshots found");
    }

    // Step 4: Restore logs and backups
    println!("  [4/6] Restoring logs and backups...");
    let logs_src = staging.join("logs");
    if logs_src.exists() {
        copy_dir_recursive(&logs_src, &data_path.join("logs"));
    }
    let backups_src = staging.join("backups");
    if backups_src.exists() {
        copy_dir_recursive(&backups_src, &data_path.join("backups"));
    }

    // Step 5: Copy database dump files to data dir for later restore
    println!("  [5/6] Staging database dumps...");
    let dumps_src = staging.join("db-dumps");
    if dumps_src.exists() {
        let dest = data_path.join("migration-dumps");
        copy_dir_recursive(&dumps_src, &dest);
        println!("    Dumps staged to {}", dest.display());
    }

    // Step 6: Restart daemon
    println!("  [6/6] Starting Icefall daemon...");
    let _ = Command::new("systemctl")
        .args(["start", "icefall"])
        .output();

    println!();
    println!("Import complete!");
    println!();
    println!("The daemon is starting. It will:");
    println!("  - Read all app configs from the restored database");
    println!("  - Re-issue SSL certificates via Caddy on first request");
    println!();
    println!("To redeploy all apps (rebuilds container images):");
    println!("  icefall apps list");
    println!("  # For each app, trigger a deploy from the dashboard or CLI");
    println!();

    let dumps_dest = data_path.join("migration-dumps");
    if dumps_dest.exists() {
        println!("Database dumps are staged at: {}", dumps_dest.display());
        println!("After managed database containers start, restore them:");
        if let Ok(entries) = std::fs::read_dir(&dumps_dest) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                let container = name.split('.').next().unwrap_or(&name);
                if name.ends_with(".sql.gz") {
                    println!("  zcat {}/{name} | docker exec -i {container} psql -U icefall", dumps_dest.display());
                } else if name.ends_with(".rdb") {
                    println!("  docker cp {}/{name} {container}:/data/dump.rdb && docker restart {container}", dumps_dest.display());
                }
            }
        }
    }

    if is_s3 {
        let _ = std::fs::remove_file(&local_path);
    }
}

fn find_config() -> Option<String> {
    let paths = [
        "/etc/icefall/config.toml".to_string(),
        dirs::config_dir()
            .unwrap_or_default()
            .join("icefall/config.toml")
            .to_string_lossy()
            .to_string(),
    ];
    paths.into_iter().find(|p| Path::new(p).exists())
}

fn is_daemon_running() -> bool {
    Command::new("systemctl")
        .args(["is-active", "--quiet", "icefall"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn sha256_file(path: &Path) -> String {
    let mut file = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return String::new(),
    };
    let mut hasher = sha2::Sha256::new();
    let mut buf = [0u8; 8192];
    loop {
        let n = file.read(&mut buf).unwrap_or(0);
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    hex::encode(hasher.finalize())
}

fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }
    let units = ["B", "KB", "MB", "GB"];
    let i = (bytes as f64).log(1024.0).floor() as usize;
    let i = i.min(units.len() - 1);
    let value = bytes as f64 / 1024_f64.powi(i as i32);
    if value < 10.0 {
        format!("{value:.1} {}", units[i])
    } else {
        format!("{value:.0} {}", units[i])
    }
}

fn file_size(path: &Path) -> u64 {
    std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    walkdir(path)
}

fn walkdir(path: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += walkdir(&p);
            } else {
                total += entry.metadata().map(|m| m.len()).unwrap_or(0);
            }
        }
    }
    total
}

fn export_managed_database_dumps(dumps_dir: &Path) {
    let db_containers = list_icefall_db_containers();

    if db_containers.is_empty() {
        println!("    No managed database containers found");
        return;
    }

    for (name, db_type) in &db_containers {
        let dump_file = dumps_dir.join(format!("{name}.sql.gz"));
        let dump_cmd = match db_type.as_str() {
            t if t.contains("postgres") => {
                format!(
                    "docker exec {name} pg_dumpall -U icefall | gzip > {}",
                    dump_file.display()
                )
            }
            t if t.contains("mysql") => {
                format!(
                    "docker exec {name} mysqldump -u icefall --all-databases | gzip > {}",
                    dump_file.display()
                )
            }
            t if t.contains("mongo") => {
                format!(
                    "docker exec {name} mongodump --archive --gzip --username icefall > {}",
                    dump_file.display()
                )
            }
            t if t.contains("redis") => {
                let rdb_file = dumps_dir.join(format!("{name}.rdb"));
                format!(
                    "docker exec {name} redis-cli BGSAVE && sleep 2 && docker cp {name}:/data/dump.rdb {}",
                    rdb_file.display()
                )
            }
            _ => continue,
        };

        print!("    Dumping {name} ({db_type})...");
        let result = Command::new("sh").arg("-c").arg(&dump_cmd).output();
        match result {
            Ok(out) if out.status.success() => println!(" ✓"),
            Ok(out) => println!(
                " ✗ {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ),
            Err(e) => println!(" ✗ {e}"),
        }
    }
}

fn export_docker_volumes(volumes_dir: &Path) {
    let volumes = list_icefall_volumes();

    if volumes.is_empty() {
        println!("    No icefall volumes found");
        return;
    }

    for volume in &volumes {
        let tar_path = volumes_dir.join(format!("{volume}.tar.gz"));
        print!("    Exporting volume {volume}...");

        let result = Command::new("docker")
            .args([
                "run",
                "--rm",
                "-v",
                &format!("{volume}:/data"),
                "-v",
                &format!("{}:/backup", volumes_dir.display()),
                "alpine",
                "tar",
                "czf",
                &format!("/backup/{volume}.tar.gz"),
                "-C",
                "/data",
                ".",
            ])
            .output();

        match result {
            Ok(out) if out.status.success() => {
                let size = std::fs::metadata(&tar_path).map(|m| m.len()).unwrap_or(0);
                println!(" ✓ ({})", format_bytes(size));
            }
            Ok(out) => println!(
                " ✗ {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ),
            Err(e) => println!(" ✗ {e}"),
        }
    }
}

fn import_docker_volumes(volumes_dir: &Path) {
    let entries: Vec<_> = std::fs::read_dir(volumes_dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext == "gz")
                .unwrap_or(false)
        })
        .collect();

    if entries.is_empty() {
        println!("    No volume snapshots to restore");
        return;
    }

    for entry in &entries {
        let filename = entry.file_name().to_string_lossy().to_string();
        let volume_name = filename.trim_end_matches(".tar.gz");
        print!("    Restoring volume {volume_name}...");

        let _ = Command::new("docker")
            .args(["volume", "create", volume_name])
            .output();

        let result = Command::new("docker")
            .args([
                "run",
                "--rm",
                "-v",
                &format!("{volume_name}:/data"),
                "-v",
                &format!("{}:/backup", volumes_dir.display()),
                "alpine",
                "sh",
                "-c",
                &format!("cd /data && tar xzf /backup/{filename}"),
            ])
            .output();

        match result {
            Ok(out) if out.status.success() => println!(" ✓"),
            Ok(out) => println!(
                " ✗ {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ),
            Err(e) => println!(" ✗ {e}"),
        }
    }
}

fn list_icefall_db_containers() -> Vec<(String, String)> {
    let output = Command::new("docker")
        .args([
            "ps",
            "--filter",
            "label=icefall.managed-db=true",
            "--format",
            "{{.Names}}\t{{.Image}}",
        ])
        .output();

    match output {
        Ok(out) if out.status.success() => String::from_utf8_lossy(&out.stdout)
            .lines()
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 2 {
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else {
                    None
                }
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn list_icefall_volumes() -> Vec<String> {
    let output = Command::new("docker")
        .args([
            "volume",
            "ls",
            "--filter",
            "name=icefall-db-",
            "--format",
            "{{.Name}}",
        ])
        .output();

    match output {
        Ok(out) if out.status.success() => String::from_utf8_lossy(&out.stdout)
            .lines()
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty())
            .collect(),
        _ => Vec::new(),
    }
}

fn copy_or_exit(src: &Path, dst: &Path) {
    std::fs::copy(src, dst).unwrap_or_else(|e| {
        eprintln!("Failed to copy {} → {}: {e}", src.display(), dst.display());
        std::process::exit(1);
    });
}

fn copy_dir_recursive(src: &Path, dst: &Path) {
    std::fs::create_dir_all(dst).ok();
    if let Ok(entries) = std::fs::read_dir(src) {
        for entry in entries.flatten() {
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());
            if src_path.is_dir() {
                copy_dir_recursive(&src_path, &dst_path);
            } else {
                let _ = std::fs::copy(&src_path, &dst_path);
            }
        }
    }
}
