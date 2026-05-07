type EventHandler = (data: unknown) => void;

export function createSSEClient(
  path: string,
  handlers: Record<string, EventHandler>,
) {
  let lastEventId: string | undefined;
  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    const url = lastEventId ? `${path}?lastEventId=${lastEventId}` : path;
    source = new EventSource(url);

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
      reconnectTimer = setTimeout(connect, 3000);
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
