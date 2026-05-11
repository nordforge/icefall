use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use thiserror::Error;

use crate::build::BuildError;
use crate::caddy::CaddyError;
use crate::db::DbError;
use crate::deploy::DeployError;
use crate::docker::DockerError;

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Forbidden(String),
    #[error("{0}")]
    Conflict(String),
    #[error("internal error")]
    Internal(#[source] Box<dyn std::error::Error + Send + Sync>),
    #[error("{0}")]
    ServiceUnavailable(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ApiError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg.clone()),
            ApiError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            ApiError::Internal(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
            ApiError::ServiceUnavailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, msg.clone()),
        };

        let body = serde_json::json!({ "error": message });
        (status, Json(body)).into_response()
    }
}

impl From<DbError> for ApiError {
    fn from(err: DbError) -> Self {
        match err {
            DbError::NotFound(msg) => ApiError::NotFound(msg),
            DbError::Duplicate(msg) => ApiError::Conflict(msg),
            other => ApiError::Internal(Box::new(other)),
        }
    }
}

impl From<DockerError> for ApiError {
    fn from(err: DockerError) -> Self {
        match err {
            DockerError::ContainerNotFound(msg) => ApiError::NotFound(msg),
            DockerError::ImageNotFound(msg) => ApiError::NotFound(msg),
            DockerError::Unavailable(msg) => ApiError::ServiceUnavailable(msg),
            other => ApiError::Internal(Box::new(other)),
        }
    }
}

impl From<CaddyError> for ApiError {
    fn from(err: CaddyError) -> Self {
        match err {
            CaddyError::RouteNotFound(msg) => ApiError::NotFound(msg),
            CaddyError::Unreachable(msg) => ApiError::ServiceUnavailable(msg),
            other => ApiError::Internal(Box::new(other)),
        }
    }
}

impl From<BuildError> for ApiError {
    fn from(err: BuildError) -> Self {
        ApiError::Internal(Box::new(err))
    }
}

impl From<DeployError> for ApiError {
    fn from(err: DeployError) -> Self {
        ApiError::Internal(Box::new(err))
    }
}
