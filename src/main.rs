use clap::Parser;
use icefall::cli::{
    AppsCommands, Cli, Commands, DaemonCommands, DbCommands, DomainsCommands, EnvCommands,
    MigrateCommands,
};

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Daemon { command } => match command {
            DaemonCommands::Start => icefall::cli::daemon::start().await,
            DaemonCommands::Stop => icefall::cli::daemon::stop().await,
            DaemonCommands::Status => icefall::cli::daemon::status().await,
        },
        Commands::Init => icefall::cli::init::run().await,
        Commands::Deploy => icefall::cli::stubs::deploy().await,
        Commands::Apps { command } => match command {
            AppsCommands::List => icefall::cli::stubs::apps_list().await,
            AppsCommands::Info { app } => icefall::cli::stubs::apps_info(&app).await,
        },
        Commands::Logs { app, search } => {
            icefall::cli::stubs::logs(&app, search.as_deref()).await;
        }
        Commands::Env { command } => match command {
            EnvCommands::Set { app, pair } => icefall::cli::stubs::env_set(&app, &pair).await,
            EnvCommands::List { app } => icefall::cli::stubs::env_list(&app).await,
        },
        Commands::Domains { command } => match command {
            DomainsCommands::Add { app, domain } => {
                icefall::cli::stubs::domains_add(&app, &domain).await;
            }
            DomainsCommands::List { app } => icefall::cli::stubs::domains_list(&app).await,
        },
        Commands::Db { command } => match command {
            DbCommands::Create { db_type } => icefall::cli::stubs::db_create(&db_type).await,
            DbCommands::List => icefall::cli::stubs::db_list().await,
            DbCommands::Backup { db } => icefall::cli::stubs::db_backup(&db).await,
        },
        Commands::Migrate { command } => match command {
            MigrateCommands::Export { output } => {
                icefall::cli::stubs::migrate_export(&output).await;
            }
            MigrateCommands::Import { from } => {
                icefall::cli::stubs::migrate_import(&from).await;
            }
        },
        Commands::Update => icefall::cli::stubs::update().await,
        Commands::Status => icefall::cli::stubs::status().await,
    }
}
