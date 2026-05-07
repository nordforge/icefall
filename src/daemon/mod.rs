pub mod health;
pub mod signals;
pub mod systemd;

use std::sync::Arc;

use thiserror::Error;
use tokio::net::TcpListener;
use tracing::{error, info, warn};

use crate::api::{self, AppState};
use crate::caddy::CaddyClient;
use crate::config::IcefallConfig;
use crate::db::encryption::Encryptor;
use crate::db::sqlite::SqliteDatabase;
use crate::db::Database;
use crate::docker::DockerClient;

#[derive(Debug, Error)]
pub enum DaemonError {
    #[error("configuration error: {0}")]
    Config(#[from] crate::config::ConfigError),
    #[error("database error: {0}")]
    Database(#[from] crate::db::DbError),
    #[error("docker error: {0}")]
    Docker(#[from] crate::docker::DockerError),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Other(String),
}

pub struct DaemonRunner;

impl DaemonRunner {
    pub async fn start(config: IcefallConfig) -> Result<(), DaemonError> {
        // Set up tracing
        tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::try_from_default_env()
                    .unwrap_or_else(|_| config.log_level.parse().unwrap_or_default()),
            )
            .init();

        info!("Starting Icefall daemon v{}", env!("CARGO_PKG_VERSION"));

        // Validate config
        config.validate()?;

        // Write PID file
        let pid = std::process::id();
        if let Some(parent) = config.pid_file.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        std::fs::write(&config.pid_file, pid.to_string())
            .map_err(|e| {
                warn!("Could not write PID file to {}: {e}", config.pid_file.display());
                e
            })
            .ok();
        info!("PID {pid} written to {}", config.pid_file.display());

        // Create data directory
        std::fs::create_dir_all(&config.data_dir)?;

        // Decode encryption key
        let key_bytes = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            config.encryption_key.as_deref().unwrap_or_default(),
        )
        .map_err(|e| DaemonError::Other(format!("Invalid encryption key: {e}")))?;
        let key: [u8; 32] = key_bytes
            .try_into()
            .map_err(|_| DaemonError::Other("Encryption key must be 32 bytes".to_string()))?;
        let encryptor = Arc::new(Encryptor::new(&key));

        // Connect to database
        let db_url = format!("sqlite:{}", config.sqlite_path.display());
        info!("Connecting to database at {}", config.sqlite_path.display());
        let db = SqliteDatabase::connect(&db_url, encryptor).await?;
        db.run_migrations().await?;
        info!("Database connected and migrations applied");
        let db: Arc<dyn Database> = Arc::new(db);

        // Connect to Docker
        let docker = match DockerClient::connect(&config.docker_socket).await {
            Ok(client) => {
                info!("Docker connection established");
                Arc::new(client)
            }
            Err(e) => {
                error!("Docker connection failed: {e}");
                return Err(DaemonError::Docker(e));
            }
        };

        // Connect to Caddy
        let caddy = Arc::new(CaddyClient::new(&config.caddy_admin_url));
        match caddy.health_check().await {
            Ok(()) => info!("Caddy connection established"),
            Err(e) => warn!("Caddy unreachable (will retry): {e}"),
        }

        // Build app state and router
        let state = AppState {
            db,
            docker,
            caddy,
            config: Arc::new(config.clone()),
        };

        let app = api::build_router(state);

        // Start HTTP server
        let addr = format!("{}:{}", config.listen_addr, config.listen_port);
        let listener = TcpListener::bind(&addr).await?;
        info!("API server listening on {addr}");

        // Serve with graceful shutdown
        axum::serve(listener, app)
            .with_graceful_shutdown(signals::shutdown_signal())
            .await?;

        info!("Daemon stopped");

        // Clean up PID file
        std::fs::remove_file(&config.pid_file).ok();

        Ok(())
    }
}
