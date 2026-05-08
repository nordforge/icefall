use chrono::Utc;
use serde::{Deserialize, Serialize};

// --- Users ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String,
    #[serde(skip_serializing)]
    pub totp_secret: Option<String>,
    pub totp_enabled: bool,
    #[serde(skip_serializing)]
    pub totp_backup_codes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct NewUser {
    pub email: String,
    pub password_hash: String,
    pub role: String,
}

// --- Apps ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct App {
    pub id: String,
    pub name: String,
    pub git_repo: Option<String>,
    pub git_branch: String,
    pub framework: Option<String>,
    pub build_config: Option<String>,
    pub resource_limits: Option<String>,
    pub preview_enabled: bool,
    pub preview_branch_pattern: Option<String>,
    pub webhook_secret: Option<String>,
    pub tags: Option<String>,
    pub volumes: Option<String>,
    pub image_ref: Option<String>,
    pub compose_content: Option<String>,
    pub project_id: Option<String>,
    pub deploy_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct NewApp {
    pub name: String,
    pub git_repo: Option<String>,
    pub git_branch: String,
    pub framework: Option<String>,
    pub image_ref: Option<String>,
    pub compose_content: Option<String>,
    pub deploy_mode: Option<String>,
}

pub struct UpdateApp {
    pub name: Option<String>,
    pub git_repo: Option<String>,
    pub git_branch: Option<String>,
    pub framework: Option<String>,
    pub build_config: Option<String>,
    pub resource_limits: Option<String>,
    pub preview_enabled: Option<bool>,
    pub preview_branch_pattern: Option<Option<String>>,
    pub tags: Option<String>,
    pub volumes: Option<String>,
    pub image_ref: Option<Option<String>>,
    pub compose_content: Option<Option<String>>,
    pub project_id: Option<Option<String>>,
    pub deploy_mode: Option<String>,
}

// --- Projects ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct NewProject {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

pub struct UpdateProject {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub color: Option<Option<String>>,
}

// --- Environments ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Environment {
    pub id: String,
    pub app_id: String,
    pub name: String,
    pub env_type: String,
    pub branch: Option<String>,
    pub created_at: String,
}

pub struct NewEnvironment {
    pub app_id: String,
    pub name: String,
    pub env_type: String,
    pub branch: Option<String>,
}

// --- Env Vars ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVar {
    pub id: String,
    pub environment_id: String,
    pub key: String,
    pub value: String,
    pub scope: String,
    pub created_at: String,
}

pub struct NewEnvVar {
    pub environment_id: String,
    pub key: String,
    pub value: String,
    pub scope: String,
}

// --- Deploys ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Deploy {
    pub id: String,
    pub app_id: String,
    pub environment_id: String,
    pub status: String,
    pub git_sha: Option<String>,
    pub build_log: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub image_ref: Option<String>,
    pub container_id: Option<String>,
    pub env_snapshot: Option<String>,
    pub created_at: String,
}

pub struct NewDeploy {
    pub app_id: String,
    pub environment_id: String,
    pub git_sha: Option<String>,
}

// --- Managed Databases ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedDatabase {
    pub id: String,
    pub name: String,
    pub db_type: String,
    pub container_id: Option<String>,
    pub credentials: String,
    pub backup_schedule: Option<String>,
    pub app_id: Option<String>,
    pub project_id: Option<String>,
    pub created_at: String,
}

pub struct NewManagedDatabase {
    pub name: String,
    pub db_type: String,
    pub app_id: Option<String>,
}

// --- Domains ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Domain {
    pub id: String,
    pub app_id: String,
    pub domain: String,
    pub path: Option<String>,
    pub verified: bool,
    pub ssl_status: String,
    pub created_at: String,
}

pub struct NewDomain {
    pub app_id: String,
    pub domain: String,
    pub path: Option<String>,
}

// --- Notifications ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub channel_type: String,
    pub config: String,
    pub created_at: String,
}

pub struct NewNotification {
    pub channel_type: String,
    pub config: String,
}

// --- Notification Rules ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct NotificationRule {
    pub id: String,
    pub app_id: String,
    pub notification_id: String,
    pub event_type: String,
}

pub struct NewNotificationRule {
    pub app_id: String,
    pub notification_id: String,
    pub event_type: String,
}

// --- Health Checks ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HealthCheck {
    pub id: String,
    pub app_id: String,
    pub check_type: String,
    pub config: Option<String>,
    pub interval_secs: i64,
    pub failure_threshold: i64,
    pub auto_restart: bool,
    pub created_at: String,
}

pub struct NewHealthCheck {
    pub app_id: String,
    pub check_type: String,
    pub config: Option<String>,
    pub interval_secs: i64,
    pub failure_threshold: i64,
    pub auto_restart: bool,
}

// --- Health Check Events ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HealthCheckEvent {
    pub id: String,
    pub health_check_id: String,
    pub status: String,
    pub checked_at: String,
}

pub struct NewHealthCheckEvent {
    pub health_check_id: String,
    pub status: String,
}

// --- Sessions ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub expires_at: String,
    pub created_at: String,
}

// --- API Tokens ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApiToken {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub token_hash: String,
    pub last_used_at: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

// --- Invitations ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Invitation {
    pub id: String,
    pub email: String,
    pub role: String,
    pub token: String,
    pub expires_at: String,
    pub created_at: String,
}

// --- Instance Backup Config ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InstanceBackupConfig {
    pub id: String,
    pub enabled: bool,
    pub cron_schedule: String,
    pub retention_count: i64,
    pub updated_at: String,
}

// --- Instance Backup History ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InstanceBackupRecord {
    pub id: String,
    pub filename: String,
    pub size_bytes: i64,
    pub status: String,
    pub error_message: Option<String>,
    pub s3_key: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

// --- OAuth Identities ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OAuthIdentity {
    pub id: String,
    pub user_id: String,
    pub provider: String,
    pub provider_user_id: String,
    pub provider_email: Option<String>,
    pub created_at: String,
}

// --- OAuth Settings ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthSettings {
    pub github_client_id: Option<String>,
    pub github_client_secret: Option<String>,
    pub github_enabled: bool,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_enabled: bool,
}

pub fn now_iso8601() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}
