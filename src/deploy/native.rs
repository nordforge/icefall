use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;

use crate::build::detect::detect;
use crate::build::git::{clone_repo, GitCloneOptions};
use crate::build::{AstroMode, BuildConfig, DetectionResult, Framework, PackageManager};
use crate::caddy::CaddyClient;
use crate::config::IcefallConfig;
use crate::db::models::{App, Deploy, Environment};
use crate::db::Database;
use crate::deploy::DeployError;
use crate::events::{EventBus, EventType};

/// Determines whether a detected framework should use the native (static) pipeline.
pub fn should_use_native(detection: &DetectionResult) -> bool {
    match detection.framework {
        Framework::StaticSite | Framework::ViteReact | Framework::ViteVue => true,
        Framework::Astro => detection.astro_mode == Some(AstroMode::Static),
        _ => false,
    }
}

pub struct NativeDeployer {
    caddy: Arc<CaddyClient>,
    db: Arc<dyn Database>,
    config: Arc<IcefallConfig>,
    event_bus: Arc<EventBus>,
}

impl NativeDeployer {
    pub fn new(
        caddy: Arc<CaddyClient>,
        db: Arc<dyn Database>,
        config: Arc<IcefallConfig>,
        event_bus: Arc<EventBus>,
    ) -> Self {
        Self {
            caddy,
            db,
            config,
            event_bus,
        }
    }

    /// Run the full native deploy pipeline: clone, detect, install, build, copy, symlink, configure Caddy.
    pub async fn deploy(
        &self,
        deploy: &Deploy,
        app: &App,
        env: &Environment,
        build_config: Option<BuildConfig>,
    ) -> Result<(), DeployError> {
        let start = Instant::now();
        let mut log_lines: Vec<String> = Vec::new();

        self.emit_status(app, deploy, "building");
        self.db
            .update_deploy_status(&deploy.id, "building", None)
            .await?;

        // Step 1: Clone
        let build_dir = self.config.data_dir.join("builds").join(&deploy.id);
        let git_repo = app.git_repo.as_deref().ok_or_else(|| {
            DeployError::NativeBuild("app has no git_repo configured".to_string())
        })?;

        let clone_opts = GitCloneOptions {
            repo_url: git_repo.to_string(),
            branch: Some(app.git_branch.clone()),
            sha: None,
            ssh_key_path: None,
            token: None,
        };

        let clone_result = clone_repo(&clone_opts, &build_dir)
            .await
            .map_err(|e| DeployError::NativeBuild(format!("git clone failed: {e}")))?;

        let sha_short = &clone_result.resolved_sha[..8.min(clone_result.resolved_sha.len())];
        log_lines.push(format!("Cloned {} at {sha_short}", git_repo));

        // Update git sha on deploy
        let _ = self
            .db
            .update_deploy_status(&deploy.id, "building", Some(&log_lines.join("\n")))
            .await;

        // Step 2: Detect framework
        let detection = detect(&build_dir, build_config.as_ref())
            .map_err(|e| DeployError::NativeBuild(format!("framework detection failed: {e}")))?;

        log_lines.push(format!(
            "Detected {} with {} (node {})",
            detection.framework, detection.package_manager, detection.node_version
        ));

        // Step 3: Install dependencies
        let install_cmd = install_command(&detection.package_manager);
        log_lines.push(format!("Running: {install_cmd}"));
        self.db
            .update_deploy_status(&deploy.id, "building", Some(&log_lines.join("\n")))
            .await?;

        run_command(&install_cmd, &build_dir)
            .await
            .map_err(|e| DeployError::NativeBuild(format!("dependency install failed: {e}")))?;
        log_lines.push("Dependencies installed".to_string());

        // Step 4: Build
        let build_command = detection
            .build_command
            .as_deref()
            .unwrap_or("npm run build");
        log_lines.push(format!("Running: {build_command}"));
        self.db
            .update_deploy_status(&deploy.id, "building", Some(&log_lines.join("\n")))
            .await?;

        run_command(build_command, &build_dir)
            .await
            .map_err(|e| DeployError::NativeBuild(format!("build command failed: {e}")))?;
        log_lines.push("Build complete".to_string());

        // Step 5: Copy output to sites directory
        let output_dir_name = detection.output_dir.as_deref().unwrap_or("dist");
        let source_output = build_dir.join(output_dir_name);

        if !source_output.exists() {
            // Try common alternatives
            let alternatives = ["dist", "build", ".output/public", "out"];
            let found = alternatives.iter().find(|d| build_dir.join(d).exists());
            let actual_dir = match found {
                Some(d) => build_dir.join(d),
                None => {
                    let msg = format!(
                        "No build output found. Looked for: {output_dir_name}, {}",
                        alternatives.join(", ")
                    );
                    log_lines.push(msg.clone());
                    self.fail_deploy(&deploy.id, &log_lines).await;
                    return Err(DeployError::NativeBuild(msg));
                }
            };

            return self
                .finalize_deploy(
                    deploy,
                    app,
                    env,
                    &actual_dir,
                    &build_dir,
                    &mut log_lines,
                    start,
                )
                .await;
        }

        self.finalize_deploy(
            deploy,
            app,
            env,
            &source_output,
            &build_dir,
            &mut log_lines,
            start,
        )
        .await
    }

    #[allow(clippy::too_many_arguments)]
    async fn finalize_deploy(
        &self,
        deploy: &Deploy,
        app: &App,
        env: &Environment,
        source_output: &Path,
        build_dir: &Path,
        log_lines: &mut Vec<String>,
        start: Instant,
    ) -> Result<(), DeployError> {
        let sites_dir = self.config.data_dir.join("sites").join(&app.name);
        let deploy_site_dir = sites_dir.join(&deploy.id);

        tokio::fs::create_dir_all(&deploy_site_dir)
            .await
            .map_err(|e| DeployError::NativeBuild(format!("failed to create site dir: {e}")))?;

        copy_dir_recursive(source_output, &deploy_site_dir)
            .await
            .map_err(|e| DeployError::NativeBuild(format!("failed to copy output: {e}")))?;

        log_lines.push(format!("Copied output to {}", deploy_site_dir.display()));

        // Step 6: Atomic symlink switch
        let symlink_path = sites_dir.join("current");
        atomic_symlink(&deploy_site_dir, &symlink_path)
            .await
            .map_err(|e| DeployError::NativeBuild(format!("symlink switch failed: {e}")))?;
        log_lines.push("Symlink updated to new deploy".to_string());

        self.emit_status(app, deploy, "deploying");

        // Step 7: Configure Caddy file_server route
        let domains = self.resolve_domains(app, env).await?;
        let site_root = symlink_path.to_string_lossy().to_string();

        for (domain, _path) in &domains {
            // Try to update existing route first, fall back to adding new one
            if self
                .caddy
                .update_file_server_route(domain, &site_root)
                .await
                .is_err()
            {
                self.caddy
                    .add_file_server_route(domain, &site_root)
                    .await
                    .map_err(|e| DeployError::RouteUpdate(e.to_string()))?;
            }
            log_lines.push(format!("Caddy file_server route configured for {domain}"));
        }

        // Step 8: Cleanup build directory
        let _ = tokio::fs::remove_dir_all(build_dir).await;

        // Step 9: Cleanup old deploys
        if let Err(e) = cleanup_old_deploys(&sites_dir, &deploy.id, 5).await {
            tracing::warn!("Failed to cleanup old deploys: {e}");
        }

        let elapsed = start.elapsed().as_secs_f64();
        log_lines.push(format!("Native deploy complete in {elapsed:.1}s"));

        self.db
            .update_deploy_status(&deploy.id, "running", Some(&log_lines.join("\n")))
            .await?;
        self.emit_status(app, deploy, "running");

        Ok(())
    }

    async fn resolve_domains(
        &self,
        app: &App,
        env: &Environment,
    ) -> Result<Vec<(String, Option<String>)>, DeployError> {
        let mut domains = Vec::new();

        if env.env_type == "preview" {
            if let (Some(ref branch), Some(ref base_domain)) =
                (&env.branch, &self.config.base_domain)
            {
                let sanitized = crate::deploy::preview::sanitize_branch_for_subdomain(branch);
                domains.push((format!("{sanitized}--{}.{base_domain}", app.name), None));
            }
        } else {
            let custom_domains = self.db.list_domains(&app.id).await?;
            for d in custom_domains {
                domains.push((d.domain, d.path));
            }

            if let Some(ref base_domain) = self.config.base_domain {
                domains.push((format!("{}.{base_domain}", app.name), None));
            }
        }

        Ok(domains)
    }

    async fn fail_deploy(&self, deploy_id: &str, output: &[String]) {
        let tail: Vec<&str> = output.iter().rev().take(50).map(|s| s.as_str()).collect();
        let log = tail.into_iter().rev().collect::<Vec<_>>().join("\n");
        let _ = self
            .db
            .update_deploy_status(deploy_id, "failed", Some(&log))
            .await;
    }

    fn emit_status(&self, app: &App, deploy: &Deploy, status: &str) {
        self.event_bus.emit(
            EventType::DeployStatus,
            Some(&app.id),
            Some(&deploy.id),
            serde_json::json!({"status": status}),
        );
    }
}

/// Get the install command for a package manager.
fn install_command(pm: &PackageManager) -> String {
    match pm {
        PackageManager::Npm => "npm ci".to_string(),
        PackageManager::Yarn => "yarn install --frozen-lockfile".to_string(),
        PackageManager::Pnpm => "pnpm install --frozen-lockfile".to_string(),
        PackageManager::Bun => "bun install --frozen-lockfile".to_string(),
    }
}

/// Run a shell command in a directory, returning an error if it fails.
async fn run_command(cmd: &str, dir: &Path) -> Result<String, String> {
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .current_dir(dir)
        .output()
        .await
        .map_err(|e| format!("failed to spawn: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "exit code {}: {}\n{}",
            output.status.code().unwrap_or(-1),
            stderr.trim(),
            stdout.trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Recursively copy a directory.
async fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    tokio::fs::create_dir_all(dst).await?;

    let mut entries = tokio::fs::read_dir(src).await?;
    while let Some(entry) = entries.next_entry().await? {
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            Box::pin(copy_dir_recursive(&src_path, &dst_path)).await?;
        } else {
            tokio::fs::copy(&src_path, &dst_path).await?;
        }
    }

    Ok(())
}

/// Atomically switch a symlink using `ln -sfn`.
async fn atomic_symlink(target: &Path, link: &Path) -> Result<(), std::io::Error> {
    let output = tokio::process::Command::new("ln")
        .arg("-sfn")
        .arg(target)
        .arg(link)
        .output()
        .await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(std::io::Error::other(format!("ln -sfn failed: {stderr}")));
    }

    Ok(())
}

/// Remove old deploy directories, keeping the most recent `keep` count plus the current deploy.
async fn cleanup_old_deploys(
    sites_dir: &Path,
    current_deploy_id: &str,
    keep: usize,
) -> Result<(), std::io::Error> {
    let mut entries = tokio::fs::read_dir(sites_dir).await?;
    let mut deploy_dirs: Vec<(String, PathBuf)> = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        let name = entry.file_name().to_string_lossy().to_string();
        // Skip the "current" symlink
        if name == "current" {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            deploy_dirs.push((name, path));
        }
    }

    // Sort by name descending (UUIDs are v7 so they sort chronologically)
    deploy_dirs.sort_by(|a, b| b.0.cmp(&a.0));

    // Keep the current deploy and the most recent `keep` directories
    let mut kept = 0usize;
    for (name, path) in &deploy_dirs {
        if name == current_deploy_id {
            continue;
        }
        if kept < keep {
            kept += 1;
            continue;
        }
        tracing::info!("Removing old deploy directory: {}", path.display());
        let _ = tokio::fs::remove_dir_all(path).await;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn static_frameworks_are_native() {
        let make = |fw: Framework, astro: Option<AstroMode>| DetectionResult {
            framework: fw,
            package_manager: PackageManager::Npm,
            node_version: "22".to_string(),
            build_command: None,
            output_dir: None,
            start_command: None,
            detected_port: 80,
            astro_mode: astro,
        };

        assert!(should_use_native(&make(Framework::StaticSite, None)));
        assert!(should_use_native(&make(Framework::ViteReact, None)));
        assert!(should_use_native(&make(Framework::ViteVue, None)));
        assert!(should_use_native(&make(
            Framework::Astro,
            Some(AstroMode::Static)
        )));

        assert!(!should_use_native(&make(Framework::NextJs, None)));
        assert!(!should_use_native(&make(Framework::Nuxt, None)));
        assert!(!should_use_native(&make(Framework::NodeApp, None)));
        assert!(!should_use_native(&make(Framework::Dockerfile, None)));
        assert!(!should_use_native(&make(
            Framework::Astro,
            Some(AstroMode::Ssr)
        )));
    }

    #[test]
    fn install_commands_correct() {
        assert_eq!(install_command(&PackageManager::Npm), "npm ci");
        assert_eq!(
            install_command(&PackageManager::Yarn),
            "yarn install --frozen-lockfile"
        );
        assert_eq!(
            install_command(&PackageManager::Pnpm),
            "pnpm install --frozen-lockfile"
        );
        assert_eq!(
            install_command(&PackageManager::Bun),
            "bun install --frozen-lockfile"
        );
    }
}
