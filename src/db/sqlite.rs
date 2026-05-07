use std::sync::Arc;

use async_trait::async_trait;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};

use crate::db::encryption::Encryptor;
use crate::db::models::*;
use crate::db::{Database, DbError};

pub struct SqliteDatabase {
    pool: SqlitePool,
    encryptor: Arc<Encryptor>,
}

impl SqliteDatabase {
    pub async fn connect(database_url: &str, encryptor: Arc<Encryptor>) -> Result<Self, DbError> {
        let options: SqliteConnectOptions = database_url
            .parse::<SqliteConnectOptions>()
            .map_err(|e| sqlx::Error::Configuration(Box::new(e)))?
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        Ok(Self { pool, encryptor })
    }

    #[cfg(test)]
    pub fn new_with_pool(pool: SqlitePool, encryptor: Arc<Encryptor>) -> Self {
        Self { pool, encryptor }
    }
}

#[async_trait]
impl Database for SqliteDatabase {
    // --- Apps ---

    async fn create_app(&self, app: &NewApp) -> Result<App, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO apps (id, name, git_repo, git_branch, framework, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&app.name)
        .bind(&app.git_repo)
        .bind(&app.git_branch)
        .bind(&app.framework)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(ref db_err) if db_err.message().contains("UNIQUE") => {
                DbError::Duplicate(format!("app '{}' already exists", app.name))
            }
            other => DbError::Sqlx(other),
        })?;

        self.get_app(&id)
            .await?
            .ok_or_else(|| DbError::NotFound(id))
    }

    async fn get_app(&self, id: &str) -> Result<Option<App>, DbError> {
        let app = sqlx::query_as::<_, App>("SELECT * FROM apps WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(app)
    }

    async fn get_app_by_name(&self, name: &str) -> Result<Option<App>, DbError> {
        let app = sqlx::query_as::<_, App>("SELECT * FROM apps WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;
        Ok(app)
    }

    async fn list_apps(&self) -> Result<Vec<App>, DbError> {
        let apps = sqlx::query_as::<_, App>("SELECT * FROM apps ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;
        Ok(apps)
    }

    async fn update_app(&self, id: &str, update: &UpdateApp) -> Result<App, DbError> {
        let existing = self
            .get_app(id)
            .await?
            .ok_or_else(|| DbError::NotFound(format!("app {id}")))?;

        let name = update.name.as_deref().unwrap_or(&existing.name);
        let git_repo = update.git_repo.as_deref().or(existing.git_repo.as_deref());
        let git_branch = update.git_branch.as_deref().unwrap_or(&existing.git_branch);
        let framework = update.framework.as_deref().or(existing.framework.as_deref());
        let build_config = update
            .build_config
            .as_deref()
            .or(existing.build_config.as_deref());
        let resource_limits = update
            .resource_limits
            .as_deref()
            .or(existing.resource_limits.as_deref());
        let preview_enabled = update.preview_enabled.unwrap_or(existing.preview_enabled);
        let preview_branch_pattern = match &update.preview_branch_pattern {
            Some(v) => v.as_deref(),
            None => existing.preview_branch_pattern.as_deref(),
        };
        let now = now_iso8601();

        sqlx::query(
            "UPDATE apps SET name = ?, git_repo = ?, git_branch = ?, framework = ?,
             build_config = ?, resource_limits = ?, preview_enabled = ?,
             preview_branch_pattern = ?, updated_at = ? WHERE id = ?",
        )
        .bind(name)
        .bind(git_repo)
        .bind(git_branch)
        .bind(framework)
        .bind(build_config)
        .bind(resource_limits)
        .bind(preview_enabled)
        .bind(preview_branch_pattern)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_app(id)
            .await?
            .ok_or_else(|| DbError::NotFound(id.to_string()))
    }

    async fn delete_app(&self, id: &str) -> Result<(), DbError> {
        let result = sqlx::query("DELETE FROM apps WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!("app {id}")));
        }
        Ok(())
    }

    // --- Environments ---

    async fn create_environment(&self, env: &NewEnvironment) -> Result<Environment, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO environments (id, app_id, name, env_type, branch, created_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&env.app_id)
        .bind(&env.name)
        .bind(&env.env_type)
        .bind(&env.branch)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(Environment {
            id,
            app_id: env.app_id.clone(),
            name: env.name.clone(),
            env_type: env.env_type.clone(),
            branch: env.branch.clone(),
            created_at: now,
        })
    }

    async fn list_environments(&self, app_id: &str) -> Result<Vec<Environment>, DbError> {
        let envs = sqlx::query_as::<_, Environment>(
            "SELECT * FROM environments WHERE app_id = ? ORDER BY created_at",
        )
        .bind(app_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(envs)
    }

    async fn delete_environment(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM environments WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Env Vars (encrypted) ---

    async fn set_env_var(&self, env_var: &NewEnvVar) -> Result<EnvVar, DbError> {
        let id = new_id();
        let now = now_iso8601();
        let encrypted_value = self.encryptor.encrypt(env_var.value.as_bytes())?;

        sqlx::query(
            "INSERT INTO env_vars (id, environment_id, key, value_encrypted, scope, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(environment_id, key, scope) DO UPDATE SET value_encrypted = excluded.value_encrypted",
        )
        .bind(&id)
        .bind(&env_var.environment_id)
        .bind(&env_var.key)
        .bind(&encrypted_value)
        .bind(&env_var.scope)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(EnvVar {
            id,
            environment_id: env_var.environment_id.clone(),
            key: env_var.key.clone(),
            value: env_var.value.clone(),
            scope: env_var.scope.clone(),
            created_at: now,
        })
    }

    async fn get_env_vars(&self, environment_id: &str) -> Result<Vec<EnvVar>, DbError> {
        let rows = sqlx::query(
            "SELECT id, environment_id, key, value_encrypted, scope, created_at
             FROM env_vars WHERE environment_id = ? ORDER BY key",
        )
        .bind(environment_id)
        .fetch_all(&self.pool)
        .await?;

        let mut env_vars = Vec::with_capacity(rows.len());
        for row in rows {
            let encrypted: Vec<u8> = row.get("value_encrypted");
            let decrypted = self.encryptor.decrypt(&encrypted)?;
            let value = String::from_utf8(decrypted).unwrap_or_default();

            env_vars.push(EnvVar {
                id: row.get("id"),
                environment_id: row.get("environment_id"),
                key: row.get("key"),
                value,
                scope: row.get("scope"),
                created_at: row.get("created_at"),
            });
        }
        Ok(env_vars)
    }

    async fn delete_env_var(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM env_vars WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Deploys ---

    async fn create_deploy(&self, deploy: &NewDeploy) -> Result<Deploy, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO deploys (id, app_id, environment_id, status, git_sha, started_at, created_at)
             VALUES (?, ?, ?, 'pending', ?, ?, ?)",
        )
        .bind(&id)
        .bind(&deploy.app_id)
        .bind(&deploy.environment_id)
        .bind(&deploy.git_sha)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_deploy(&id)
            .await?
            .ok_or_else(|| DbError::NotFound(id))
    }

    async fn get_deploy(&self, id: &str) -> Result<Option<Deploy>, DbError> {
        let deploy = sqlx::query_as::<_, Deploy>("SELECT * FROM deploys WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(deploy)
    }

    async fn list_deploys(&self, app_id: &str, limit: i64) -> Result<Vec<Deploy>, DbError> {
        let deploys = sqlx::query_as::<_, Deploy>(
            "SELECT * FROM deploys WHERE app_id = ? ORDER BY created_at DESC LIMIT ?",
        )
        .bind(app_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        Ok(deploys)
    }

    async fn update_deploy_status(
        &self,
        id: &str,
        status: &str,
        log: Option<&str>,
    ) -> Result<(), DbError> {
        let now = now_iso8601();

        sqlx::query(
            "UPDATE deploys SET status = ?, build_log = COALESCE(?, build_log), finished_at = ? WHERE id = ?",
        )
        .bind(status)
        .bind(log)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // --- Managed Databases ---

    async fn create_managed_db(
        &self,
        db: &NewManagedDatabase,
    ) -> Result<ManagedDatabase, DbError> {
        let id = new_id();
        let now = now_iso8601();
        let empty_creds = self.encryptor.encrypt(b"{}")?;

        sqlx::query(
            "INSERT INTO databases (id, name, db_type, credentials_encrypted, app_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&db.name)
        .bind(&db.db_type)
        .bind(&empty_creds)
        .bind(&db.app_id)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(ManagedDatabase {
            id,
            name: db.name.clone(),
            db_type: db.db_type.clone(),
            container_id: None,
            credentials: "{}".to_string(),
            backup_schedule: None,
            app_id: db.app_id.clone(),
            created_at: now,
        })
    }

    async fn list_managed_dbs(&self) -> Result<Vec<ManagedDatabase>, DbError> {
        let rows = sqlx::query(
            "SELECT id, name, db_type, container_id, credentials_encrypted, backup_schedule, app_id, created_at
             FROM databases ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        let mut dbs = Vec::with_capacity(rows.len());
        for row in rows {
            let encrypted: Vec<u8> = row.get("credentials_encrypted");
            let decrypted = self.encryptor.decrypt(&encrypted)?;
            let credentials = String::from_utf8(decrypted).unwrap_or_default();

            dbs.push(ManagedDatabase {
                id: row.get("id"),
                name: row.get("name"),
                db_type: row.get("db_type"),
                container_id: row.get("container_id"),
                credentials,
                backup_schedule: row.get("backup_schedule"),
                app_id: row.get("app_id"),
                created_at: row.get("created_at"),
            });
        }
        Ok(dbs)
    }

    async fn delete_managed_db(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM databases WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Domains ---

    async fn add_domain(&self, domain: &NewDomain) -> Result<Domain, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO domains (id, app_id, domain, verified, ssl_status, created_at)
             VALUES (?, ?, ?, FALSE, 'pending', ?)",
        )
        .bind(&id)
        .bind(&domain.app_id)
        .bind(&domain.domain)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(Domain {
            id,
            app_id: domain.app_id.clone(),
            domain: domain.domain.clone(),
            verified: false,
            ssl_status: "pending".to_string(),
            created_at: now,
        })
    }

    async fn list_domains(&self, app_id: &str) -> Result<Vec<Domain>, DbError> {
        let domains = sqlx::query_as::<_, Domain>(
            "SELECT * FROM domains WHERE app_id = ? ORDER BY created_at",
        )
        .bind(app_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(domains)
    }

    async fn update_domain_status(
        &self,
        id: &str,
        verified: bool,
        ssl_status: &str,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE domains SET verified = ?, ssl_status = ? WHERE id = ?")
            .bind(verified)
            .bind(ssl_status)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn delete_domain(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM domains WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Users ---

    async fn create_user(&self, user: &NewUser) -> Result<User, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&user.email)
        .bind(&user.password_hash)
        .bind(&user.role)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(ref db_err) if db_err.message().contains("UNIQUE") => {
                DbError::Duplicate(format!("user '{}' already exists", user.email))
            }
            other => DbError::Sqlx(other),
        })?;

        Ok(User {
            id,
            email: user.email.clone(),
            password_hash: user.password_hash.clone(),
            role: user.role.clone(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, DbError> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = ?")
            .bind(email)
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }

    async fn list_users(&self) -> Result<Vec<User>, DbError> {
        let users = sqlx::query_as::<_, User>("SELECT * FROM users ORDER BY created_at")
            .fetch_all(&self.pool)
            .await?;
        Ok(users)
    }

    // --- Health Checks ---

    async fn create_health_check(&self, hc: &NewHealthCheck) -> Result<HealthCheck, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO health_checks (id, app_id, check_type, config, interval_secs, failure_threshold, auto_restart, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&hc.app_id)
        .bind(&hc.check_type)
        .bind(&hc.config)
        .bind(hc.interval_secs)
        .bind(hc.failure_threshold)
        .bind(hc.auto_restart)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(HealthCheck {
            id,
            app_id: hc.app_id.clone(),
            check_type: hc.check_type.clone(),
            config: hc.config.clone(),
            interval_secs: hc.interval_secs,
            failure_threshold: hc.failure_threshold,
            auto_restart: hc.auto_restart,
            created_at: now,
        })
    }

    async fn get_health_checks(&self, app_id: &str) -> Result<Vec<HealthCheck>, DbError> {
        let checks = sqlx::query_as::<_, HealthCheck>(
            "SELECT * FROM health_checks WHERE app_id = ? ORDER BY created_at",
        )
        .bind(app_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(checks)
    }

    async fn record_health_event(&self, event: &NewHealthCheckEvent) -> Result<(), DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO health_check_events (id, health_check_id, status, checked_at)
             VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&event.health_check_id)
        .bind(&event.status)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_health_events(
        &self,
        health_check_id: &str,
        limit: i64,
    ) -> Result<Vec<HealthCheckEvent>, DbError> {
        let events = sqlx::query_as::<_, HealthCheckEvent>(
            "SELECT * FROM health_check_events WHERE health_check_id = ? ORDER BY checked_at DESC LIMIT ?",
        )
        .bind(health_check_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        Ok(events)
    }

    // --- Notifications ---

    async fn create_notification_channel(
        &self,
        channel: &NewNotification,
    ) -> Result<Notification, DbError> {
        let id = new_id();
        let now = now_iso8601();
        let encrypted_config = self.encryptor.encrypt(channel.config.as_bytes())?;

        sqlx::query(
            "INSERT INTO notifications (id, channel_type, config_encrypted, created_at)
             VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&channel.channel_type)
        .bind(&encrypted_config)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(Notification {
            id,
            channel_type: channel.channel_type.clone(),
            config: channel.config.clone(),
            created_at: now,
        })
    }

    async fn list_notification_channels(&self) -> Result<Vec<Notification>, DbError> {
        let rows = sqlx::query(
            "SELECT id, channel_type, config_encrypted, created_at FROM notifications ORDER BY created_at",
        )
        .fetch_all(&self.pool)
        .await?;

        let mut channels = Vec::with_capacity(rows.len());
        for row in rows {
            let encrypted: Vec<u8> = row.get("config_encrypted");
            let decrypted = self.encryptor.decrypt(&encrypted)?;
            let config = String::from_utf8(decrypted).unwrap_or_default();

            channels.push(Notification {
                id: row.get("id"),
                channel_type: row.get("channel_type"),
                config,
                created_at: row.get("created_at"),
            });
        }
        Ok(channels)
    }

    async fn create_notification_rule(
        &self,
        rule: &NewNotificationRule,
    ) -> Result<NotificationRule, DbError> {
        let id = new_id();

        sqlx::query(
            "INSERT INTO notification_rules (id, app_id, notification_id, event_type)
             VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&rule.app_id)
        .bind(&rule.notification_id)
        .bind(&rule.event_type)
        .execute(&self.pool)
        .await?;

        Ok(NotificationRule {
            id,
            app_id: rule.app_id.clone(),
            notification_id: rule.notification_id.clone(),
            event_type: rule.event_type.clone(),
        })
    }

    async fn get_notification_rules(
        &self,
        app_id: &str,
    ) -> Result<Vec<NotificationRule>, DbError> {
        let rules = sqlx::query_as::<_, NotificationRule>(
            "SELECT * FROM notification_rules WHERE app_id = ? ORDER BY event_type",
        )
        .bind(app_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rules)
    }

    // --- Migrations ---

    async fn run_migrations(&self) -> Result<(), DbError> {
        sqlx::migrate!("src/db/migrations")
            .run(&self.pool)
            .await?;
        Ok(())
    }
}
