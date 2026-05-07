use std::convert::Infallible;
use std::time::Duration;

use axum::response::sse::{Event, KeepAlive, Sse};
use axum::routing::get;
use axum::Router;
use futures_util::stream::Stream;
use tokio_stream::wrappers::IntervalStream;
use tokio_stream::StreamExt;

use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/events", get(event_stream))
}

async fn event_stream() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let interval = tokio::time::interval(Duration::from_secs(30));
    let stream = IntervalStream::new(interval).map(|_| {
        Ok(Event::default()
            .event("heartbeat")
            .data("ping"))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
