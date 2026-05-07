type EventHandler = (data: unknown) => void;

const MAX_RETRY_DELAY = 30_000;

export function createSSEClient(
  path: string,
  handlers: Record<string, EventHandler>,
) {
  let lastEventId: string | undefined;
  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;

  function connect() {
    const url = lastEventId ? `${path}?lastEventId=${lastEventId}` : path;
    source = new EventSource(url);

    source.onopen = () => {
      retryCount = 0;
    };

    for (const [eventType, handler] of Object.entries(handlers)) {
      source.addEventListener(eventType, ((event: MessageEvent) => {
        if (event.lastEventId) lastEventId = event.lastEventId;
        try {
          handler(JSON.parse(event.data));
        } catch {
          handler(event.data);
        }
      }) as EventListener);
    }

    source.onerror = () => {
      source?.close();
      const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      reconnectTimer = setTimeout(connect, jitter);
      retryCount++;
    };
  }

  connect();

  return {
    close() {
      source?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    },
  };
}
