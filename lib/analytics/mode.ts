import prisma from "@/lib/prisma";

// ============================================================================
// Modo de integración por workspace+proveedor (spec §6, §8 — "modo demo/mock"
// vs "modo producción"). La integración guarda `config.mode` ("mock" | "real").
// Default = "mock": un workspace sin configurar NUNCA dispara llamadas reales.
// ============================================================================

export async function isRealMode(workspaceId: string, provider: string): Promise<boolean> {
  const integ = await prisma.integration.findFirst({
    where: { workspaceId, provider },
    select: { config: true },
  });
  const config = (integ?.config ?? null) as { mode?: string } | null;
  return config?.mode === "real";
}
