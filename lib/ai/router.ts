import type { LLMProvider } from "./types";
import type { ModelRequirements } from "./capabilities";
import { satisfiesRequirements } from "./capabilities";
import { AI_CATALOG } from "./catalog";
import { getProvider, getWorkspaceAiProvider } from "./registry";
import { logger } from "@/lib/logger";

export interface RoutedModel {
  provider: LLMProvider;
  modelId: string; // The UI ID
  providerModelId: string; // The real API ID
}

/**
 * Deterministically routes an AI request to the optimal model based on:
 * 1. Required capabilities (e.g. structured_output, reasoning).
 * 2. Workspace preferences.
 * 3. Fallback priority and availability.
 */
export async function routeAiRequest(
  requirements: ModelRequirements,
  workspaceId: string
): Promise<RoutedModel> {
  // 1. Get workspace preference if any (ignores capabilities temporarily to check intent)
  const pref = await getWorkspaceAiProvider(workspaceId);
  const preferredModelId = pref.model; // e.g. "gemini-1.5-pro"
  
  // 2. Find all models in the catalog that satisfy the requirements and whose providers are configured
  const candidates: Array<{ model: typeof AI_CATALOG[0]["models"][0]; providerId: string }> = [];
  
  for (const p of AI_CATALOG) {
    const providerImpl = getProvider(p.id);
    if (!providerImpl.isConfigured()) continue;
    
    for (const m of p.models) {
      if (satisfiesRequirements(m.capabilities, requirements)) {
        candidates.push({ model: m, providerId: p.id });
      }
    }
  }
  
  if (candidates.length === 0) {
    logger.error("[AI Router] No configured models satisfy the requirements", { requirements });
    throw new Error(`No available AI models satisfy the requirements: ${requirements.required.join(", ")}`);
  }

  // 3. Evaluate candidates
  
  // A. Check if the preferred model satisfies requirements
  const preferredMatch = candidates.find(c => c.model.id === preferredModelId);
  if (preferredMatch) {
    return {
      provider: getProvider(preferredMatch.providerId as any),
      modelId: preferredMatch.model.id,
      providerModelId: preferredMatch.model.providerModelId
    };
  }
  
  // B. Tie-breaker: preferred capabilities
  if (requirements.preferred && requirements.preferred.length > 0) {
    const preferredCapsMatch = candidates.filter(c => 
      requirements.preferred!.every(cap => c.model.capabilities.includes(cap))
    );
    if (preferredCapsMatch.length > 0) {
      return {
        provider: getProvider(preferredCapsMatch[0].providerId as any),
        modelId: preferredCapsMatch[0].model.id,
        providerModelId: preferredCapsMatch[0].model.providerModelId
      };
    }
  }

  // C. Fallback: Return the first capable candidate (which follows catalog order, e.g. Gemini > GPT > Claude)
  const fallback = candidates[0];
  
  logger.warn("[AI Router] Falling back from preferred model due to unmet capabilities", {
    workspaceId,
    preferredModelId,
    fallbackModelId: fallback.model.id,
    requirements
  });
  
  return {
    provider: getProvider(fallback.providerId as any),
    modelId: fallback.model.id,
    providerModelId: fallback.model.providerModelId
  };
}
