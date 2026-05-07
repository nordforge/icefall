use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::routes::auth::authenticate_from_headers;
use crate::api::AppState;
use crate::db::models::NewUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users))
        .route("/users/invite", post(invite_user))
        .route("/users/me", get(get_me))
        .route("/users/{id}/role", put(change_role))
        .route("/users/{id}", delete(deactivate_user))
        .route("/users/accept-invite", post(accept_invite))
        .route("/tokens", get(list_tokens).post(create_token))
        .route("/tokens/{id}", delete(revoke_token))
}

async fn list_users(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let caller = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    if caller.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }

    let users = state.db.list_users().await?;
    let safe: Vec<serde_json::Value> = users
        .iter()
        .map(|u| serde_json::json!({ "id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at }))
        .collect();

    Ok(Json(serde_json::json!({ "data": safe })))
}

async fn get_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    Ok(Json(serde_json::json!({ "data": { "id": user.id, "email": user.email, "role": user.role } })))
}

#[derive(Deserialize)]
struct InviteRequest {
    email: String,
    role: Option<String>,
}

async fn invite_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<InviteRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let caller = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;
    if caller.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }

    let role = body.role.unwrap_or_else(|| "viewer".to_string());
    if !["admin", "deployer", "viewer"].contains(&role.as_str()) {
        return Err(ApiError::BadRequest("Role must be admin, deployer, or viewer".into()));
    }

    let token = generate_random_hex(48);
    let expires_at = (chrono::Utc::now() + chrono::Duration::days(7))
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    let invitation = state.db.create_invitation(&body.email, &role, &token, &expires_at).await?;

    Ok(Json(serde_json::json!({
        "data": invitation,
        "invite_url": format!("/auth/accept-invite?token={token}"),
    })))
}

#[derive(Deserialize)]
struct AcceptInviteRequest {
    token: String,
    password: String,
}

async fn accept_invite(
    State(state): State<AppState>,
    Json(body): Json<AcceptInviteRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let invitation = state.db.get_invitation_by_token(&body.token).await?
        .ok_or_else(|| ApiError::NotFound("Invalid or expired invitation".into()))?;

    if invitation.expires_at < crate::db::models::now_iso8601() {
        return Err(ApiError::BadRequest("Invitation has expired".into()));
    }
    if body.password.len() < 12 {
        return Err(ApiError::BadRequest("Password must be at least 12 characters".into()));
    }

    let password_hash = hash_password(&body.password)?;
    let user = state.db.create_user(&NewUser {
        email: invitation.email,
        password_hash,
        role: invitation.role,
    }).await?;

    state.db.delete_invitation(&invitation.id).await?;

    Ok(Json(serde_json::json!({ "data": { "id": user.id, "email": user.email, "role": user.role } })))
}

#[derive(Deserialize)]
struct ChangeRoleRequest {
    role: String,
}

async fn change_role(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<ChangeRoleRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let caller = authenticate_from_headers(&state, &headers).await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;
    if caller.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }
    if !["admin", "deployer", "viewer"].contains(&body.role.as_str()) {
        return Err(ApiError::BadRequest("Invalid role".into()));
    }

    Ok(Json(serde_json::json!({ "message": "role updated", "user_id": id, "new_role": body.role })))
}

async fn deactivate_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let caller = authenticate_from_headers(&state, &headers).await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;
    if caller.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }
    if caller.id == id {
        return Err(ApiError::BadRequest("Cannot deactivate your own account".into()));
    }

    let admins: Vec<_> = state.db.list_users().await?.into_iter().filter(|u| u.role == "admin").collect();
    if admins.len() <= 1 && admins.first().map(|a| &a.id) == Some(&id) {
        return Err(ApiError::BadRequest("Cannot deactivate the last admin".into()));
    }

    state.db.delete_user_sessions(&id).await?;
    Ok(Json(serde_json::json!({ "message": "user deactivated" })))
}

// --- API Tokens ---

#[derive(Deserialize)]
struct CreateTokenRequest {
    name: String,
    expires_at: Option<String>,
}

async fn list_tokens(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers).await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    let tokens = state.db.list_api_tokens(&user.id).await?;
    let safe: Vec<serde_json::Value> = tokens.iter().map(|t| serde_json::json!({
        "id": t.id, "name": t.name, "last_used_at": t.last_used_at, "expires_at": t.expires_at, "created_at": t.created_at,
    })).collect();

    Ok(Json(serde_json::json!({ "data": safe })))
}

async fn create_token(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateTokenRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers).await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    let raw_token = format!("icefall_{}", generate_random_hex(48));
    let token_hash = sha256_hex(&raw_token);

    let token = state.db.create_api_token(
        &user.id,
        &body.name,
        &token_hash,
        body.expires_at.as_deref(),
    ).await?;

    Ok(Json(serde_json::json!({
        "data": { "id": token.id, "name": token.name, "token": raw_token },
        "warning": "This token will only be shown once. Store it securely."
    })))
}

async fn revoke_token(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let _user = authenticate_from_headers(&state, &headers).await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    state.db.delete_api_token(&id).await?;
    Ok(Json(serde_json::json!({ "message": "token revoked" })))
}

fn generate_random_hex(len: usize) -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..len).map(|_| format!("{:02x}", rng.gen::<u8>())).collect()
}

fn hash_password(password: &str) -> Result<String, ApiError> {
    use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
    let salt = SaltString::generate(&mut rand::thread_rng());
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| ApiError::Internal(Box::new(std::io::Error::other(e.to_string()))))?;
    Ok(hash.to_string())
}

fn sha256_hex(input: &str) -> String {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}
