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
  return PROVIDERS["openai"];
}

export function hasAnyProvider(): boolean {
  return PROVIDERS["openai"].isConfigured();
}

/**
 * Obtiene el proveedor y el modelo real configurado en el Workspace.
 * Al eliminar el módulo de Agentes, Zefirus opera estrictamente con el
 * modelo más potente (GPT-4o) de manera centralizada.
 */
export async function getWorkspaceAiProvider(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workspaceId: string,
): Promise<{ provider: LLMProvider; model: string }> {
  const active = getActiveProvider();
  return { provider: active, model: "gpt-4o" };
}
