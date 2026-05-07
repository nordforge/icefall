use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::error::ApiError;
use crate::api::AppState;
use crate::build::orchestrator::BuildOrchestrator;
use crate::build::BuildConfig;
use crate::db::models::NewDeploy;

pub fn routes() -> Router<AppState> {
    Router::new().route(
        "/apps/{id}/deploys",
        get(list_deploys).post(create_deploy),
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

    let _git_repo = app
        .git_repo
        .as_ref()
        .ok_or_else(|| ApiError::BadRequest("app has no git_repo configured".into()))?;

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

    let build_config: Option<BuildConfig> = app
        .build_config
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());

    let orchestrator = BuildOrchestrator::new(
        state.docker.clone(),
        state.db.clone(),
        state.config.clone(),
    );
    let deploy_id = deploy.id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        if let Err(e) = orchestrator.build(&deploy_id, &app_clone, build_config).await {
            tracing::error!("Build failed for deploy {deploy_id}: {e}");
        }
    });

    Ok(Json(serde_json::json!({ "data": deploy })))
}
