use std::collections::HashMap;

use axum::extract::{Path, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::db::models::{NewEnvVar, NewManagedDatabase};
use crate::docker::containers::{ContainerConfig, PortMapping, VolumeMount};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/databases", get(list_databases).post(create_database))
        .route("/databases/{id}", get(get_database).delete(delete_database))
        .route("/databases/{id}/link/{app_id}", post(link_to_app))
        .route("/databases/{id}/link/{app_id}", delete(unlink_from_app))
        .route("/databases/{id}/tables", get(list_tables))
        .route("/databases/{id}/query", post(execute_query))
}

#[derive(Deserialize)]
struct CreateDatabaseRequest {
    name: String,
    db_type: String,
    app_id: Option<String>,
    memory_mb: Option<i64>,
    expose_port: Option<bool>,
}

struct DbTypeConfig {
    image: &'static str,
    port: u16,
    env_vars: fn(&str, &str, &str) -> Vec<String>,
    connection_string: fn(&str, &str, &str, &str) -> String,
    default_memory_mb: i64,
    env_var_name: &'static str,
}

fn db_configs() -> HashMap<&'static str, DbTypeConfig> {
    let mut m = HashMap::new();
    m.insert("postgres", DbTypeConfig {
        image: "postgres:17",
        port: 5432,
        env_vars: |user, pass, db| vec![
            format!("POSTGRES_USER={user}"),
            format!("POSTGRES_PASSWORD={pass}"),
            format!("POSTGRES_DB={db}"),
        ],
        connection_string: |container, _port, user, pass| {
            format!("postgresql://{user}:{pass}@{container}:5432/{user}")
        },
        default_memory_mb: 1024,
        env_var_name: "DATABASE_URL",
    });
    m.insert("mysql", DbTypeConfig {
        image: "mysql:8",
        port: 3306,
        env_vars: |user, pass, db| vec![
            format!("MYSQL_USER={user}"),
            format!("MYSQL_PASSWORD={pass}"),
            format!("MYSQL_DATABASE={db}"),
            format!("MYSQL_ROOT_PASSWORD={pass}"),
        ],
        connection_string: |container, _port, user, pass| {
            format!("mysql://{user}:{pass}@{container}:3306/{user}")
        },
        default_memory_mb: 1024,
        env_var_name: "DATABASE_URL",
    });
    m.insert("redis", DbTypeConfig {
        image: "redis:7",
        port: 6379,
        env_vars: |_user, pass, _db| vec![
            format!("REDIS_PASSWORD={pass}"),
        ],
        connection_string: |container, _port, _user, pass| {
            format!("redis://:{pass}@{container}:6379")
        },
        default_memory_mb: 256,
        env_var_name: "REDIS_URL",
    });
    m.insert("mongo", DbTypeConfig {
        image: "mongo:7",
        port: 27017,
        env_vars: |user, pass, db| vec![
            format!("MONGO_INITDB_ROOT_USERNAME={user}"),
            format!("MONGO_INITDB_ROOT_PASSWORD={pass}"),
            format!("MONGO_INITDB_DATABASE={db}"),
        ],
        connection_string: |container, _port, user, pass| {
            format!("mongodb://{user}:{pass}@{container}:27017/{user}")
        },
        default_memory_mb: 512,
        env_var_name: "MONGODB_URL",
    });
    m
}

fn generate_password() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| {
            let idx = rng.gen_range(0..62);
            
            match idx {
                0..=9 => (b'0' + idx) as char,
                10..=35 => (b'a' + idx - 10) as char,
                _ => (b'A' + idx - 36) as char,
            }
        })
        .collect()
}

async fn list_databases(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let dbs = state.db.list_managed_dbs().await?;
    Ok(Json(serde_json::json!({ "data": dbs })))
}

async fn get_database(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let dbs = state.db.list_managed_dbs().await?;
    let db = dbs
        .iter()
        .find(|d| d.id == id)
        .ok_or_else(|| ApiError::NotFound(format!("database {id}")))?;

    Ok(Json(serde_json::json!({ "data": db })))
}

async fn create_database(
    State(state): State<AppState>,
    Json(body): Json<CreateDatabaseRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let configs = db_configs();
    let type_config = configs
        .get(body.db_type.as_str())
        .ok_or_else(|| {
            ApiError::BadRequest(format!(
                "unsupported database type '{}'. Supported: postgres, mysql, redis, mongo",
                body.db_type
            ))
        })?;

    if body.name.trim().is_empty() {
        return Err(ApiError::BadRequest("database name is required".into()));
    }

    let password = generate_password();
    let db_user = "icefall";
    let container_name = format!("icefall-db-{}", body.name.trim().to_lowercase());
    let volume_name = format!("icefall-db-{}-data", body.name.trim().to_lowercase());
    let env = (type_config.env_vars)(db_user, &password, &body.name);

    let memory_bytes = (body.memory_mb.unwrap_or(type_config.default_memory_mb)) * 1024 * 1024;

    let mut labels = HashMap::new();
    labels.insert("icefall.managed-db".to_string(), "true".to_string());
    labels.insert("icefall.db-name".to_string(), body.name.clone());

    let mut ports = Vec::new();
    if body.expose_port.unwrap_or(false) {
        ports.push(PortMapping {
            container_port: type_config.port,
            host_port: None,
            protocol: "tcp".to_string(),
        });
    }

    let data_path = match body.db_type.as_str() {
        "postgres" => "/var/lib/postgresql/data",
        "mysql" => "/var/lib/mysql",
        "redis" => "/data",
        "mongo" => "/data/db",
        _ => "/data",
    };

    let container_config = ContainerConfig {
        name: container_name.clone(),
        image: type_config.image.to_string(),
        env,
        ports,
        volumes: vec![VolumeMount {
            source: volume_name.clone(),
            target: data_path.to_string(),
            read_only: false,
        }],
        memory_bytes: Some(memory_bytes),
        cpu_shares: None,
        restart_policy: Some("unless-stopped".to_string()),
        labels,
        network: body.app_id.as_ref().map(|_| format!("icefall-{}", body.name)),
    };

    state
        .docker
        .pull_image(type_config.image.split(':').next().unwrap_or(type_config.image), type_config.image.split(':').nth(1).unwrap_or("latest"))
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let container_id = state
        .docker
        .create_container(&container_config)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    state
        .docker
        .start_container(&container_id)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let connection_string =
        (type_config.connection_string)(&container_name, "", db_user, &password);

    let credentials = serde_json::json!({
        "user": db_user,
        "password": password,
        "connection_string": connection_string,
        "host": container_name,
        "port": type_config.port,
    });

    let managed_db = state
        .db
        .create_managed_db(&NewManagedDatabase {
            name: body.name,
            db_type: body.db_type,
            app_id: body.app_id.clone(),
        })
        .await?;

    state
        .db
        .update_managed_db_credentials(
            &managed_db.id,
            &credentials.to_string(),
            &container_id,
        )
        .await?;

    if let Some(ref app_id) = body.app_id {
        let envs = state.db.list_environments(app_id).await?;
        if let Some(env) = envs.first() {
            let _ = state
                .db
                .set_env_var(&NewEnvVar {
                    environment_id: env.id.clone(),
                    key: type_config.env_var_name.to_string(),
                    value: connection_string.clone(),
                    scope: "shared".to_string(),
                })
                .await;
        }
    }

    Ok(Json(serde_json::json!({
        "data": {
            "id": managed_db.id,
            "name": managed_db.name,
            "db_type": managed_db.db_type,
            "container_id": container_id,
            "connection_string": connection_string,
            "credentials": credentials,
        }
    })))
}

async fn delete_database(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let dbs = state.db.list_managed_dbs().await?;
    let db = dbs
        .iter()
        .find(|d| d.id == id)
        .ok_or_else(|| ApiError::NotFound(format!("database {id}")))?;

    let container_name = format!("icefall-db-{}", db.name.to_lowercase());
    let _ = state.docker.stop_container(&container_name, Some(10)).await;
    let _ = state.docker.remove_container(&container_name, true).await;

    state.db.delete_managed_db(&id).await?;

    Ok(Json(serde_json::json!({ "message": "deleted" })))
}

async fn link_to_app(
    State(state): State<AppState>,
    Path((id, app_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let dbs = state.db.list_managed_dbs().await?;
    let db = dbs
        .iter()
        .find(|d| d.id == id)
        .ok_or_else(|| ApiError::NotFound(format!("database {id}")))?;

    let configs = db_configs();
    let type_config = configs
        .get(db.db_type.as_str())
        .ok_or_else(|| ApiError::Internal(Box::new(std::io::Error::other("unknown db type"))))?;

    let creds: serde_json::Value = serde_json::from_str(&db.credentials).unwrap_or_default();
    let conn_str = creds
        .get("connection_string")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let envs = state.db.list_environments(&app_id).await?;
    if let Some(env) = envs.first() {
        state
            .db
            .set_env_var(&NewEnvVar {
                environment_id: env.id.clone(),
                key: type_config.env_var_name.to_string(),
                value: conn_str.to_string(),
                scope: "shared".to_string(),
            })
            .await?;
    }

    Ok(Json(serde_json::json!({ "message": "linked", "env_var": type_config.env_var_name })))
}

async fn unlink_from_app(
    State(state): State<AppState>,
    Path((_id, app_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let envs = state.db.list_environments(&app_id).await?;
    if let Some(env) = envs.first() {
        let vars = state.db.get_env_vars(&env.id).await?;
        for var in vars {
            if var.key == "DATABASE_URL"
                || var.key == "REDIS_URL"
                || var.key == "MONGODB_URL"
            {
                state.db.delete_env_var(&var.id).await?;
            }
        }
    }

    Ok(Json(serde_json::json!({ "message": "unlinked" })))
}

#[derive(Deserialize)]
struct QueryBody {
    sql: String,
}

async fn get_db_connection_string(
    state: &AppState,
    id: &str,
) -> Result<(String, String), ApiError> {
    let dbs = state.db.list_managed_dbs().await?;
    let db = dbs
        .iter()
        .find(|d| d.id == id)
        .ok_or_else(|| ApiError::NotFound(format!("database {id}")))?;

    let db_type = db.db_type.clone();
    let creds: serde_json::Value = serde_json::from_str(&db.credentials).unwrap_or_default();
    let conn_str = creds
        .get("connection_string")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if conn_str.is_empty() {
        return Err(ApiError::BadRequest("No credentials stored for this database".into()));
    }

    Ok((conn_str, db_type))
}

async fn list_tables(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (conn_str, db_type) = get_db_connection_string(&state, &id).await?;
    let container_name = conn_str
        .split('@')
        .nth(1)
        .and_then(|s| s.split(':').next())
        .unwrap_or("");

    let sql = match db_type.as_str() {
        "postgres" => "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
        "mysql" => "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name",
        _ => return Err(ApiError::BadRequest("Table browsing is only supported for PostgreSQL and MySQL".into())),
    };

    let cmd = match db_type.as_str() {
        "postgres" => vec![
            "psql".to_string(),
            conn_str.replace(container_name, "localhost"),
            "-t".to_string(),
            "-A".to_string(),
            "-c".to_string(),
            sql.to_string(),
        ],
        "mysql" => {
            let creds: serde_json::Value = {
                let dbs = state.db.list_managed_dbs().await?;
                let db = dbs.iter().find(|d| d.id == id).unwrap();
                serde_json::from_str(&db.credentials).unwrap_or_default()
            };
            let user = creds.get("user").and_then(|v| v.as_str()).unwrap_or("icefall");
            let pass = creds.get("password").and_then(|v| v.as_str()).unwrap_or("");
            vec![
                "mysql".to_string(),
                format!("-u{user}"),
                format!("-p{pass}"),
                "-e".to_string(),
                sql.to_string(),
                "--batch".to_string(),
                "--skip-column-names".to_string(),
            ]
        }
        _ => unreachable!(),
    };

    let output = state
        .docker
        .exec_in_container(container_name, &cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let tables: Vec<&str> = output.trim().lines().filter(|l| !l.is_empty()).collect();

    Ok(Json(serde_json::json!({ "data": tables })))
}

async fn execute_query(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<QueryBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let sql = body.sql.trim();

    let lower = sql.to_lowercase();
    if !lower.starts_with("select") {
        return Err(ApiError::BadRequest("Only SELECT queries are allowed".into()));
    }

    let limited = if lower.contains("limit") {
        sql.to_string()
    } else {
        format!("{sql} LIMIT 100")
    };

    let (conn_str, db_type) = get_db_connection_string(&state, &id).await?;
    let container_name = conn_str
        .split('@')
        .nth(1)
        .and_then(|s| s.split(':').next())
        .unwrap_or("");

    let cmd = match db_type.as_str() {
        "postgres" => vec![
            "psql".to_string(),
            conn_str.replace(container_name, "localhost"),
            "--csv".to_string(),
            "-c".to_string(),
            limited,
        ],
        "mysql" => {
            let creds: serde_json::Value = {
                let dbs = state.db.list_managed_dbs().await?;
                let db = dbs.iter().find(|d| d.id == id).unwrap();
                serde_json::from_str(&db.credentials).unwrap_or_default()
            };
            let user = creds.get("user").and_then(|v| v.as_str()).unwrap_or("icefall");
            let pass = creds.get("password").and_then(|v| v.as_str()).unwrap_or("");
            vec![
                "mysql".to_string(),
                format!("-u{user}"),
                format!("-p{pass}"),
                "-e".to_string(),
                limited,
                "--batch".to_string(),
            ]
        }
        _ => return Err(ApiError::BadRequest("Query execution is only supported for PostgreSQL and MySQL".into())),
    };

    let output = state
        .docker
        .exec_in_container(container_name, &cmd)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let mut lines = output.lines();
    let headers: Vec<String> = match lines.next() {
        Some(h) => h.split(if db_type == "postgres" { ',' } else { '\t' }).map(|s| s.trim().to_string()).collect(),
        None => return Ok(Json(serde_json::json!({ "columns": [], "rows": [] }))),
    };

    let rows: Vec<Vec<String>> = lines
        .filter(|l| !l.is_empty())
        .map(|l| l.split(if db_type == "postgres" { ',' } else { '\t' }).map(|s| s.trim().to_string()).collect())
        .collect();

    Ok(Json(serde_json::json!({
        "columns": headers,
        "rows": rows,
        "row_count": rows.len(),
    })))
}
