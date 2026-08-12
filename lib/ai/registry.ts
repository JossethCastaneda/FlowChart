/**
 * Catálogo de modelos y selección de proveedor activo.
 *
 * Default operativo = Gemini (GEMINI_API_KEY ya existe → funciona el día 1). GPT y
 * Claude quedan LISTOS: en cuanto se agreguen OPENAI_API_KEY / ANTHROPIC_API_KEY,
 * `isConfigured()` los detecta. Para cambiar el cerebro de Aria sin tocar código,
 * fijar ARIA_LLM_PROVIDER=openai|gemini|anthropic.
 */

import type { LLMProvider, ProviderId } from "./types";
import { AI_CATALOG } from "./catalog";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";
import { anthropicProvider } from "./providers/anthropic";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ProviderCatalog {
  default: string;
  available: string[];
}

// Derivado del catálogo (lib/ai/catalog.ts = nodo principal, fuente única de
// verdad): todo modelo visible en la UI es seleccionable y viceversa.
export const MODELS: Record<ProviderId, ProviderCatalog> = Object.fromEntries(
  AI_CATALOG.map((p) => [p.id, { default: p.recommendedModel, available: p.models.map((m) => m.id) }]),
) as Record<ProviderId, ProviderCatalog>;

const PROVIDERS: Record<ProviderId, LLMProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

// Orden de fallback cuando no se fija ARIA_LLM_PROVIDER. Gemini primero (key actual).
const PREFERENCE: ProviderId[] = ["gemini", "anthropic", "openai"];

function isProviderId(v: string): v is ProviderId {
  return v === "openai" || v === "gemini" || v === "anthropic";
}

export function getProvider(id: ProviderId): LLMProvider {
  return PROVIDERS[id];
}

export function listProviders(): { id: ProviderId; configured: boolean; defaultModel: string }[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).map((id) => ({
    id,
    configured: PROVIDERS[id].isConfigured(),
    defaultModel: PROVIDERS[id].defaultModel,
  }));
}

export function getActiveProvider(): LLMProvider {
  // Deterministic fallback based on environment variables
  for (const id of PREFERENCE) {
    if (PROVIDERS[id].isConfigured()) {
      return PROVIDERS[id];
    }
  }
  return PROVIDERS["gemini"]; // fallback to default even if not configured
}

export function hasAnyProvider(): boolean {
  return PREFERENCE.some((id) => PROVIDERS[id].isConfigured());
}

export async function getWorkspaceAiProvider(
  workspaceId: string,
): Promise<{ provider: LLMProvider; model: string }> {
  try {
    const ws = await prisma.workspaceSettings.findUnique({
      where: { workspaceId },
      select: { extConfig: true },
    });
    const ext = (ws?.extConfig as Record<string, unknown>) || {};
    // La configuración puede definir ariaProvider y ariaGenerativeModel
    const preferredProviderId = ext.ariaProvider as string | undefined;
    const preferredModel = ext.ariaGenerativeModel as string | undefined;

    if (preferredProviderId && isProviderId(preferredProviderId) && PROVIDERS[preferredProviderId].isConfigured()) {
      const provider = PROVIDERS[preferredProviderId];
      return { provider, model: preferredModel || provider.defaultModel };
    }
  } catch (err) {
    logger.warn("[AI Registry] Fallback a getActiveProvider por error al leer WorkspaceSettings", { workspaceId, error: String(err) });
  }
  
  const active = getActiveProvider();
  return { provider: active, model: active.defaultModel };
}
