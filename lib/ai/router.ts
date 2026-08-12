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
  tier?: ModelTier;
  auditTrail?: {
    reason: string;
    candidatesConsidered: string[];
    selectedMode: "SMART" | "LOCKED";
  };
}

export interface RouteAiRequestOptions {
  requirements: ModelRequirements;
  workspaceId: string;
  moduleKey?: ModuleKey;
  taskId?: string;
}

export async function routeAiRequest(
  options: RouteAiRequestOptions
): Promise<RoutedModel> {
  const { requirements, workspaceId, moduleKey, taskId } = options;
  const pref = await getWorkspaceAiProvider(workspaceId);
  const preferredModelId = pref.model;
  const providerMode = pref.providerMode; // SMART | LOCKED
  
  // 1. Determine Required Tier based on Module & Task
  let targetTier: ModelTier | null = null;
  if (moduleKey) {
    const policy = new SmartAiEconomicRouter().getPolicy(moduleKey);
    targetTier = policy.preferredTier;
  }
  
  // Task-level strict overrides
  if (taskId === "mmm_math" || taskId === "math") targetTier = "E0";
  if (taskId === "synthesis") targetTier = "E3";

  // E0 constraint check
  if (targetTier === "E0") {
    throw new Error("[AI Router] E0 constraint violation: Task requires deterministic mathematical truth. LLM cannot be used.");
  }

  // 2. LOCKED Mode Constraint
  if (providerMode === "LOCKED") {
    const matchedProvider = AI_CATALOG.find(c => c.id === pref.provider.id);
    const matchedModel = matchedProvider?.models.find(m => m.id === preferredModelId);
    
    if (!matchedProvider || !matchedModel) {
      // Fallback if catalog missing
      return {
        provider: pref.provider,
        modelId: preferredModelId,
        providerModelId: preferredModelId,
        auditTrail: {
          reason: "Model missing from catalog, fallback forced",
          candidatesConsidered: [preferredModelId],
          selectedMode: "LOCKED"
        }
      };
    }
    
    // Strict PROVIDER_LOCKED verification
    if (!satisfiesRequirements(matchedModel.capabilities, requirements)) {
      throw new Error(`[AI Router] STRICT ENFORCEMENT: LOCKED mode model (${preferredModelId}) lacks required capabilities: ${requirements.required.join(", ")}`);
    }
    
    return {
      provider: pref.provider,
      modelId: preferredModelId,
      providerModelId: matchedModel.providerModelId,
      auditTrail: {
        reason: "User enforced PROVIDER_LOCKED policy",
        candidatesConsidered: [preferredModelId],
        selectedMode: "LOCKED"
      }
    };
  }
  
  // 3. SMART Mode Routing (Least cost capable model satisfying Tier + Requirements)
  const candidates: Array<{ model: typeof AI_CATALOG[0]["models"][0]; providerId: string }> = [];
  
  for (const p of AI_CATALOG) {
    const providerImpl = getProvider(p.id as any);
    if (!providerImpl.isConfigured()) continue;
    
    for (const m of p.models) {
      if (satisfiesRequirements(m.capabilities, requirements)) {
        // Filter by target tier mapped to power
        if (targetTier === "E1" && m.power > 3) continue; // Don't overspend if E1 is enough
        if (targetTier === "E2" && m.power < 4) continue; // Must have at least E2 power
        if (targetTier === "E3" && m.power < 5) continue; // Must have E3 power
        candidates.push({ model: m, providerId: p.id });
      }
    }
  }
  
  if (candidates.length === 0) {
    // Relax tier constraints if no candidate found, but keep requirements
    logger.warn("[AI Router] No models matched tier constraints, relaxing tier filter.");
    for (const p of AI_CATALOG) {
      if (!getProvider(p.id as any).isConfigured()) continue;
      for (const m of p.models) {
        if (satisfiesRequirements(m.capabilities, requirements)) {
          candidates.push({ model: m, providerId: p.id });
        }
      }
    }
  }

  if (candidates.length === 0) {
    logger.error("[AI Router] No configured models satisfy the requirements", { requirements });
    throw new Error(`No available AI models satisfy the requirements: ${requirements.required.join(", ")}`);
  }

  // Sort candidates by power (lowest power first to minimize cost), then by catalog order
  candidates.sort((a, b) => a.model.power - b.model.power);

  // The first candidate is now the least-power capable model (closest to target tier)
  const smartChoice = candidates[0];
  
  return {
    provider: getProvider(smartChoice.providerId as any),
    modelId: smartChoice.model.id,
    providerModelId: smartChoice.model.providerModelId,
    tier: targetTier || "E1",
    auditTrail: {
      reason: `SMART routing selected least-power capable model (Power: ${smartChoice.model.power}) satisfying requirements.`,
      candidatesConsidered: candidates.map(c => c.model.id),
      selectedMode: "SMART"
    }
  };
}
