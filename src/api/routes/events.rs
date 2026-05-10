use std::convert::Infallible;

use axum::extract::{Path, Query, State};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::routing::get;
use axum::Router;
use futures_util::stream::Stream;
use serde::Deserialize;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;

use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/events", get(global_events))
        .route("/apps/{id}/events", get(app_events))
        .route("/apps/{id}/deploys/{did}/events", get(deploy_events))
}

#[derive(Debug, Deserialize)]
struct ReconnectParams {
    #[serde(rename = "lastEventId")]
    last_event_id: Option<u64>,
}

async fn global_events(
    State(state): State<AppState>,
    Query(params): Query<ReconnectParams>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    make_sse_stream(state, params.last_event_id, None, None)
}

async fn app_events(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<ReconnectParams>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    make_sse_stream(state, params.last_event_id, Some(id), None)
}

async fn deploy_events(
    State(state): State<AppState>,
    Path((id, did)): Path<(String, String)>,
    Query(params): Query<ReconnectParams>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    make_sse_stream(state, params.last_event_id, Some(id), Some(did))
}

fn make_sse_stream(
    state: AppState,
    last_event_id: Option<u64>,
    filter_app_id: Option<String>,
    filter_deploy_id: Option<String>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.event_bus.subscribe();
    let stream = BroadcastStream::new(rx);

    let filtered = stream.filter_map(move |result| match result {
        Ok(event) => {
            if let Some(last_id) = last_event_id {
                if event.id <= last_id {
                    return None;
                }
            }

            if let Some(ref app_id) = filter_app_id {
                if event.app_id.as_deref() != Some(app_id) {
                    return None;
                }
            }

            if let Some(ref deploy_id) = filter_deploy_id {
                if event.deploy_id.as_deref() != Some(deploy_id) {
                    return None;
                }
            }

            let sse_event = Event::default()
                .event(event.event_type.as_str())
                .id(event.id.to_string())
                .json_data(&event.data)
                .unwrap_or_else(|_| Event::default().comment("serialization error"));

            Some(Ok(sse_event))
        }
        Err(_) => None,
    });

    Sse::new(filtered).keep_alive(KeepAlive::default())
}
