import { z } from "zod";
import type { 
  CreateSnapshotSchema, 
  CreateObjectiveSchema, 
  CanonicalMetricSchema 
} from "../contracts";

type Snapshot = z.infer<typeof CreateSnapshotSchema>;
type Objective = z.infer<typeof CreateObjectiveSchema>;
type Metric = z.infer<typeof CanonicalMetricSchema>;

export interface OptimizationContext {
  clientId: string;
  period: { from: string; to: string };
  objective: {
    primaryKpi: string;
    direction: string;
    targetValue: number;
    guardrails: any[];
  };
  metricsSummary: {
    totalSpend: number;
    totalConversions: number;
    cpa: number;
    topPerformingCampaigns: Array<{
      campaignId: string;
      spend: number;
      conversions: number;
      cpa: number;
    }>;
    underperformingCampaigns: Array<{
      campaignId: string;
      spend: number;
      conversions: number;
      cpa: number;
    }>;
  };
}

/**
 * Transforms raw database/snapshot data into a minimized, LLM-friendly context.
 * We avoid sending 250,000 metrics directly to the LLM to save tokens and prevent distraction.
 */
export function buildOptimizationContext(
  snapshot: Snapshot, 
  objective: Objective
): OptimizationContext {
  const metrics = snapshot.normalizedMetrics;
  
  // Aggregate metrics by campaign
  const campaignAgg = new Map<string, { spend: number; conversions: number }>();
  let totalSpend = 0;
  let totalConversions = 0;

  for (const m of metrics) {
    if (m.level !== "campaign" && !m.campaignId) continue;
    
    const cid = m.campaignId || m.entityId;
    const current = campaignAgg.get(cid) || { spend: 0, conversions: 0 };
    current.spend += m.spend;
    current.conversions += m.conversions;
    campaignAgg.set(cid, current);
    
    totalSpend += m.spend;
    totalConversions += m.conversions;
  }

  const campaignStats = Array.from(campaignAgg.entries()).map(([campaignId, stats]) => {
    return {
      campaignId,
      spend: stats.spend,
      conversions: stats.conversions,
      cpa: stats.conversions > 0 ? stats.spend / stats.conversions : stats.spend > 0 ? Infinity : 0
    };
  });

  // Sort by CPA to find outliers
  const activeCampaigns = campaignStats.filter(c => c.spend > 0);
  activeCampaigns.sort((a, b) => a.cpa - b.cpa);

  const topPerforming = activeCampaigns.slice(0, 3);
  const underperforming = activeCampaigns.filter(c => c.cpa === Infinity || c.cpa > (objective.targetValue || 9999)).slice(0, 3);

  return {
    clientId: snapshot.clientId,
    period: snapshot.period,
    objective: {
      primaryKpi: objective.primaryKpi,
      direction: objective.direction,
      targetValue: objective.targetValue,
      guardrails: objective.guardrails,
    },
    metricsSummary: {
      totalSpend,
      totalConversions,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      topPerformingCampaigns: topPerforming,
      underperformingCampaigns: underperforming,
    }
  };
}
