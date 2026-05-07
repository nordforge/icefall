pub mod daemon;
pub mod init;
pub mod stubs;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "icefall", version, about = "A fast, simple, self-hosted deployment platform")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Manage the icefall daemon
    Daemon {
        #[command(subcommand)]
        command: DaemonCommands,
    },
    /// Initialize icefall configuration
    Init,
    /// Deploy the current project
    Deploy,
    /// Manage applications
    Apps {
        #[command(subcommand)]
        command: AppsCommands,
    },
    /// Stream application logs
    Logs {
        /// Application name
        app: String,
        /// Search filter
        #[arg(long)]
        search: Option<String>,
    },
    /// Manage environment variables
    Env {
        #[command(subcommand)]
        command: EnvCommands,
    },
    /// Manage custom domains
    Domains {
        #[command(subcommand)]
        command: DomainsCommands,
    },
    /// Manage databases
    Db {
        #[command(subcommand)]
        command: DbCommands,
    },
    /// Server migration (export/import)
    Migrate {
        #[command(subcommand)]
        command: MigrateCommands,
    },
    /// Self-update icefall
    Update,
    /// Show server status overview
    Status,
}

#[derive(Subcommand)]
pub enum DaemonCommands {
    /// Start the daemon (foreground)
    Start,
    /// Stop the running daemon
    Stop,
    /// Check daemon status
    Status,
}

#[derive(Subcommand)]
pub enum AppsCommands {
    /// List all applications
    List,
    /// Show application details
    Info {
        /// Application name
        app: String,
    },
}

#[derive(Subcommand)]
pub enum EnvCommands {
    /// Set an environment variable
    Set {
        /// Application name
        app: String,
        /// KEY=value pair
        pair: String,
    },
    /// List environment variables
    List {
        /// Application name
        app: String,
    },
}

#[derive(Subcommand)]
pub enum DomainsCommands {
    /// Add a custom domain
    Add {
        /// Application name
        app: String,
        /// Domain name
        domain: String,
    },
    /// List domains for an application
    List {
        /// Application name
        app: String,
    },
}

#[derive(Subcommand)]
pub enum DbCommands {
    /// Create a managed database
    Create {
        /// Database type (postgres, mysql, redis, mongo)
        db_type: String,
    },
    /// List managed databases
    List,
    /// Trigger a manual backup
    Backup {
        /// Database name
        db: String,
    },
}

#[derive(Subcommand)]
pub enum MigrateCommands {
    /// Export server state
    Export {
        /// Output file path
        #[arg(long, default_value = "icefall-backup.tar.gz")]
        output: String,
    },
    /// Import server state
    Import {
        /// Input file path
        #[arg(long)]
        from: String,
    },
}
