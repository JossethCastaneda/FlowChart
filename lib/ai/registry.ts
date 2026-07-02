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
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

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

/**
 * Mapeo de los modelos seleccionables en la UI de Botmaker hacia los modelos reales
 * de Vercel AI SDK.
 */
const UI_MODEL_MAPPING: Record<string, { provider: ProviderId; model: string }> = {
  "gpt-4.1-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-5.5": { provider: "openai", model: "gpt-4o" },
  "gpt-5.4": { provider: "openai", model: "gpt-4o" },
  "gpt-5.4-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-5.4-nano": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-5.2": { provider: "openai", model: "gpt-4o" },
  "gpt-5.1": { provider: "openai", model: "gpt-4o" },
  "gpt-4.1-nano": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-4.1": { provider: "openai", model: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-5-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-5-nano": { provider: "openai", model: "gpt-4o-mini" },
  "gpt-5": { provider: "openai", model: "gpt-4o" },
  "gemini-3.5-flash": { provider: "gemini", model: "gemini-1.5-flash" },
  "gemini-3.1-pro": { provider: "gemini", model: "gemini-1.5-pro" },
};

/**
 * Resuelve un valor de selección guardado (extConfig.ariaGenerativeModel) a un
 * proveedor + modelo real. Soporta tres formas, en orden:
 *  1. Alias de la UI de Botmaker (UI_MODEL_MAPPING) — p.ej. "gpt-5".
 *  2. ID de modelo real del catálogo (MODELS) — p.ej. "claude-sonnet-4-6"
 *     (lo que escribe el catálogo de IA de Crecimiento).
 *  3. ID de proveedor — "openai" | "gemini" | "anthropic" → su modelo por defecto.
 * Devuelve null si no se reconoce.
 */
export function resolveSelection(selected: string): { provider: ProviderId; model: string } | null {
  // 1. ID de modelo real del catálogo (lo que guarda el selector de Crecimiento).
  //    Va PRIMERO para que "gpt-4.1" resuelva a gpt-4.1 real y no colisione con el
  //    alias de Botmaker "gpt-4.1" (→ gpt-4o). La única colisión posible es esa.
  for (const id of Object.keys(MODELS) as ProviderId[]) {
    if (MODELS[id].available.includes(selected)) return { provider: id, model: selected };
  }
  // 2. Alias de la UI de Botmaker (p.ej. "gpt-5", "gpt-4.1-mini", "gemini-3.5-flash").
  const mapping = UI_MODEL_MAPPING[selected];
  if (mapping) return mapping;
  // 3. ID de proveedor → su modelo por defecto.
  if (isProviderId(selected)) return { provider: selected, model: PROVIDERS[selected].defaultModel };
  return null;
}

/**
 * Obtiene el proveedor y el modelo real configurado en el Workspace.
 * Si el workspace no tiene uno configurado o el proveedor elegido no tiene API key,
 * cae al proveedor activo por defecto (env / preferencia).
 */
export async function getWorkspaceAiProvider(
  workspaceId: string,
): Promise<{ provider: LLMProvider; model: string }> {
  try {
    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId },
      select: { extConfig: true },
    });
    const extConfig = (settings?.extConfig as Record<string, unknown>) || {};
    const stored = extConfig.ariaGenerativeModel;
    // Solo respetamos una selección REAL guardada. Si no hay ninguna, no se
    // sintetiza un default fantasma: se cae al proveedor activo por defecto
    // (env / preferencia = Gemini), coherente con getActiveProvider().
    if (typeof stored === "string" && stored.length > 0) {
      const resolved = resolveSelection(stored);
      if (resolved && PROVIDERS[resolved.provider].isConfigured()) {
        return { provider: PROVIDERS[resolved.provider], model: resolved.model };
      }
    }
  } catch (err) {
    logger.error("Error reading Workspace AI settings:", err);
  }

  const active = getActiveProvider();
  return { provider: active, model: active.defaultModel };
}
