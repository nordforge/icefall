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
    pub created_at: String,
    pub updated_at: String,
}

pub struct NewApp {
    pub name: String,
    pub git_repo: Option<String>,
    pub git_branch: String,
    pub framework: Option<String>,
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
    pub verified: bool,
    pub ssl_status: String,
    pub created_at: String,
}

pub struct NewDomain {
    pub app_id: String,
    pub domain: String,
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

pub fn now_iso8601() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}
