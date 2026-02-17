import { Context } from "hono";
import { streamSSE } from "hono/streaming";

// ══════════════════════════════════════════════════════════
//  SSE LIVE FEED — diffuse les events en temps reel
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

// Tous les clients SSE connectes
const clients = new Set<(event: EventPayload) => void>();

/** Envoie un event a tous les clients SSE connectes */
export function emitEvent(payload: EventPayload) {
  for (const send of clients) {
    send(payload);
  }
}

/** Handler SSE — garde la connexion ouverte et stream les events */
export function sseHandler(c: Context) {
  return streamSSE(c, async (stream) => {
    const send = (payload: EventPayload) => {
      stream.writeSSE({
        data: JSON.stringify(payload),
        event: payload.type,
      });
    };

    clients.add(send);

    // Heartbeat toutes les 30s pour garder la connexion vivante
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: "", event: "ping" });
    }, 30_000);

    // Cleanup quand le client se deconnecte
    stream.onAbort(() => {
      clients.delete(send);
      clearInterval(heartbeat);
    });

    // Garder le stream ouvert
    await new Promise(() => {});
  });
}
