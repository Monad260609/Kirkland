import { addSSEClient, removeSSEClient } from "~~/utils/gateway/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(controller);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          removeSSEClient(controller);
        }
      }, 15000);
    },
    cancel(controller: ReadableStreamDefaultController) {
      removeSSEClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
