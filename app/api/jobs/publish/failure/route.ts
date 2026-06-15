import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyQstashSignature } from "@/lib/qstash";

/**
 * POST /api/jobs/publish/failure
 *
 * Failure callback de QStash. Se invoca SOLO cuando se agotan todos los
 * reintentos del job de publicación. Marca el post como "Failed" para que deje
 * de aparecer eternamente como "Scheduled" y el usuario vea el problema.
 *
 * QStash firma este callback, así que se exige firma válida (fail-closed). No se
 * reenvía el bearer del worker en los callbacks, por lo que la firma es la única
 * vía de autenticación: requiere QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY.
 *
 * Payload relevante de QStash: { sourceBody (base64), sourceMessageId, status,
 * retried, maxRetries, dlqId, url, ... }.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifyQstashSignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody || "{}");

    // El cuerpo original del job viene en base64 dentro de sourceBody.
    let publishJobId: string | undefined;
    if (payload.sourceBody) {
      try {
        const decoded = JSON.parse(
          Buffer.from(payload.sourceBody, "base64").toString("utf8")
        );
        publishJobId = decoded.publishJobId;
      } catch {
        /* ignore parse errors, handled below */
      }
    }

    if (!publishJobId) {
      console.error(
        "[QSTASH_FAILURE] No se pudo extraer publishJobId del payload:",
        JSON.stringify(payload)
      );
      // 200 para que QStash no reintente indefinidamente el propio callback.
      return NextResponse.json({ ok: false, reason: "no_publish_job_id" });
    }

    const errMsg = `La publicación automática falló tras agotar los reintentos de QStash (status ${
      payload.status ?? "?"
    }, intentos ${payload.retried ?? "?"}/${payload.maxRetries ?? "?"}).`;

    // Marcar Failed salvo que ya esté "Published" (entrega tardía o publicación
    // manual): no pisamos un éxito. Cubre Scheduled/Publishing/Failed.
    const updated = await prisma.scheduledPost.updateMany({
      where: { id: publishJobId, status: { not: "Published" } },
      data: { status: "Failed", error: errMsg, qStashMessageId: null },
    });

    console.error(
      `[QSTASH_FAILURE] post=${publishJobId} marcado Failed (filas=${updated.count}). dlqId=${
        payload.dlqId ?? "-"
      }`
    );

    return NextResponse.json({ ok: true, updated: updated.count });
  } catch (e: any) {
    console.error("[QSTASH_FAILURE] Error procesando callback:", e);
    // 200 para evitar bucles de reintento del callback de fallo.
    return NextResponse.json({ ok: false, error: e?.message || "Error" });
  }
}
