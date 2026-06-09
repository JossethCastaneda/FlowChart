import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verificación de seguridad básica para Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Buscar todas las integraciones de Google conectadas
    const integrations = await prisma.integration.findMany({
      where: { provider: "google", connected: true },
    });

    console.log(`[CRON] Starting Google Sync for ${integrations.length} workspaces...`);

    for (const integration of integrations) {
      const workspaceId = integration.workspaceId;
      // const creds = integration.credentials as unknown as GoogleCredentials;
      // const modules = creds.lastRequestedModules || [];

      // Aquí iteraríamos sobre los módulos habilitados por workspace (page_analytics, tag_tracking, etc.)
      // y llamaríamos a las funciones de sus respectivos archivos en lib/integrations/google/*.ts
      // para pre-calcular resultados diarios y guardarlos en una tabla de caché (ej. GoogleMetricsCache).
      
      // TODO: Implementar lógica de fetch de cada módulo y guardado en DB para lectura en dashboard
      // const pageMetrics = await getPageAnalytics(workspaceId, "30daysAgo", "today");
      // await saveToCache(workspaceId, "page_analytics", pageMetrics);
      
      console.log(`[CRON] Synced Google modules for workspace ${workspaceId}`);
    }

    return NextResponse.json({ success: true, count: integrations.length });
  } catch (error: any) {
    console.error("[CRON] Failed to sync Google data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
