pub mod encryption;
pub mod models;
pub mod sqlite;

use async_trait::async_trait;
use thiserror::Error;

use crate::db::models::*;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("record not found: {0}")]
    NotFound(String),
    #[error("duplicate record: {0}")]
    Duplicate(String),
    #[error("encryption error: {0}")]
    Encryption(#[from] encryption::EncryptionError),
    #[error("database error: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
}

#[async_trait]
pub trait Database: Send + Sync + 'static {
    // Apps
    async fn create_app(&self, app: &NewApp) -> Result<App, DbError>;
    async fn get_app(&self, id: &str) -> Result<Option<App>, DbError>;
    async fn get_app_by_name(&self, name: &str) -> Result<Option<App>, DbError>;
    async fn list_apps(&self) -> Result<Vec<App>, DbError>;
    async fn update_app(&self, id: &str, update: &UpdateApp) -> Result<App, DbError>;
    async fn delete_app(&self, id: &str) -> Result<(), DbError>;

    // Environments
    async fn create_environment(&self, env: &NewEnvironment) -> Result<Environment, DbError>;
    async fn list_environments(&self, app_id: &str) -> Result<Vec<Environment>, DbError>;
    async fn delete_environment(&self, id: &str) -> Result<(), DbError>;

    // Env Vars
    async fn set_env_var(&self, env_var: &NewEnvVar) -> Result<EnvVar, DbError>;
    async fn get_env_vars(&self, environment_id: &str) -> Result<Vec<EnvVar>, DbError>;
    async fn delete_env_var(&self, id: &str) -> Result<(), DbError>;

    // Deploys
    async fn create_deploy(&self, deploy: &NewDeploy) -> Result<Deploy, DbError>;
    async fn get_deploy(&self, id: &str) -> Result<Option<Deploy>, DbError>;
    async fn list_deploys(&self, app_id: &str, limit: i64) -> Result<Vec<Deploy>, DbError>;
    async fn update_deploy_status(
        &self,
        id: &str,
        status: &str,
        log: Option<&str>,
    ) -> Result<(), DbError>;

    // Managed Databases
    async fn create_managed_db(
        &self,
        db: &NewManagedDatabase,
    ) -> Result<ManagedDatabase, DbError>;
    async fn list_managed_dbs(&self) -> Result<Vec<ManagedDatabase>, DbError>;
    async fn update_managed_db_credentials(
        &self,
        id: &str,
        credentials_json: &str,
        container_id: &str,
    ) -> Result<(), DbError>;
    async fn delete_managed_db(&self, id: &str) -> Result<(), DbError>;

    // Domains
    async fn add_domain(&self, domain: &NewDomain) -> Result<Domain, DbError>;
    async fn list_domains(&self, app_id: &str) -> Result<Vec<Domain>, DbError>;
    async fn update_domain_status(
        &self,
        id: &str,
        verified: bool,
        ssl_status: &str,
    ) -> Result<(), DbError>;
    async fn delete_domain(&self, id: &str) -> Result<(), DbError>;

    // Users
    async fn create_user(&self, user: &NewUser) -> Result<User, DbError>;
    async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, DbError>;
    async fn list_users(&self) -> Result<Vec<User>, DbError>;

    // Health Checks
    async fn create_health_check(&self, hc: &NewHealthCheck) -> Result<HealthCheck, DbError>;
    async fn get_health_checks(&self, app_id: &str) -> Result<Vec<HealthCheck>, DbError>;
    async fn record_health_event(&self, event: &NewHealthCheckEvent) -> Result<(), DbError>;
    async fn get_health_events(
        &self,
        health_check_id: &str,
        limit: i64,
    ) -> Result<Vec<HealthCheckEvent>, DbError>;

    // Notifications
    async fn create_notification_channel(
        &self,
        channel: &NewNotification,
    ) -> Result<Notification, DbError>;
    async fn list_notification_channels(&self) -> Result<Vec<Notification>, DbError>;
    async fn create_notification_rule(
        &self,
        rule: &NewNotificationRule,
    ) -> Result<NotificationRule, DbError>;
    async fn get_notification_rules(
        &self,
        app_id: &str,
    ) -> Result<Vec<NotificationRule>, DbError>;

    // Lookup helpers
    async fn get_app_by_repo(&self, repo_url: &str) -> Result<Option<App>, DbError>;
    async fn get_environment_by_branch(
        &self,
        app_id: &str,
        branch: &str,
    ) -> Result<Option<Environment>, DbError>;

    // Deploy extras
    async fn update_deploy_container_id(
        &self,
        deploy_id: &str,
        container_id: &str,
    ) -> Result<(), DbError>;
    async fn update_deploy_image_ref(
        &self,
        deploy_id: &str,
        image_ref: &str,
    ) -> Result<(), DbError>;

    // Sessions
    async fn create_session(&self, user_id: &str, expires_at: &str) -> Result<Session, DbError>;
    async fn get_session(&self, session_id: &str) -> Result<Option<Session>, DbError>;
    async fn delete_session(&self, session_id: &str) -> Result<(), DbError>;
    async fn delete_user_sessions(&self, user_id: &str) -> Result<(), DbError>;

    // API Tokens
    async fn create_api_token(&self, user_id: &str, name: &str, token_hash: &str, expires_at: Option<&str>) -> Result<ApiToken, DbError>;
    async fn get_api_token_by_hash(&self, token_hash: &str) -> Result<Option<ApiToken>, DbError>;
    async fn list_api_tokens(&self, user_id: &str) -> Result<Vec<ApiToken>, DbError>;
    async fn delete_api_token(&self, id: &str) -> Result<(), DbError>;
    async fn update_token_last_used(&self, id: &str) -> Result<(), DbError>;

    // Invitations
    async fn create_invitation(&self, email: &str, role: &str, token: &str, expires_at: &str) -> Result<Invitation, DbError>;
    async fn get_invitation_by_token(&self, token: &str) -> Result<Option<Invitation>, DbError>;
    async fn delete_invitation(&self, id: &str) -> Result<(), DbError>;

    // Env var extras
    async fn delete_env_vars_by_environment(
        &self,
        environment_id: &str,
    ) -> Result<(), DbError>;

    // Onboarding
    async fn get_onboarding(&self) -> Result<Option<(String, String, String, Option<String>)>, DbError>;
    async fn create_onboarding(&self, started_at: &str) -> Result<(), DbError>;
    async fn update_onboarding_state(&self, current_step: &str, completed_steps: &str, completed_at: Option<&str>) -> Result<(), DbError>;

    // Migrations
    async fn run_migrations(&self) -> Result<(), DbError>;
}
