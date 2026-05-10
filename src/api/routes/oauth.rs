use std::collections::HashMap;

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, HeaderValue};
use axum::response::{IntoResponse, Redirect};
use axum::routing::{delete, get};
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::routes::auth::authenticate_from_headers;
use crate::api::AppState;
use crate::db::models::{NewUser, OAuthSettings};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/auth/oauth/{provider}/authorize", get(oauth_authorize))
        .route("/auth/oauth/{provider}/callback", get(oauth_callback))
        .route("/auth/oauth/{provider}/unlink", delete(oauth_unlink))
        .route("/auth/oauth/identities", get(list_oauth_identities))
        .route(
            "/settings/oauth",
            get(get_oauth_settings).put(update_oauth_settings),
        )
        .route("/settings/oauth/providers", get(get_enabled_providers))
}

// --- In-memory PKCE state store ---
// In production, use a proper session store. For simplicity, we use a
// process-scoped concurrent map with TTL-based cleanup.

use std::sync::LazyLock;
use tokio::sync::Mutex;

struct PkceEntry {
    verifier: String,
    created_at: std::time::Instant,
}

static PKCE_STORE: LazyLock<Mutex<HashMap<String, PkceEntry>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

const PKCE_TTL_SECS: u64 = 300; // 5 minutes

async fn store_pkce(state_token: &str, verifier: &str) {
    let mut store = PKCE_STORE.lock().await;
    // Prune expired entries while we're here
    store.retain(|_, v| v.created_at.elapsed().as_secs() < PKCE_TTL_SECS);
    store.insert(
        state_token.to_string(),
        PkceEntry {
            verifier: verifier.to_string(),
            created_at: std::time::Instant::now(),
        },
    );
}

async fn take_pkce(state_token: &str) -> Option<String> {
    let mut store = PKCE_STORE.lock().await;
    store.retain(|_, v| v.created_at.elapsed().as_secs() < PKCE_TTL_SECS);
    store.remove(state_token).map(|e| e.verifier)
}

// --- Provider configuration ---

struct ProviderConfig {
    authorize_url: &'static str,
    token_url: &'static str,
    _user_info_url: &'static str,
    scopes: Vec<&'static str>,
}

fn provider_config(provider: &str) -> Option<ProviderConfig> {
    match provider {
        "github" => Some(ProviderConfig {
            authorize_url: "https://github.com/login/oauth/authorize",
            token_url: "https://github.com/login/oauth/access_token",
            _user_info_url: "https://api.github.com/user",
            scopes: vec!["read:user", "user:email"],
        }),
        "google" => Some(ProviderConfig {
            authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
            token_url: "https://oauth2.googleapis.com/token",
            _user_info_url: "https://www.googleapis.com/oauth2/v2/userinfo",
            scopes: vec!["openid", "email", "profile"],
        }),
        _ => None,
    }
}

fn get_client_credentials(settings: &OAuthSettings, provider: &str) -> Option<(String, String)> {
    match provider {
        "github" if settings.github_enabled => {
            match (&settings.github_client_id, &settings.github_client_secret) {
                (Some(id), Some(secret)) if !id.is_empty() && !secret.is_empty() => {
                    Some((id.clone(), secret.clone()))
                }
                _ => None,
            }
        }
        "google" if settings.google_enabled => {
            match (&settings.google_client_id, &settings.google_client_secret) {
                (Some(id), Some(secret)) if !id.is_empty() && !secret.is_empty() => {
                    Some((id.clone(), secret.clone()))
                }
                _ => None,
            }
        }
        _ => None,
    }
}

// --- Endpoints ---

/// GET /api/v1/settings/oauth/providers
/// Public endpoint: returns which OAuth providers are enabled (no secrets).
async fn get_enabled_providers(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let settings = state.db.get_oauth_settings().await?;

    let (github, google) = match settings {
        Some(ref s) => (
            s.github_enabled && s.github_client_id.as_ref().is_some_and(|id| !id.is_empty()),
            s.google_enabled && s.google_client_id.as_ref().is_some_and(|id| !id.is_empty()),
        ),
        None => (false, false),
    };

    Ok(Json(serde_json::json!({
        "data": {
            "github": github,
            "google": google,
        }
    })))
}

/// GET /api/v1/auth/oauth/{provider}/authorize
/// Generates PKCE challenge, builds authorization URL, redirects to provider.
async fn oauth_authorize(
    State(state): State<AppState>,
    Path(provider): Path<String>,
) -> Result<axum::response::Redirect, ApiError> {
    let prov_config = provider_config(&provider)
        .ok_or_else(|| ApiError::BadRequest(format!("Unsupported OAuth provider: {provider}")))?;

    let oauth_settings = state.db.get_oauth_settings().await?.ok_or_else(|| {
        ApiError::BadRequest(
            "OAuth is not configured. Ask an admin to configure OAuth settings.".into(),
        )
    })?;

    let (client_id, _client_secret) = get_client_credentials(&oauth_settings, &provider)
        .ok_or_else(|| {
            ApiError::BadRequest(format!(
                "OAuth provider '{provider}' is not enabled or configured"
            ))
        })?;

    use base64::Engine;
    use sha2::Digest;

    let (code_verifier, code_challenge, state_token) = {
        use rand::RngCore;
        let mut rng = rand::rng();
        let mut verifier_bytes = [0u8; 32];
        rng.fill_bytes(&mut verifier_bytes);
        let verifier = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(verifier_bytes);

        let mut hasher = sha2::Sha256::new();
        hasher.update(verifier.as_bytes());
        let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hasher.finalize());

        let mut state_bytes = [0u8; 32];
        rng.fill_bytes(&mut state_bytes);
        let token = hex::encode(state_bytes);
        (verifier, challenge, token)
    };

    // Store PKCE verifier keyed by state token
    store_pkce(&state_token, &code_verifier).await;

    // Build the callback URL
    let base = state
        .config
        .base_domain
        .as_deref()
        .map(|d| format!("https://{d}"))
        .unwrap_or_else(|| "http://localhost:3000".to_string());
    let redirect_uri = format!("{base}/api/v1/auth/oauth/{provider}/callback");

    // Build authorization URL
    let scope = prov_config.scopes.join(" ");
    let mut params = vec![
        ("client_id", client_id.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("scope", scope.as_str()),
        ("state", state_token.as_str()),
        ("response_type", "code"),
        ("code_challenge", code_challenge.as_str()),
        ("code_challenge_method", "S256"),
    ];

    // Google requires access_type=offline for refresh tokens
    if provider == "google" {
        params.push(("access_type", "offline"));
        params.push(("prompt", "consent"));
    }

    let query_string: String = params
        .iter()
        .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let authorize_url = format!("{}?{}", prov_config.authorize_url, query_string);

    Ok(Redirect::temporary(&authorize_url))
}

#[derive(Deserialize)]
struct OAuthCallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

/// GET /api/v1/auth/oauth/{provider}/callback
/// Exchanges authorization code for token, fetches user info, creates/links account.
async fn oauth_callback(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(query): Query<OAuthCallbackQuery>,
) -> Result<axum::response::Response, ApiError> {
    // Handle provider errors
    if let Some(ref err) = query.error {
        tracing::warn!("OAuth callback error from {provider}: {err}");
        return Ok(Redirect::temporary("/login?error=oauth_denied").into_response());
    }

    let code = query
        .code
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("Missing authorization code".into()))?;

    let state_token = query
        .state
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("Missing state parameter".into()))?;

    // Validate state and retrieve PKCE verifier
    let code_verifier = take_pkce(state_token).await.ok_or_else(|| {
        ApiError::BadRequest("Invalid or expired OAuth state. Please try again.".into())
    })?;

    let prov_config = provider_config(&provider)
        .ok_or_else(|| ApiError::BadRequest(format!("Unsupported OAuth provider: {provider}")))?;

    let oauth_settings = state
        .db
        .get_oauth_settings()
        .await?
        .ok_or_else(|| ApiError::BadRequest("OAuth is not configured".into()))?;

    let (client_id, client_secret) = get_client_credentials(&oauth_settings, &provider)
        .ok_or_else(|| {
            ApiError::BadRequest(format!("OAuth provider '{provider}' is not configured"))
        })?;

    let base = state
        .config
        .base_domain
        .as_deref()
        .map(|d| format!("https://{d}"))
        .unwrap_or_else(|| "http://localhost:3000".to_string());
    let redirect_uri = format!("{base}/api/v1/auth/oauth/{provider}/callback");

    // Exchange code for access token
    let http_client = reqwest::Client::new();
    let token_response = http_client
        .post(prov_config.token_url)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("code", code),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", code_verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| {
            tracing::error!("OAuth token exchange failed for {provider}: {e}");
            ApiError::Internal(Box::new(e))
        })?;

    if !token_response.status().is_success() {
        let body = token_response.text().await.unwrap_or_default();
        tracing::error!("OAuth token exchange returned error for {provider}: {body}");
        return Ok(Redirect::temporary("/login?error=oauth_failed").into_response());
    }

    let token_data: serde_json::Value = token_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse OAuth token response from {provider}: {e}");
        ApiError::Internal(Box::new(e))
    })?;

    let access_token = token_data["access_token"].as_str().ok_or_else(|| {
        tracing::error!("No access_token in OAuth response from {provider}");
        ApiError::BadRequest("OAuth token exchange did not return an access token".into())
    })?;

    // Fetch user profile from provider
    let (provider_user_id, provider_email, _provider_name) =
        fetch_user_profile(&provider, access_token, &http_client).await?;

    // Account linking logic
    let user = match state
        .db
        .get_oauth_identity(&provider, &provider_user_id)
        .await?
    {
        // Case 1: OAuth identity exists — log in as the linked user
        Some(identity) => state
            .db
            .get_user_by_id(&identity.user_id)
            .await?
            .ok_or_else(|| {
                ApiError::Internal(Box::new(std::io::Error::other(
                    "Linked user account not found",
                )))
            })?,
        // Case 2: No OAuth identity yet
        None => {
            // Check if there's an existing user with matching email
            let existing_user = if let Some(ref email) = provider_email {
                state.db.get_user_by_email(email).await?
            } else {
                None
            };

            match existing_user {
                // Case 2a: Email matches existing user — link identity
                Some(user) => {
                    state
                        .db
                        .create_oauth_identity(
                            &user.id,
                            &provider,
                            &provider_user_id,
                            provider_email.as_deref(),
                        )
                        .await?;
                    user
                }
                // Case 2b: New user — create account + link identity
                None => {
                    let email = provider_email.ok_or_else(|| {
                        ApiError::BadRequest(
                            "OAuth provider did not return an email address. Cannot create account."
                                .into(),
                        )
                    })?;

                    // Generate a random password hash (user can set a password later if needed)
                    let random_password = format!("oauth-{}", uuid::Uuid::now_v7());
                    let password_hash = hash_password_for_oauth(&random_password)?;

                    let new_user = state
                        .db
                        .create_user(&NewUser {
                            email: email.clone(),
                            password_hash,
                            role: "deployer".to_string(),
                        })
                        .await?;

                    state
                        .db
                        .create_oauth_identity(
                            &new_user.id,
                            &provider,
                            &provider_user_id,
                            Some(&email),
                        )
                        .await?;

                    new_user
                }
            }
        }
    };

    // Create session
    let expires_at = (chrono::Utc::now() + chrono::Duration::days(7))
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    let session = state
        .db
        .create_session(&user.id, &expires_at)
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    // Set cookie and redirect to dashboard
    let cookie = format!(
        "icefall_session={}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800",
        session.id
    );
    let mut headers = HeaderMap::new();
    headers.insert("set-cookie", HeaderValue::from_str(&cookie).unwrap());
    headers.insert("location", HeaderValue::from_static("/"));

    Ok((axum::http::StatusCode::TEMPORARY_REDIRECT, headers).into_response())
}

/// Fetch user profile from the OAuth provider using the access token.
async fn fetch_user_profile(
    provider: &str,
    access_token: &str,
    client: &reqwest::Client,
) -> Result<(String, Option<String>, Option<String>), ApiError> {
    match provider {
        "github" => fetch_github_profile(access_token, client).await,
        "google" => fetch_google_profile(access_token, client).await,
        _ => Err(ApiError::BadRequest(format!(
            "Unsupported provider: {provider}"
        ))),
    }
}

async fn fetch_github_profile(
    access_token: &str,
    client: &reqwest::Client,
) -> Result<(String, Option<String>, Option<String>), ApiError> {
    let user_info: serde_json::Value = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Accept", "application/json")
        .header("User-Agent", "icefall")
        .send()
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?
        .json()
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let provider_user_id = user_info["id"]
        .as_i64()
        .map(|id| id.to_string())
        .ok_or_else(|| ApiError::BadRequest("GitHub did not return a user ID".into()))?;

    let name = user_info["name"].as_str().map(String::from);

    // GitHub may not return email in the user endpoint — need to call /user/emails
    let mut email = user_info["email"].as_str().map(String::from);

    if email.is_none() {
        let emails: Vec<serde_json::Value> = client
            .get("https://api.github.com/user/emails")
            .header("Authorization", format!("Bearer {access_token}"))
            .header("Accept", "application/json")
            .header("User-Agent", "icefall")
            .send()
            .await
            .map_err(|e| ApiError::Internal(Box::new(e)))?
            .json()
            .await
            .unwrap_or_default();

        // Prefer the primary verified email
        email = emails
            .iter()
            .filter(|e| e["verified"].as_bool() == Some(true))
            .find(|e| e["primary"].as_bool() == Some(true))
            .or_else(|| {
                emails
                    .iter()
                    .find(|e| e["verified"].as_bool() == Some(true))
            })
            .and_then(|e| e["email"].as_str().map(String::from));
    }

    Ok((provider_user_id, email, name))
}

async fn fetch_google_profile(
    access_token: &str,
    client: &reqwest::Client,
) -> Result<(String, Option<String>, Option<String>), ApiError> {
    let user_info: serde_json::Value = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .header("Authorization", format!("Bearer {access_token}"))
        .send()
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?
        .json()
        .await
        .map_err(|e| ApiError::Internal(Box::new(e)))?;

    let provider_user_id = user_info["id"]
        .as_str()
        .map(String::from)
        .ok_or_else(|| ApiError::BadRequest("Google did not return a user ID".into()))?;

    let email = user_info["email"].as_str().map(String::from);
    let name = user_info["name"].as_str().map(String::from);

    Ok((provider_user_id, email, name))
}

/// DELETE /api/v1/auth/oauth/{provider}/unlink
/// Unlinks an OAuth provider from the authenticated user.
async fn oauth_unlink(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    let identities = state.db.list_oauth_identities_for_user(&user.id).await?;

    let identity = identities
        .iter()
        .find(|i| i.provider == provider)
        .ok_or_else(|| {
            ApiError::NotFound(format!("No {provider} identity linked to your account"))
        })?;

    // Ensure the user has another auth method (another OAuth provider linked).
    // Note: we can't easily tell if the user set their own password (OAuth-created
    // accounts have a random hash), so we only check for other OAuth providers.
    let other_providers = identities.iter().filter(|i| i.provider != provider).count();

    if other_providers == 0 {
        return Err(ApiError::BadRequest(
            "Cannot unlink the only authentication method. Link another provider first.".into(),
        ));
    }

    state.db.delete_oauth_identity(&identity.id).await?;

    Ok(Json(serde_json::json!({
        "message": format!("{provider} has been unlinked from your account")
    })))
}

/// GET /api/v1/auth/oauth/identities
/// Lists OAuth identities for the authenticated user.
async fn list_oauth_identities(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    let identities = state.db.list_oauth_identities_for_user(&user.id).await?;

    let data: Vec<serde_json::Value> = identities
        .into_iter()
        .map(|i| {
            serde_json::json!({
                "id": i.id,
                "provider": i.provider,
                "provider_email": i.provider_email,
                "created_at": i.created_at,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({ "data": data })))
}

/// GET /api/v1/settings/oauth
/// Returns OAuth settings for admin configuration.
async fn get_oauth_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    if user.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }

    let settings = state.db.get_oauth_settings().await?;

    let base = state
        .config
        .base_domain
        .as_deref()
        .map(|d| format!("https://{d}"))
        .unwrap_or_else(|| "http://localhost:3000".to_string());

    match settings {
        Some(s) => Ok(Json(serde_json::json!({
            "data": {
                "github_client_id": s.github_client_id,
                "github_has_secret": s.github_client_secret.is_some(),
                "github_enabled": s.github_enabled,
                "github_callback_url": format!("{base}/api/v1/auth/oauth/github/callback"),
                "google_client_id": s.google_client_id,
                "google_has_secret": s.google_client_secret.is_some(),
                "google_enabled": s.google_enabled,
                "google_callback_url": format!("{base}/api/v1/auth/oauth/google/callback"),
            }
        }))),
        None => Ok(Json(serde_json::json!({
            "data": {
                "github_client_id": null,
                "github_has_secret": false,
                "github_enabled": false,
                "github_callback_url": format!("{base}/api/v1/auth/oauth/github/callback"),
                "google_client_id": null,
                "google_has_secret": false,
                "google_enabled": false,
                "google_callback_url": format!("{base}/api/v1/auth/oauth/google/callback"),
            }
        }))),
    }
}

#[derive(Deserialize)]
struct UpdateOAuthSettingsRequest {
    github_client_id: Option<String>,
    github_client_secret: Option<String>,
    github_enabled: Option<bool>,
    google_client_id: Option<String>,
    google_client_secret: Option<String>,
    google_enabled: Option<bool>,
}

/// PUT /api/v1/settings/oauth
/// Updates OAuth settings (admin only).
async fn update_oauth_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<UpdateOAuthSettingsRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    if user.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }

    // Merge with existing settings
    let existing = state
        .db
        .get_oauth_settings()
        .await?
        .unwrap_or(OAuthSettings {
            github_client_id: None,
            github_client_secret: None,
            github_enabled: false,
            google_client_id: None,
            google_client_secret: None,
            google_enabled: false,
        });

    let updated = OAuthSettings {
        github_client_id: body.github_client_id.or(existing.github_client_id),
        github_client_secret: body.github_client_secret.or(existing.github_client_secret),
        github_enabled: body.github_enabled.unwrap_or(existing.github_enabled),
        google_client_id: body.google_client_id.or(existing.google_client_id),
        google_client_secret: body.google_client_secret.or(existing.google_client_secret),
        google_enabled: body.google_enabled.unwrap_or(existing.google_enabled),
    };

    state.db.upsert_oauth_settings(&updated).await?;

    let base = state
        .config
        .base_domain
        .as_deref()
        .map(|d| format!("https://{d}"))
        .unwrap_or_else(|| "http://localhost:3000".to_string());

    Ok(Json(serde_json::json!({
        "data": {
            "github_client_id": updated.github_client_id,
            "github_has_secret": updated.github_client_secret.is_some(),
            "github_enabled": updated.github_enabled,
            "github_callback_url": format!("{base}/api/v1/auth/oauth/github/callback"),
            "google_client_id": updated.google_client_id,
            "google_has_secret": updated.google_client_secret.is_some(),
            "google_enabled": updated.google_enabled,
            "google_callback_url": format!("{base}/api/v1/auth/oauth/google/callback"),
        },
        "message": "OAuth settings updated"
    })))
}

fn hash_password_for_oauth(password: &str) -> Result<String, ApiError> {
    use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
    let salt = SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| ApiError::Internal(Box::new(std::io::Error::other(e.to_string()))))?;
    Ok(hash.to_string())
}

// URL encoding helper (minimal, no extra dependency)
mod urlencoding {
    pub fn encode(input: &str) -> String {
        let mut result = String::with_capacity(input.len() * 3);
        for byte in input.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    result.push(byte as char);
                }
                _ => {
                    result.push('%');
                    result.push_str(&format!("{:02X}", byte));
                }
            }
        }
        result
    }
}
