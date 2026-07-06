import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/inbox/stream — tiempo real del inbox vía Server-Sent Events.
 *
 * El webhook ya persiste cada mensaje en InboxConversation/InboxMessage; este
 * endpoint mantiene una conexión abierta por cliente y vigila una marca de agua
 * barata (max(updatedAt) + count del workspace) del lado del servidor. Cuando
 * cambia, emite `event: change` y el cliente refresca al instante — sin polling
 * de 30s en el navegador.
 *
 * Sin estado local (apto Vercel/Fluid): nada vive en memoria entre requests;
 * la conexión se cierra sola antes del límite de la función y EventSource
 * reconecta automáticamente del lado del cliente.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHECK_INTERVAL_MS = 2_500;
const HEARTBEAT_MS = 25_000;
// Cerrar antes de maxDuration para que el cliente reconecte limpio.
const STREAM_LIFETIME_MS = 270_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return new Response("No auth", { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return new Response("No workspace", { status: 400 });

  const encoder = new TextEncoder();

  const watermark = async (): Promise<string | null> => {
    try {
      const agg = await prisma.inboxConversation.aggregate({
        where: { workspaceId },
        _max: { updatedAt: true },
        _count: { _all: true },
      });
      return `${agg._max.updatedAt?.getTime() ?? 0}:${agg._count._all}`;
    } catch (err) {
      logger.warn("[INBOX-STREAM] watermark query failed", {
        workspaceId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      };
      request.signal.addEventListener("abort", close);

      let last = await watermark();
      // retry: le dice a EventSource cuánto esperar antes de reconectar.
      send(`retry: 3000\nevent: ready\ndata: {}\n\n`);

      const started = Date.now();
      let lastBeat = Date.now();
      while (!closed && !request.signal.aborted && Date.now() - started < STREAM_LIFETIME_MS) {
        await sleep(CHECK_INTERVAL_MS);
        if (closed || request.signal.aborted) break;
        const current = await watermark();
        if (current !== null && current !== last) {
          last = current;
          send(`event: change\ndata: {"at":${Date.now()}}\n\n`);
          lastBeat = Date.now();
        } else if (Date.now() - lastBeat >= HEARTBEAT_MS) {
          send(`: ping\n\n`);
          lastBeat = Date.now();
        }
      }
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
