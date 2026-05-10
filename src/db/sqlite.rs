use std::sync::Arc;

use async_trait::async_trait;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};

use crate::db::encryption::Encryptor;
use crate::db::models::*;
use crate::db::{Database, DbError};

fn normalize_repo_url(url: &str) -> String {
    url.trim()
        .trim_end_matches('/')
        .trim_end_matches(".git")
        .replace("https://", "")
        .replace("http://", "")
        .replace("git@", "")
        .replace(':', "/")
        .to_lowercase()
}

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
    // --- Projects ---

    async fn list_projects(&self) -> Result<Vec<Project>, DbError> {
        let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY name ASC")
            .fetch_all(&self.pool)
            .await?;
        Ok(projects)
    }

    async fn create_project(&self, project: &NewProject) -> Result<Project, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO projects (id, name, description, color, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&project.name)
        .bind(&project.description)
        .bind(&project.color)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(ref db_err) if db_err.message().contains("UNIQUE") => {
                DbError::Duplicate(format!("project '{}' already exists", project.name))
            }
            other => DbError::Sqlx(other),
        })?;

        self.get_project(&id)
            .await?
            .ok_or_else(|| DbError::NotFound(id))
    }

    async fn get_project(&self, id: &str) -> Result<Option<Project>, DbError> {
        let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(project)
    }

    async fn update_project(&self, id: &str, update: &UpdateProject) -> Result<Project, DbError> {
        let existing = self
            .get_project(id)
            .await?
            .ok_or_else(|| DbError::NotFound(format!("project {id}")))?;

        let name = update.name.as_deref().unwrap_or(&existing.name);
        let description = match &update.description {
            Some(v) => v.as_deref(),
            None => existing.description.as_deref(),
        };
        let color = match &update.color {
            Some(v) => v.as_deref(),
            None => existing.color.as_deref(),
        };
        let now = now_iso8601();

        sqlx::query(
            "UPDATE projects SET name = ?, description = ?, color = ?, updated_at = ? WHERE id = ?",
        )
        .bind(name)
        .bind(description)
        .bind(color)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_project(id)
            .await?
            .ok_or_else(|| DbError::NotFound(id.to_string()))
    }

    async fn delete_project(&self, id: &str) -> Result<(), DbError> {
        // Unassign all apps and databases from this project (don't delete them)
        sqlx::query("UPDATE apps SET project_id = NULL WHERE project_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        sqlx::query("UPDATE databases SET project_id = NULL WHERE project_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        let result = sqlx::query("DELETE FROM projects WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!("project {id}")));
        }
        Ok(())
    }

    // --- Apps ---

    async fn create_app(&self, app: &NewApp) -> Result<App, DbError> {
        let id = new_id();
        let now = now_iso8601();
        let deploy_mode = app.deploy_mode.as_deref().unwrap_or("auto");

        sqlx::query(
            "INSERT INTO apps (id, name, git_repo, git_branch, framework, image_ref, compose_content, deploy_mode, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&app.name)
        .bind(&app.git_repo)
        .bind(&app.git_branch)
        .bind(&app.framework)
        .bind(&app.image_ref)
        .bind(&app.compose_content)
        .bind(deploy_mode)
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

    async fn list_apps_by_project(&self, project_id: &str) -> Result<Vec<App>, DbError> {
        let apps = sqlx::query_as::<_, App>(
            "SELECT * FROM apps WHERE project_id = ? ORDER BY created_at DESC",
        )
        .bind(project_id)
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
        let framework = update
            .framework
            .as_deref()
            .or(existing.framework.as_deref());
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
        let tags = update.tags.as_deref().or(existing.tags.as_deref());
        let volumes = update.volumes.as_deref().or(existing.volumes.as_deref());
        let image_ref = match &update.image_ref {
            Some(v) => v.as_deref(),
            None => existing.image_ref.as_deref(),
        };
        let compose_content = match &update.compose_content {
            Some(v) => v.as_deref(),
            None => existing.compose_content.as_deref(),
        };
        let project_id = match &update.project_id {
            Some(v) => v.as_deref(),
            None => existing.project_id.as_deref(),
        };
        let deploy_mode = update
            .deploy_mode
            .as_deref()
            .unwrap_or(&existing.deploy_mode);
        let now = now_iso8601();

        sqlx::query(
            "UPDATE apps SET name = ?, git_repo = ?, git_branch = ?, framework = ?,
             build_config = ?, resource_limits = ?, preview_enabled = ?,
             preview_branch_pattern = ?, tags = ?, volumes = ?, image_ref = ?, compose_content = ?, project_id = ?, deploy_mode = ?, updated_at = ? WHERE id = ?",
        )
        .bind(name)
        .bind(git_repo)
        .bind(git_branch)
        .bind(framework)
        .bind(build_config)
        .bind(resource_limits)
        .bind(preview_enabled)
        .bind(preview_branch_pattern)
        .bind(tags)
        .bind(volumes)
        .bind(image_ref)
        .bind(compose_content)
        .bind(project_id)
        .bind(deploy_mode)
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

    async fn create_managed_db(&self, db: &NewManagedDatabase) -> Result<ManagedDatabase, DbError> {
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
            project_id: None,
            created_at: now,
        })
    }

    async fn update_managed_db_credentials(
        &self,
        id: &str,
        credentials_json: &str,
        container_id: &str,
    ) -> Result<(), DbError> {
        let encrypted = self.encryptor.encrypt(credentials_json.as_bytes())?;
        sqlx::query(
            "UPDATE databases SET credentials_encrypted = ?, container_id = ? WHERE id = ?",
        )
        .bind(&encrypted)
        .bind(container_id)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn list_managed_dbs(&self) -> Result<Vec<ManagedDatabase>, DbError> {
        let rows = sqlx::query(
            "SELECT id, name, db_type, container_id, credentials_encrypted, backup_schedule, app_id, project_id, created_at
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
                project_id: row.get("project_id"),
                created_at: row.get("created_at"),
            });
        }
        Ok(dbs)
    }

    async fn list_managed_dbs_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<ManagedDatabase>, DbError> {
        let rows = sqlx::query(
            "SELECT id, name, db_type, container_id, credentials_encrypted, backup_schedule, app_id, project_id, created_at
             FROM databases WHERE project_id = ? ORDER BY created_at DESC",
        )
        .bind(project_id)
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
                project_id: row.get("project_id"),
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
            "INSERT INTO domains (id, app_id, domain, path, verified, ssl_status, created_at)
             VALUES (?, ?, ?, ?, FALSE, 'pending', ?)",
        )
        .bind(&id)
        .bind(&domain.app_id)
        .bind(&domain.domain)
        .bind(&domain.path)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(Domain {
            id,
            app_id: domain.app_id.clone(),
            domain: domain.domain.clone(),
            path: domain.path.clone(),
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
            totp_secret: None,
            totp_enabled: false,
            totp_backup_codes: None,
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

    async fn get_user_by_id(&self, id: &str) -> Result<Option<User>, DbError> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }

    async fn update_user_totp_secret(
        &self,
        user_id: &str,
        secret: Option<&str>,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?")
            .bind(secret)
            .bind(now_iso8601())
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn enable_user_totp(&self, user_id: &str, backup_codes: &str) -> Result<(), DbError> {
        sqlx::query(
            "UPDATE users SET totp_enabled = 1, totp_backup_codes = ?, updated_at = ? WHERE id = ?",
        )
        .bind(backup_codes)
        .bind(now_iso8601())
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn disable_user_totp(&self, user_id: &str) -> Result<(), DbError> {
        sqlx::query("UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL, updated_at = ? WHERE id = ?")
            .bind(now_iso8601())
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update_user_backup_codes(
        &self,
        user_id: &str,
        backup_codes: &str,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE users SET totp_backup_codes = ?, updated_at = ? WHERE id = ?")
            .bind(backup_codes)
            .bind(now_iso8601())
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn list_users(&self) -> Result<Vec<User>, DbError> {
        let users = sqlx::query_as::<_, User>("SELECT * FROM users ORDER BY created_at")
            .fetch_all(&self.pool)
            .await?;
        Ok(users)
    }

    // --- User Profile Updates ---

    async fn update_user_password(
        &self,
        user_id: &str,
        password_hash: &str,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
            .bind(password_hash)
            .bind(now_iso8601())
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update_user_email(&self, user_id: &str, email: &str) -> Result<(), DbError> {
        sqlx::query("UPDATE users SET email = ?, updated_at = ? WHERE id = ?")
            .bind(email)
            .bind(now_iso8601())
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| match e {
                sqlx::Error::Database(ref db_err) if db_err.message().contains("UNIQUE") => {
                    DbError::Duplicate(format!("email '{}' is already in use", email))
                }
                other => DbError::Sqlx(other),
            })?;
        Ok(())
    }

    // --- Server Metrics ---

    async fn insert_server_metric(
        &self,
        snapshot: &crate::api::routes::server::ServerMetricsSnapshot,
    ) -> Result<(), DbError> {
        let id = new_id();
        sqlx::query(
            "INSERT INTO server_metrics (id, timestamp, cpu_percent, memory_used_bytes, memory_total_bytes, disk_used_bytes, disk_total_bytes)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&snapshot.timestamp)
        .bind(snapshot.cpu_percent as f64)
        .bind(snapshot.memory_used_bytes as i64)
        .bind(snapshot.memory_total_bytes as i64)
        .bind(snapshot.disk_used_bytes as i64)
        .bind(snapshot.disk_total_bytes as i64)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn query_server_metrics(
        &self,
        from: &str,
        to: &str,
        limit: usize,
    ) -> Result<Vec<crate::api::routes::server::ServerMetricsSnapshot>, DbError> {
        let rows = sqlx::query(
            "SELECT timestamp, cpu_percent, memory_used_bytes, memory_total_bytes, disk_used_bytes, disk_total_bytes
             FROM server_metrics
             WHERE timestamp >= ? AND timestamp <= ?
             ORDER BY timestamp ASC
             LIMIT ?",
        )
        .bind(from)
        .bind(to)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .iter()
            .map(|row| {
                use sqlx::Row;
                crate::api::routes::server::ServerMetricsSnapshot {
                    timestamp: row.get("timestamp"),
                    cpu_percent: row.get::<f64, _>("cpu_percent") as f32,
                    memory_used_bytes: row.get::<i64, _>("memory_used_bytes") as u64,
                    memory_total_bytes: row.get::<i64, _>("memory_total_bytes") as u64,
                    disk_used_bytes: row.get::<i64, _>("disk_used_bytes") as u64,
                    disk_total_bytes: row.get::<i64, _>("disk_total_bytes") as u64,
                }
            })
            .collect())
    }

    async fn prune_server_metrics(&self, older_than: &str) -> Result<u64, DbError> {
        let result = sqlx::query("DELETE FROM server_metrics WHERE timestamp < ?")
            .bind(older_than)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
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

    async fn get_notification_rules(&self, app_id: &str) -> Result<Vec<NotificationRule>, DbError> {
        let rules = sqlx::query_as::<_, NotificationRule>(
            "SELECT * FROM notification_rules WHERE app_id = ? ORDER BY event_type",
        )
        .bind(app_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rules)
    }

    // --- Lookup helpers ---

    async fn get_app_by_repo(&self, repo_url: &str) -> Result<Option<App>, DbError> {
        let apps = self.list_apps().await?;
        let normalized = normalize_repo_url(repo_url);
        Ok(apps
            .into_iter()
            .find(|a| a.git_repo.as_deref().map(normalize_repo_url) == Some(normalized.clone())))
    }

    async fn get_environment_by_branch(
        &self,
        app_id: &str,
        branch: &str,
    ) -> Result<Option<Environment>, DbError> {
        let env = sqlx::query_as::<_, Environment>(
            "SELECT * FROM environments WHERE app_id = ? AND branch = ?",
        )
        .bind(app_id)
        .bind(branch)
        .fetch_optional(&self.pool)
        .await?;
        Ok(env)
    }

    // --- Deploy extras ---

    async fn update_deploy_container_id(
        &self,
        deploy_id: &str,
        container_id: &str,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE deploys SET container_id = ? WHERE id = ?")
            .bind(container_id)
            .bind(deploy_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update_deploy_image_ref(
        &self,
        deploy_id: &str,
        image_ref: &str,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE deploys SET image_ref = ? WHERE id = ?")
            .bind(image_ref)
            .bind(deploy_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update_deploy_env_snapshot(
        &self,
        deploy_id: &str,
        env_snapshot: &str,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE deploys SET env_snapshot = ? WHERE id = ?")
            .bind(env_snapshot)
            .bind(deploy_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Env var extras ---

    async fn delete_env_vars_by_environment(&self, environment_id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM env_vars WHERE environment_id = ?")
            .bind(environment_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Sessions ---

    async fn create_session(&self, user_id: &str, expires_at: &str) -> Result<Session, DbError> {
        let id = new_id();
        let now = now_iso8601();
        sqlx::query(
            "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(user_id)
        .bind(expires_at)
        .bind(&now)
        .execute(&self.pool)
        .await?;
        Ok(Session {
            id,
            user_id: user_id.to_string(),
            expires_at: expires_at.to_string(),
            created_at: now,
        })
    }

    async fn get_session(&self, session_id: &str) -> Result<Option<Session>, DbError> {
        Ok(
            sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
                .bind(session_id)
                .fetch_optional(&self.pool)
                .await?,
        )
    }

    async fn delete_session(&self, session_id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM sessions WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn delete_user_sessions(&self, user_id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM sessions WHERE user_id = ?")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn list_user_sessions(&self, user_id: &str) -> Result<Vec<Session>, DbError> {
        Ok(sqlx::query_as::<_, Session>(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?)
    }

    async fn delete_user_sessions_except(
        &self,
        user_id: &str,
        keep_session_id: &str,
    ) -> Result<(), DbError> {
        sqlx::query("DELETE FROM sessions WHERE user_id = ? AND id != ?")
            .bind(user_id)
            .bind(keep_session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- API Tokens ---

    async fn create_api_token(
        &self,
        user_id: &str,
        name: &str,
        token_hash: &str,
        expires_at: Option<&str>,
    ) -> Result<ApiToken, DbError> {
        let id = new_id();
        let now = now_iso8601();
        sqlx::query("INSERT INTO api_tokens (id, user_id, name, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&id).bind(user_id).bind(name).bind(token_hash).bind(expires_at).bind(&now)
            .execute(&self.pool).await?;
        Ok(ApiToken {
            id,
            user_id: user_id.to_string(),
            name: name.to_string(),
            token_hash: token_hash.to_string(),
            last_used_at: None,
            expires_at: expires_at.map(String::from),
            created_at: now,
        })
    }

    async fn get_api_token_by_hash(&self, token_hash: &str) -> Result<Option<ApiToken>, DbError> {
        Ok(
            sqlx::query_as::<_, ApiToken>("SELECT * FROM api_tokens WHERE token_hash = ?")
                .bind(token_hash)
                .fetch_optional(&self.pool)
                .await?,
        )
    }

    async fn list_api_tokens(&self, user_id: &str) -> Result<Vec<ApiToken>, DbError> {
        Ok(sqlx::query_as::<_, ApiToken>(
            "SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?)
    }

    async fn delete_api_token(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM api_tokens WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update_token_last_used(&self, id: &str) -> Result<(), DbError> {
        let now = now_iso8601();
        sqlx::query("UPDATE api_tokens SET last_used_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Invitations ---

    async fn create_invitation(
        &self,
        email: &str,
        role: &str,
        token: &str,
        expires_at: &str,
    ) -> Result<Invitation, DbError> {
        let id = new_id();
        let now = now_iso8601();
        sqlx::query("INSERT INTO invitations (id, email, role, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&id).bind(email).bind(role).bind(token).bind(expires_at).bind(&now)
            .execute(&self.pool).await?;
        Ok(Invitation {
            id,
            email: email.to_string(),
            role: role.to_string(),
            token: token.to_string(),
            expires_at: expires_at.to_string(),
            created_at: now,
        })
    }

    async fn get_invitation_by_token(&self, token: &str) -> Result<Option<Invitation>, DbError> {
        Ok(
            sqlx::query_as::<_, Invitation>("SELECT * FROM invitations WHERE token = ?")
                .bind(token)
                .fetch_optional(&self.pool)
                .await?,
        )
    }

    async fn delete_invitation(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM invitations WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Onboarding ---

    async fn get_onboarding(
        &self,
    ) -> Result<Option<(String, String, String, Option<String>)>, DbError> {
        let row = sqlx::query_as::<_, (String, String, String, Option<String>)>(
            "SELECT current_step, completed_steps, started_at, completed_at FROM onboarding WHERE id = 'singleton'",
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    async fn create_onboarding(&self, started_at: &str) -> Result<(), DbError> {
        sqlx::query("INSERT OR IGNORE INTO onboarding (id, current_step, completed_steps, started_at) VALUES ('singleton', 'admin_account', '[]', ?)")
            .bind(started_at)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn update_onboarding_state(
        &self,
        current_step: &str,
        completed_steps: &str,
        completed_at: Option<&str>,
    ) -> Result<(), DbError> {
        sqlx::query("UPDATE onboarding SET current_step = ?, completed_steps = ?, completed_at = ? WHERE id = 'singleton'")
            .bind(current_step)
            .bind(completed_steps)
            .bind(completed_at)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- Instance Backup ---

    async fn get_instance_backup_config(&self) -> Result<Option<InstanceBackupConfig>, DbError> {
        let config = sqlx::query_as::<_, InstanceBackupConfig>(
            "SELECT * FROM instance_backup_config WHERE id = 'singleton'",
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(config)
    }

    async fn upsert_instance_backup_config(
        &self,
        enabled: bool,
        cron_schedule: &str,
        retention_count: i64,
    ) -> Result<InstanceBackupConfig, DbError> {
        let now = now_iso8601();
        sqlx::query(
            "INSERT INTO instance_backup_config (id, enabled, cron_schedule, retention_count, updated_at)
             VALUES ('singleton', ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, cron_schedule = excluded.cron_schedule, retention_count = excluded.retention_count, updated_at = excluded.updated_at",
        )
        .bind(enabled)
        .bind(cron_schedule)
        .bind(retention_count)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_instance_backup_config()
            .await?
            .ok_or_else(|| DbError::NotFound("instance_backup_config".to_string()))
    }

    async fn create_instance_backup_record(
        &self,
        filename: &str,
        s3_key: Option<&str>,
    ) -> Result<InstanceBackupRecord, DbError> {
        let id = new_id();
        let now = now_iso8601();
        sqlx::query(
            "INSERT INTO instance_backup_history (id, filename, size_bytes, status, s3_key, started_at)
             VALUES (?, ?, 0, 'running', ?, ?)",
        )
        .bind(&id)
        .bind(filename)
        .bind(s3_key)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(InstanceBackupRecord {
            id,
            filename: filename.to_string(),
            size_bytes: 0,
            status: "running".to_string(),
            error_message: None,
            s3_key: s3_key.map(String::from),
            started_at: now,
            finished_at: None,
        })
    }

    async fn update_instance_backup_record(
        &self,
        id: &str,
        status: &str,
        size_bytes: i64,
        error_message: Option<&str>,
    ) -> Result<(), DbError> {
        let now = now_iso8601();
        sqlx::query(
            "UPDATE instance_backup_history SET status = ?, size_bytes = ?, error_message = ?, finished_at = ? WHERE id = ?",
        )
        .bind(status)
        .bind(size_bytes)
        .bind(error_message)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn list_instance_backup_history(
        &self,
        limit: i64,
    ) -> Result<Vec<InstanceBackupRecord>, DbError> {
        let records = sqlx::query_as::<_, InstanceBackupRecord>(
            "SELECT * FROM instance_backup_history ORDER BY started_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        Ok(records)
    }

    async fn delete_instance_backup_record(&self, id: &str) -> Result<(), DbError> {
        sqlx::query("DELETE FROM instance_backup_history WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // --- OAuth Identities ---

    async fn create_oauth_identity(
        &self,
        user_id: &str,
        provider: &str,
        provider_user_id: &str,
        provider_email: Option<&str>,
    ) -> Result<OAuthIdentity, DbError> {
        let id = new_id();
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO oauth_identities (id, user_id, provider, provider_user_id, provider_email, created_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(user_id)
        .bind(provider)
        .bind(provider_user_id)
        .bind(provider_email)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(ref db_err) if db_err.message().contains("UNIQUE") => {
                DbError::Duplicate(format!("OAuth identity for {provider} already linked"))
            }
            other => DbError::Sqlx(other),
        })?;

        Ok(OAuthIdentity {
            id,
            user_id: user_id.to_string(),
            provider: provider.to_string(),
            provider_user_id: provider_user_id.to_string(),
            provider_email: provider_email.map(String::from),
            created_at: now,
        })
    }

    async fn get_oauth_identity(
        &self,
        provider: &str,
        provider_user_id: &str,
    ) -> Result<Option<OAuthIdentity>, DbError> {
        let identity = sqlx::query_as::<_, OAuthIdentity>(
            "SELECT * FROM oauth_identities WHERE provider = ? AND provider_user_id = ?",
        )
        .bind(provider)
        .bind(provider_user_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(identity)
    }

    async fn list_oauth_identities_for_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<OAuthIdentity>, DbError> {
        let identities = sqlx::query_as::<_, OAuthIdentity>(
            "SELECT * FROM oauth_identities WHERE user_id = ? ORDER BY created_at",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(identities)
    }

    async fn delete_oauth_identity(&self, id: &str) -> Result<(), DbError> {
        let result = sqlx::query("DELETE FROM oauth_identities WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!("oauth_identity {id}")));
        }
        Ok(())
    }

    // --- OAuth Settings ---

    async fn get_oauth_settings(&self) -> Result<Option<OAuthSettings>, DbError> {
        let row = sqlx::query(
            "SELECT github_client_id, github_client_secret_encrypted, github_enabled,
                    google_client_id, google_client_secret_encrypted, google_enabled
             FROM oauth_settings WHERE id = 'singleton'",
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let github_secret: Option<Vec<u8>> = row.get("github_client_secret_encrypted");
                let google_secret: Option<Vec<u8>> = row.get("google_client_secret_encrypted");

                let github_client_secret = match github_secret {
                    Some(enc) if !enc.is_empty() => {
                        let dec = self.encryptor.decrypt(&enc)?;
                        Some(String::from_utf8(dec).unwrap_or_default())
                    }
                    _ => None,
                };

                let google_client_secret = match google_secret {
                    Some(enc) if !enc.is_empty() => {
                        let dec = self.encryptor.decrypt(&enc)?;
                        Some(String::from_utf8(dec).unwrap_or_default())
                    }
                    _ => None,
                };

                Ok(Some(OAuthSettings {
                    github_client_id: row.get("github_client_id"),
                    github_client_secret,
                    github_enabled: row.get::<bool, _>("github_enabled"),
                    google_client_id: row.get("google_client_id"),
                    google_client_secret,
                    google_enabled: row.get::<bool, _>("google_enabled"),
                }))
            }
            None => Ok(None),
        }
    }

    async fn upsert_oauth_settings(&self, settings: &OAuthSettings) -> Result<(), DbError> {
        let now = now_iso8601();

        let github_secret_enc: Option<Vec<u8>> = match &settings.github_client_secret {
            Some(s) if !s.is_empty() => Some(self.encryptor.encrypt(s.as_bytes())?),
            _ => None,
        };

        let google_secret_enc: Option<Vec<u8>> = match &settings.google_client_secret {
            Some(s) if !s.is_empty() => Some(self.encryptor.encrypt(s.as_bytes())?),
            _ => None,
        };

        sqlx::query(
            "INSERT INTO oauth_settings (id, github_client_id, github_client_secret_encrypted, github_enabled,
                                          google_client_id, google_client_secret_encrypted, google_enabled, updated_at)
             VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                github_client_id = excluded.github_client_id,
                github_client_secret_encrypted = excluded.github_client_secret_encrypted,
                github_enabled = excluded.github_enabled,
                google_client_id = excluded.google_client_id,
                google_client_secret_encrypted = excluded.google_client_secret_encrypted,
                google_enabled = excluded.google_enabled,
                updated_at = excluded.updated_at",
        )
        .bind(&settings.github_client_id)
        .bind(&github_secret_enc)
        .bind(settings.github_enabled)
        .bind(&settings.google_client_id)
        .bind(&google_secret_enc)
        .bind(settings.google_enabled)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // --- Registration Settings ---

    async fn get_registration_settings(&self) -> Result<RegistrationSettings, DbError> {
        let settings = sqlx::query_as::<_, RegistrationSettings>(
            "SELECT * FROM registration_settings WHERE id = 'singleton'",
        )
        .fetch_optional(&self.pool)
        .await?;

        match settings {
            Some(s) => Ok(s),
            None => {
                // Return defaults if no row exists yet
                Ok(RegistrationSettings {
                    id: "singleton".to_string(),
                    allow_registration: false,
                    allowed_domains: None,
                    default_role: "viewer".to_string(),
                    updated_at: now_iso8601(),
                })
            }
        }
    }

    async fn upsert_registration_settings(
        &self,
        allow_registration: bool,
        allowed_domains: Option<&str>,
        default_role: &str,
    ) -> Result<RegistrationSettings, DbError> {
        let now = now_iso8601();

        sqlx::query(
            "INSERT INTO registration_settings (id, allow_registration, allowed_domains, default_role, updated_at)
             VALUES ('singleton', ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                allow_registration = excluded.allow_registration,
                allowed_domains = excluded.allowed_domains,
                default_role = excluded.default_role,
                updated_at = excluded.updated_at",
        )
        .bind(allow_registration)
        .bind(allowed_domains)
        .bind(default_role)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_registration_settings().await
    }

    // --- Admin 2FA reset ---

    async fn admin_reset_user_2fa(&self, user_id: &str) -> Result<(), DbError> {
        let now = now_iso8601();
        let result = sqlx::query(
            "UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(&now)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DbError::NotFound(format!("user {user_id}")));
        }
        Ok(())
    }

    // --- Migrations ---

    async fn run_migrations(&self) -> Result<(), DbError> {
        sqlx::migrate!("src/db/migrations").run(&self.pool).await?;
        Ok(())
    }
}
