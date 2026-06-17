import prisma from "@/lib/prisma";
import { normalizeIntegrationProvider } from "./project-scope";

// ============================================================================
// Modo de integración por workspace+proveedor (spec §6, §8 — "modo demo/mock"
// vs "modo producción"). La integración guarda `config.mode` ("mock" | "real").
// Default = "mock": un workspace sin configurar NUNCA dispara llamadas reales.
//
// FIX (jun 2026): los adapters preguntan por su provider NORMALIZADO (p. ej.
// "cari_ai"), pero la integración real se guarda como "cari" (CariConnectModal →
// workspace/integrations). Antes `isRealMode(ws,"cari_ai")` buscaba provider
// "cari_ai" exacto, no encontraba la integración "cari" y Cari quedaba
// PERMANENTEMENTE en mock aunque el usuario pusiera mode:"real". Ahora se compara
// por provider normalizado en ambos lados, así "cari" y "cari_ai" resuelven igual.
// ============================================================================

export async function isRealMode(workspaceId: string, provider: string): Promise<boolean> {
  const target = normalizeIntegrationProvider(provider) ?? provider;
  const integrations = await prisma.integration.findMany({
    where: { workspaceId, provider: { in: ["cari", "cari_ai", "botmaker"] } },
    select: { provider: true, config: true },
  });
  return integrations.some((i) => {
    const norm = normalizeIntegrationProvider(i.provider) ?? i.provider;
    const mode = (i.config as { mode?: string } | null)?.mode;
    return norm === target && mode === "real";
  });
}
