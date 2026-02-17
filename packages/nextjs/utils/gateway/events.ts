interface GatewayEvent {
  type: "query" | "cache_hit";
  query: string;
  user: string;
  cost: string;
  cached: boolean;
  source?: string;
}

const clients = new Set<ReadableStreamDefaultController>();

export function emitEvent(event: GatewayEvent) {
  const data = JSON.stringify({ ...event, timestamp: Date.now() });
  clients.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
    } catch {
      clients.delete(controller);
    }
  });
}

export function addSSEClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removeSSEClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}
