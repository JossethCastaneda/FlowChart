/**
 * GET /api/cron/analytics-sync
 *
 * Cron diario que sincroniza conversaciones de los proveedores de analítica
 * (Cari AI, Botmaker) con watermark/cursor por integración, reintentos y ciclo
 * de vida de SyncJob, y dispara la evaluación de alertas por workspace.
 *
 * Protegido por CRON_SECRET (auth de Vercel cron). No corre durante render.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runScheduledSync } from "@/lib/analytics/cron/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const outcomes = await runScheduledSync();
    const summary = {
      integrations: outcomes.length,
      succeeded: outcomes.filter((o) => o.success).length,
      failed: outcomes.filter((o) => !o.success).length,
      inserted: outcomes.reduce((a, o) => a + o.inserted, 0),
    };
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[cron/analytics-sync] error", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "sync failed" }, { status: 500 });
  }
}
