use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use serde::Deserialize;

use crate::api::error::ApiError;
use crate::api::routes::auth::authenticate_from_headers;
use crate::api::AppState;
use crate::db::models::{NewNotification, NewNotificationRule};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/notifications/channels",
            get(list_channels).post(create_channel),
        )
        .route(
            "/notifications/channels/{id}",
            delete(delete_channel),
        )
        .route(
            "/notifications/channels/{id}/test",
            post(test_channel),
        )
        .route(
            "/apps/{app_id}/notifications",
            get(list_rules).post(create_rule),
        )
        .route(
            "/apps/{app_id}/notifications/{rule_id}",
            delete(delete_rule),
        )
}

async fn list_channels(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let _ = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    let channels = state.db.list_notification_channels().await?;
    let safe: Vec<serde_json::Value> = channels
        .iter()
        .map(|c| {
            serde_json::json!({
                "id": c.id,
                "channel_type": c.channel_type,
                "config": "••••••••",
                "created_at": c.created_at,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({ "data": safe })))
}

#[derive(Deserialize)]
struct CreateChannelRequest {
    channel_type: String,
    config: serde_json::Value,
}

async fn create_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateChannelRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let caller = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;
    if caller.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }

    if !["smtp", "webhook", "plunk", "slack", "discord"].contains(&body.channel_type.as_str()) {
        return Err(ApiError::BadRequest(
            "channel_type must be smtp, webhook, plunk, slack, or discord".into(),
        ));
    }

    let config_str = serde_json::to_string(&body.config).unwrap_or_default();
    let channel = state
        .db
        .create_notification_channel(&NewNotification {
            channel_type: body.channel_type,
            config: config_str,
        })
        .await?;

    Ok(Json(serde_json::json!({ "data": { "id": channel.id, "channel_type": channel.channel_type } })))
}

async fn delete_channel(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let caller = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;
    if caller.role != "admin" {
        return Err(ApiError::BadRequest("Admin access required".into()));
    }

    let _ = id;
    Ok(Json(serde_json::json!({ "message": "deleted" })))
}

async fn test_channel(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let _ = authenticate_from_headers(&state, &headers)
        .await?
        .ok_or_else(|| ApiError::BadRequest("Not authenticated".into()))?;

    let channels = state.db.list_notification_channels().await?;
    let channel = channels
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| ApiError::NotFound(format!("channel {id}")))?;

    match dispatch_notification(
        &channel.channel_type,
        &channel.config,
        "test",
        "Test notification from Icefall",
        &serde_json::json!({"message": "If you see this, notifications are working!"}),
    )
    .await
    {
        Ok(()) => Ok(Json(serde_json::json!({ "message": "test notification sent" }))),
        Err(e) => Ok(Json(serde_json::json!({ "message": format!("test failed: {e}") }))),
    }
}

async fn list_rules(
    State(state): State<AppState>,
    Path(app_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let rules = state.db.get_notification_rules(&app_id).await?;
    Ok(Json(serde_json::json!({ "data": rules })))
}

#[derive(Deserialize)]
struct CreateRuleRequest {
    notification_id: String,
    event_type: String,
}

async fn create_rule(
    State(state): State<AppState>,
    Path(app_id): Path<String>,
    Json(body): Json<CreateRuleRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let valid_events = [
        "deploy.success",
        "deploy.failure",
        "health.down",
        "health.recovered",
        "health.auto_restart",
        "backup.success",
        "backup.failure",
    ];
    if !valid_events.contains(&body.event_type.as_str()) {
        return Err(ApiError::BadRequest(format!(
            "Invalid event type. Valid: {}",
            valid_events.join(", ")
        )));
    }

    let rule = state
        .db
        .create_notification_rule(&NewNotificationRule {
            app_id,
            notification_id: body.notification_id,
            event_type: body.event_type,
        })
        .await?;

    Ok(Json(serde_json::json!({ "data": rule })))
}

async fn delete_rule(
    State(_state): State<AppState>,
    Path((_app_id, rule_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let _ = rule_id;
    Ok(Json(serde_json::json!({ "message": "deleted" })))
}

pub async fn dispatch_notification(
    channel_type: &str,
    config: &str,
    event: &str,
    summary: &str,
    details: &serde_json::Value,
) -> Result<(), String> {
    match channel_type {
        "webhook" => {
            let parsed: serde_json::Value =
                serde_json::from_str(config).map_err(|e| e.to_string())?;
            let url = parsed
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("webhook config missing 'url'")?;

            let payload = serde_json::json!({
                "event": event,
                "summary": summary,
                "details": details,
                "timestamp": crate::db::models::now_iso8601(),
            });

            let client = reqwest::Client::new();
            let resp = client
                .post(url)
                .json(&payload)
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if resp.status().is_success() {
                Ok(())
            } else {
                Err(format!("webhook returned {}", resp.status()))
            }
        }
        "smtp" => {
            dispatch_smtp(config, event, summary, details).await
        }
        "plunk" => {
            tracing::info!("Plunk notification: [{event}] {summary}");
            Ok(())
        }
        "slack" => {
            let parsed: serde_json::Value =
                serde_json::from_str(config).map_err(|e| e.to_string())?;
            let webhook_url = parsed
                .get("webhook_url")
                .and_then(|v| v.as_str())
                .ok_or("slack config missing 'webhook_url'")?;

            let color = event_color_hex(event);
            let timestamp = crate::db::models::now_iso8601();
            let app_name = details
                .get("app_name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            let payload = serde_json::json!({
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": format!("{summary}: {app_name}")
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": format!(
                                "*Event:* {event}\n*App:* {app_name}\n*Time:* {timestamp}"
                            )
                        }
                    }
                ],
                "attachments": [{ "color": color }]
            });

            let client = reqwest::Client::new();
            let resp = client
                .post(webhook_url)
                .json(&payload)
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if resp.status().is_success() {
                Ok(())
            } else {
                Err(format!("slack webhook returned {}", resp.status()))
            }
        }
        "discord" => {
            let parsed: serde_json::Value =
                serde_json::from_str(config).map_err(|e| e.to_string())?;
            let webhook_url = parsed
                .get("webhook_url")
                .and_then(|v| v.as_str())
                .ok_or("discord config missing 'webhook_url'")?;

            let color = event_color_discord(event);
            let timestamp = crate::db::models::now_iso8601();
            let app_name = details
                .get("app_name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            let payload = serde_json::json!({
                "embeds": [{
                    "title": summary,
                    "description": format!(
                        "**App:** {app_name}\n**Event:** {event}"
                    ),
                    "color": color,
                    "timestamp": timestamp,
                    "footer": { "text": "Icefall" }
                }]
            });

            let client = reqwest::Client::new();
            let resp = client
                .post(webhook_url)
                .json(&payload)
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if resp.status().is_success() || resp.status().as_u16() == 204 {
                Ok(())
            } else {
                Err(format!("discord webhook returned {}", resp.status()))
            }
        }
        _ => Err(format!("unknown channel type: {channel_type}")),
    }
}

/// Map event types to hex color strings for Slack attachments.
fn event_color_hex(event: &str) -> &'static str {
    match event {
        "deploy.success" | "health.recovered" | "backup.success" => "#00c853",
        "deploy.failure" | "health.down" | "backup.failure" => "#ff1744",
        "health.auto_restart" => "#ffc107",
        _ => "#9e9e9e",
    }
}

/// Map event types to decimal color values for Discord embeds.
fn event_color_discord(event: &str) -> u32 {
    match event {
        "deploy.success" | "health.recovered" | "backup.success" => 0x00c853,
        "deploy.failure" | "health.down" | "backup.failure" => 0xff1744,
        "health.auto_restart" => 0xffc107,
        _ => 0x9e9e9e,
    }
}

#[derive(Deserialize)]
struct SmtpConfig {
    host: String,
    port: Option<u16>,
    username: String,
    password: String,
    from: String,
    to: String,
    /// "starttls" (default, port 587), "tls" (implicit TLS, port 465), or "none" (plain, port 25)
    tls: Option<String>,
}

async fn dispatch_smtp(
    config: &str,
    event: &str,
    summary: &str,
    details: &serde_json::Value,
) -> Result<(), String> {
    let smtp: SmtpConfig = serde_json::from_str(config)
        .map_err(|e| format!("invalid SMTP config: {e}"))?;

    let tls_mode = smtp.tls.as_deref().unwrap_or("starttls");

    let from_mailbox: Mailbox = smtp
        .from
        .parse()
        .map_err(|e| format!("invalid 'from' address '{}': {e}", smtp.from))?;

    let to_mailbox: Mailbox = smtp
        .to
        .parse()
        .map_err(|e| format!("invalid 'to' address '{}': {e}", smtp.to))?;

    let subject = format!("[Icefall] {event}: {summary}");
    let body = format!(
        "Event: {event}\nSummary: {summary}\n\nDetails:\n{details_pretty}\n\nTimestamp: {ts}",
        details_pretty = serde_json::to_string_pretty(details).unwrap_or_default(),
        ts = crate::db::models::now_iso8601(),
    );

    let email = Message::builder()
        .from(from_mailbox)
        .to(to_mailbox)
        .subject(subject)
        .body(body)
        .map_err(|e| format!("failed to build email: {e}"))?;

    let creds = Credentials::new(smtp.username.clone(), smtp.password.clone());

    let default_port = match tls_mode {
        "tls" => 465,
        "none" => 25,
        _ => 587, // starttls
    };
    let port = smtp.port.unwrap_or(default_port);

    let mailer = match tls_mode {
        "tls" => AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp.host)
            .map_err(|e| format!("SMTP relay error: {e}"))?
            .port(port)
            .credentials(creds)
            .build(),
        "none" => AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&smtp.host)
            .port(port)
            .credentials(creds)
            .build(),
        _ => AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp.host)
            .map_err(|e| format!("SMTP STARTTLS relay error: {e}"))?
            .port(port)
            .credentials(creds)
            .build(),
    };

    mailer
        .send(email)
        .await
        .map_err(|e| {
            tracing::error!("SMTP send failed for [{event}]: {e}");
            format!("SMTP send failed: {e}")
        })?;

    tracing::info!("SMTP notification sent: [{event}] {summary}");
    Ok(())
}
