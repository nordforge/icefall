use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use icefall_common::protocol::AgentMessage;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use tracing::{error, info, warn};

use crate::config::AgentConfig;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(15);
const PONG_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_BACKOFF: Duration = Duration::from_secs(300);

pub async fn run_connection_loop(
    config: &AgentConfig,
    mut shutdown: tokio::sync::watch::Receiver<bool>,
) {
    let mut backoff = Duration::from_secs(1);

    loop {
        if *shutdown.borrow() {
            info!("Shutdown signal received, exiting connection loop");
            break;
        }

        match connect(config).await {
            Ok(ws) => {
                info!("Connected to control plane");
                backoff = Duration::from_secs(1);
                run_session(ws, &mut shutdown).await;

                if *shutdown.borrow() {
                    break;
                }
                warn!("Connection lost, reconnecting...");
            }
            Err(e) => {
                if e.contains("401") || e.contains("Unauthorized") {
                    error!("Authentication failed: {e}. Check your token. Exiting.");
                    std::process::exit(1);
                }
                warn!("Connection failed: {e}");
            }
        }

        let jitter = jittered_delay(backoff);
        info!("Reconnecting in {:.1}s", jitter.as_secs_f64());

        tokio::select! {
            _ = tokio::time::sleep(jitter) => {}
            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    break;
                }
            }
        }

        backoff = (backoff * 2).min(MAX_BACKOFF);
    }
}

async fn connect(
    config: &AgentConfig,
) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>, String> {
    let url = config.ws_url();
    let mut request = url.into_client_request().map_err(|e| e.to_string())?;
    request.headers_mut().insert(
        "Authorization",
        HeaderValue::from_str(&format!("Bearer {}", config.token)).map_err(|e| e.to_string())?,
    );

    let (ws, _response) = connect_async(request).await.map_err(|e| e.to_string())?;

    Ok(ws)
}

async fn run_session(
    ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
    shutdown: &mut tokio::sync::watch::Receiver<bool>,
) {
    let (mut sink, mut stream) = ws.split();
    let mut heartbeat_interval = tokio::time::interval(HEARTBEAT_INTERVAL);
    let mut waiting_pong = false;
    let mut pong_deadline: Option<tokio::time::Instant> = None;

    loop {
        tokio::select! {
            msg = stream.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        handle_text_message(&text, &mut sink).await;
                    }
                    Some(Ok(Message::Pong(_))) => {
                        waiting_pong = false;
                        pong_deadline = None;
                    }
                    Some(Ok(Message::Close(_))) => {
                        info!("Server sent close frame");
                        break;
                    }
                    Some(Err(e)) => {
                        warn!("WebSocket error: {e}");
                        break;
                    }
                    None => {
                        break;
                    }
                    _ => {}
                }
            }

            _ = heartbeat_interval.tick() => {
                if waiting_pong {
                    if let Some(deadline) = pong_deadline {
                        if tokio::time::Instant::now() >= deadline {
                            warn!("Pong timeout, closing connection");
                            let _ = sink.send(Message::Close(None)).await;
                            break;
                        }
                    }
                } else {
                    if sink.send(Message::Ping(vec![].into())).await.is_err() {
                        break;
                    }
                    waiting_pong = true;
                    pong_deadline = Some(tokio::time::Instant::now() + PONG_TIMEOUT);
                }
            }

            _ = shutdown.changed() => {
                if *shutdown.borrow() {
                    info!("Shutdown signal, closing WebSocket");
                    let _ = sink.send(Message::Close(None)).await;
                    // Give in-flight ops up to 5s
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    break;
                }
            }
        }
    }
}

async fn handle_text_message(
    text: &str,
    sink: &mut futures_util::stream::SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
) {
    match serde_json::from_str::<AgentMessage>(text) {
        Ok(AgentMessage::Request {
            id,
            method,
            params: _,
        }) => {
            warn!("Unhandled method: {method}");
            let response = AgentMessage::Response {
                id,
                result: None,
                error: Some(format!("Not implemented: {method}")),
            };
            if let Ok(json) = serde_json::to_string(&response) {
                let _ = sink.send(Message::Text(json.into())).await;
            }
        }
        Ok(AgentMessage::Response { .. }) => {
            // Agent doesn't expect responses from control plane
        }
        Ok(AgentMessage::Event { event_type, .. }) => {
            info!("Received event: {event_type}");
        }
        Err(e) => {
            warn!("Failed to parse message: {e}");
        }
    }
}

fn jittered_delay(base: Duration) -> Duration {
    use rand::Rng;
    let ms = base.as_millis() as f64;
    let jitter = rand::rng().random_range(0.8..1.2);
    Duration::from_millis((ms * jitter) as u64)
}
