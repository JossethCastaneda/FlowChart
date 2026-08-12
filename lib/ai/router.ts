import type { LLMProvider } from "./types";
import type { ModelRequirements } from "./capabilities";
import { satisfiesRequirements } from "./capabilities";
import { AI_CATALOG } from "./catalog";
import { getProvider, getWorkspaceAiProvider } from "./registry";
import { logger } from "@/lib/logger";
import { ModuleKey } from "../flowchart-kit/modules";

export type ModelTier = "E0" | "E1" | "E2" | "E3" | "S";

/**
 * E0: Deterministic (No LLM. Financial truth, taxes, MMM math, permissions, etc.)
 * E1: Economy (Gemini Flash-Lite, Haiku, GPT-5.6-Luna)
 * E2: Balanced (Gemini Flash, Sonnet, GPT-5.6-Terra)
 * E3: Frontier (Gemini Reasoning, Opus, GPT-5.6-Sol)
 * S: Specialized (Vision, Audio, Video, Embedding)
 */

export interface RoutingPolicy {
  minimumTier: ModelTier;
  preferredTier: ModelTier;
  fallbackTier: ModelTier;
  orchestratorRequired: boolean;
  riskClass: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export const MODULE_ROUTING_POLICIES: Record<ModuleKey, RoutingPolicy> = {
  resumen: { minimumTier: "E1", preferredTier: "E1", fallbackTier: "E2", orchestratorRequired: false, riskClass: "LOW" },
  clientes: { minimumTier: "E1", preferredTier: "E1", fallbackTier: "E1", orchestratorRequired: false, riskClass: "LOW" },
  publicacion: { minimumTier: "E2", preferredTier: "E2", fallbackTier: "E3", orchestratorRequired: true, riskClass: "MEDIUM" },
  inbox: { minimumTier: "E1", preferredTier: "E2", fallbackTier: "E2", orchestratorRequired: false, riskClass: "MEDIUM" },
  anuncios: { minimumTier: "E2", preferredTier: "E3", fallbackTier: "E3", orchestratorRequired: true, riskClass: "HIGH" },
  escucha: { minimumTier: "E1", preferredTier: "E2", fallbackTier: "E2", orchestratorRequired: false, riskClass: "LOW" },
  envivo: { minimumTier: "E1", preferredTier: "E1", fallbackTier: "E2", orchestratorRequired: false, riskClass: "LOW" },
  briefs: { minimumTier: "E2", preferredTier: "E3", fallbackTier: "E3", orchestratorRequired: true, riskClass: "MEDIUM" },
  tareas: { minimumTier: "E1", preferredTier: "E1", fallbackTier: "E2", orchestratorRequired: false, riskClass: "LOW" },
  chatbots: { minimumTier: "E1", preferredTier: "E2", fallbackTier: "E2", orchestratorRequired: true, riskClass: "HIGH" },
  integraciones: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  configuracion: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  mmm: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  optimization: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  aprobaciones: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  reportes: { minimumTier: "E1", preferredTier: "E2", fallbackTier: "E2", orchestratorRequired: false, riskClass: "LOW" },
  biblioteca: { minimumTier: "E1", preferredTier: "E1", fallbackTier: "E1", orchestratorRequired: false, riskClass: "LOW" },
  datos: { minimumTier: "E1", preferredTier: "E2", fallbackTier: "E2", orchestratorRequired: false, riskClass: "MEDIUM" },
  competidores: { minimumTier: "E1", preferredTier: "E2", fallbackTier: "E2", orchestratorRequired: false, riskClass: "MEDIUM" },
  linkinbio: { minimumTier: "E1", preferredTier: "E1", fallbackTier: "E1", orchestratorRequired: false, riskClass: "LOW" },
  roles: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  api: { minimumTier: "E0", preferredTier: "E0", fallbackTier: "E0", orchestratorRequired: false, riskClass: "CRITICAL" },
  aria: { minimumTier: "E3", preferredTier: "E3", fallbackTier: "E3", orchestratorRequired: true, riskClass: "HIGH" },
};

export class SmartAiEconomicRouter {
  
  public getPolicy(moduleKey: ModuleKey): RoutingPolicy {
    return MODULE_ROUTING_POLICIES[moduleKey] || {
      minimumTier: "E1", preferredTier: "E2", fallbackTier: "E3", orchestratorRequired: false, riskClass: "MEDIUM"
    };
  }

  public validateMargin(
    estimatedProviderCost: number, 
    estimatedCustomerCharge: number, 
    minMarginPercent: number = 50
  ): { approved: boolean; marginPercent: number } {
    if (estimatedCustomerCharge === 0) {
      return { approved: true, marginPercent: 0 };
    }
    
    const margin = estimatedCustomerCharge - estimatedProviderCost;
    const marginPercent = (margin / estimatedCustomerCharge) * 100;
    
    return {
      approved: marginPercent >= minMarginPercent,
      marginPercent
    };
  }
}

export interface RoutedModel {
  provider: LLMProvider;
  modelId: string;
  providerModelId: string;
}

export async function routeAiRequest(
  requirements: ModelRequirements,
  workspaceId: string
): Promise<RoutedModel> {
  const pref = await getWorkspaceAiProvider(workspaceId);
  const preferredModelId = pref.model;
  
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

  const preferredMatch = candidates.find(c => c.model.id === preferredModelId);
  if (preferredMatch) {
    return {
      provider: getProvider(preferredMatch.providerId as any),
      modelId: preferredMatch.model.id,
      providerModelId: preferredMatch.model.providerModelId
    };
  }
  
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
