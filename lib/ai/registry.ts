/**
 * Catálogo de modelos y selección de proveedor activo.
 *
 * Default operativo = Gemini (GEMINI_API_KEY ya existe → funciona el día 1). GPT y
 * Claude quedan LISTOS: en cuanto se agreguen OPENAI_API_KEY / ANTHROPIC_API_KEY,
 * `isConfigured()` los detecta. Para cambiar el cerebro de Aria sin tocar código,
 * fijar ARIA_LLM_PROVIDER=openai|gemini|anthropic.
 */

import type { LLMProvider, ProviderId } from "./types";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";
import { anthropicProvider } from "./providers/anthropic";

export interface ProviderCatalog {
  default: string;
  available: string[];
}

export const MODELS: Record<ProviderId, ProviderCatalog> = {
  openai: { default: "gpt-4.1", available: ["gpt-4.1", "gpt-4o", "o4-mini"] },
  gemini: { default: "gemini-2.5-flash", available: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  anthropic: {
    default: "claude-sonnet-4-6",
    available: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
  },
};

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
  const forced = process.env.ARIA_LLM_PROVIDER;
  if (forced && isProviderId(forced) && PROVIDERS[forced].isConfigured()) {
    return PROVIDERS[forced];
  }
  for (const id of PREFERENCE) {
    if (PROVIDERS[id].isConfigured()) return PROVIDERS[id];
  }
  // Ninguno configurado: devolvemos el preferido (lanzará un error claro al usarse).
  return PROVIDERS[PREFERENCE[0]];
}

export function hasAnyProvider(): boolean {
  return (Object.keys(PROVIDERS) as ProviderId[]).some((id) => PROVIDERS[id].isConfigured());
}
