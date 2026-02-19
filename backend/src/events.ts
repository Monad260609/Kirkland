import { Context } from "hono";
import { streamSSE } from "hono/streaming";

// ══════════════════════════════════════════════════════════
//  SSE LIVE FEED — broadcasts events in real time
// ══════════════════════════════════════════════════════════

type EventPayload = {
  type: string;
  query: string;
  user: string;
  cost: string;
  cached: boolean;
  source?: string;
  txHash?: string | null;
};

// All connected SSE clients
const clients = new Set<(event: EventPayload) => void>();

/** Send an event to all connected SSE clients */
export function emitEvent(payload: EventPayload) {
  for (const send of clients) {
    send(payload);
  }
}

/** SSE handler — keeps the connection open and streams events */
export function sseHandler(c: Context) {
  return streamSSE(c, async (stream) => {
    const send = (payload: EventPayload) => {
      stream.writeSSE({
        data: JSON.stringify(payload),
        event: payload.type,
      });
    };

    clients.add(send);

    // Heartbeat every 30s to keep the connection alive
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: "", event: "ping" });
    }, 30_000);

    // Cleanup when the client disconnects
    stream.onAbort(() => {
      clients.delete(send);
      clearInterval(heartbeat);
    });

    // Keep the stream open
    await new Promise(() => {});
  });
}
