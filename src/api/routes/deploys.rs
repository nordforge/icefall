use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::build::orchestrator::BuildOrchestrator;
use crate::build::BuildConfig;
use crate::db::models::NewDeploy;
use crate::deploy::manager::DeployManager;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/apps/{id}/deploys",
            get(list_deploys).post(create_deploy),
        )
        .route(
            "/apps/{id}/deploys/{deploy_id}/rollback",
            post(rollback_deploy),
        )
}

async fn list_deploys(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let deploys = state.db.list_deploys(&id, 50).await?;
    Ok(Json(serde_json::json!({ "data": deploys })))
}

async fn create_deploy(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let app = state
        .db
        .get_app(&id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("app {id}")))?;

    let is_image_deploy = app.image_ref.is_some();

    if !is_image_deploy {
        // Git-based apps require a configured repo
        app.git_repo
            .as_ref()
            .ok_or_else(|| ApiError::BadRequest("app has no git_repo configured".into()))?;
    }

    let envs = state.db.list_environments(&id).await?;
    let env = envs
        .first()
        .ok_or_else(|| ApiError::BadRequest("app has no environments".into()))?;

    let deploy = state
        .db
        .create_deploy(&NewDeploy {
            app_id: id.clone(),
            environment_id: env.id.clone(),
            git_sha: None,
        })
        .await?;

    let deploy_id = deploy.id.clone();
    let app_clone = app.clone();
    let env_clone = env.clone();

    if is_image_deploy {
        // Image-based deploy: skip the build pipeline and go straight to pulling + deploying
        let image_ref = app.image_ref.clone().unwrap();

        tokio::spawn(async move {
            let manager = DeployManager::new(
                state.docker.clone(),
                state.caddy.clone(),
                state.db.clone(),
                state.config.clone(),
                state.event_bus.clone(),
            );

            let updated_deploy = match state.db.get_deploy(&deploy_id).await {
                Ok(Some(d)) => d,
                _ => return,
            };

            if let Err(e) = manager
                .deploy(&updated_deploy, &app_clone, &env_clone, &image_ref)
                .await
            {
                tracing::error!("Image deploy failed for {deploy_id}: {e}");
            }
        });
    } else {
        // Git-based deploy: run the build pipeline first
        let build_config: Option<BuildConfig> = app
            .build_config
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());

        let lock = state.build_locks.acquire(&id).await;

        tokio::spawn(async move {
            let _guard = lock.lock().await;

            let orchestrator = BuildOrchestrator::new(
                state.docker.clone(),
                state.db.clone(),
                state.config.clone(),
            );

            match orchestrator.build(&deploy_id, &app_clone, build_config).await {
                Ok(result) => {
                    let manager = DeployManager::new(
                        state.docker.clone(),
                        state.caddy.clone(),
                        state.db.clone(),
                        state.config.clone(),
                        state.event_bus.clone(),
                    );

                    let updated_deploy = match state.db.get_deploy(&deploy_id).await {
                        Ok(Some(d)) => d,
                        _ => return,
                    };

                    if let Err(e) = manager
                        .deploy(&updated_deploy, &app_clone, &env_clone, &result.image_ref)
                        .await
                    {
                        tracing::error!("Deploy failed for {deploy_id}: {e}");
                    }
                }
                Err(e) => {
                    tracing::error!("Build failed for deploy {deploy_id}: {e}");
                }
            }
        });
    }

    Ok(Json(serde_json::json!({ "data": deploy })))
}

async fn rollback_deploy(
    State(state): State<AppState>,
    Path((app_id, deploy_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let app = state
        .db
        .get_app(&app_id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("app {app_id}")))?;

    let target_deploy = state
        .db
        .get_deploy(&deploy_id)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("deploy {deploy_id}")))?;

    let image_ref = target_deploy
        .image_ref
        .as_ref()
        .ok_or_else(|| ApiError::BadRequest("Target deploy has no image reference — cannot rollback".into()))?
        .clone();

    let envs = state.db.list_environments(&app_id).await?;
    let env = envs
        .first()
        .ok_or_else(|| ApiError::BadRequest("app has no environments".into()))?;

    let rollback_deploy = state
        .db
        .create_deploy(&NewDeploy {
            app_id: app_id.clone(),
            environment_id: env.id.clone(),
            git_sha: target_deploy.git_sha.clone(),
        })
        .await?;

    let env_snapshot: Option<Vec<String>> = target_deploy
        .env_snapshot
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());

    let rollback_id = rollback_deploy.id.clone();
    let env_clone = env.clone();

    tokio::spawn(async move {
        let manager = DeployManager::new(
            state.docker.clone(),
            state.caddy.clone(),
            state.db.clone(),
            state.config.clone(),
            state.event_bus.clone(),
        );

        let deploy = match state.db.get_deploy(&rollback_id).await {
            Ok(Some(d)) => d,
            _ => return,
        };

        if let Err(e) = manager
            .deploy_with_env(&deploy, &app, &env_clone, &image_ref, env_snapshot)
            .await
        {
            tracing::error!("Rollback deploy failed for {rollback_id}: {e}");
        }
    });

    Ok(Json(serde_json::json!({ "data": rollback_deploy })))
}
