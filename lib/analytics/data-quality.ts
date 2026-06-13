// ============================================================================
// Validaciones de calidad de datos (spec §27). Funciones PURAS que recorren el
// dataset normalizado y devuelven issues. La ruta API las ejecuta scoped por
// workspace; opcionalmente se pueden persistir en DataQualityIssue.
// ============================================================================

export interface DqConversation {
  id?: string;
  provider?: string | null;
  providerConversationId?: string | null;
  conversationStartedAt?: Date | string | null;
  conversationEndedAt?: Date | string | null;
  status?: string | null;
  outcome?: string | null;
  channel?: string | null;
  durationSeconds?: number | null;
  firstResponseTimeSeconds?: number | null;
  handleTimeSeconds?: number | null;
}

export type DqSeverity = "info" | "warning" | "critical";

export interface DataQualityIssueResult {
  conversationId?: string;
  provider?: string;
  issueType: string;
  severity: DqSeverity;
  details: string;
}

const KNOWN_CHANNELS = new Set(["whatsapp", "webchat", "web", "facebook", "instagram", "telegram", "sms", "email"]);

export function findDataQualityIssues(conversations: DqConversation[]): DataQualityIssueResult[] {
  const issues: DataQualityIssueResult[] = [];
  const seenExternalIds = new Set<string>();

  for (const c of conversations) {
    const base = { conversationId: c.id, provider: c.provider || undefined };

    if (!c.conversationStartedAt) {
      issues.push({ ...base, issueType: "missing_start_date", severity: "critical", details: "Conversación sin fecha de inicio." });
    }
    if (!c.providerConversationId) {
      issues.push({ ...base, issueType: "missing_external_id", severity: "warning", details: "Conversación sin ID externo del proveedor." });
    } else if (seenExternalIds.has(c.providerConversationId)) {
      issues.push({ ...base, issueType: "duplicate_external_id", severity: "warning", details: `ID externo duplicado: ${c.providerConversationId}` });
    } else {
      seenExternalIds.add(c.providerConversationId);
    }

    if (typeof c.durationSeconds === "number" && c.durationSeconds < 0) {
      issues.push({ ...base, issueType: "negative_duration", severity: "critical", details: "Duración negativa." });
    }
    if (typeof c.firstResponseTimeSeconds === "number" && typeof c.durationSeconds === "number" && c.firstResponseTimeSeconds > c.durationSeconds) {
      issues.push({ ...base, issueType: "frt_gt_duration", severity: "warning", details: "FRT mayor que la duración total." });
    }
    if (typeof c.handleTimeSeconds === "number" && typeof c.durationSeconds === "number" && c.handleTimeSeconds > c.durationSeconds) {
      issues.push({ ...base, issueType: "aht_gt_duration", severity: "warning", details: "AHT mayor que la duración total." });
    }
    if (c.status === "closed" && !c.outcome) {
      issues.push({ ...base, issueType: "closed_without_outcome", severity: "warning", details: "Conversación cerrada sin outcome clasificado." });
    }
    if (c.channel && !KNOWN_CHANNELS.has(c.channel.toLowerCase())) {
      issues.push({ ...base, issueType: "unknown_channel", severity: "info", details: `Canal no mapeado: ${c.channel}` });
    }
  }

  return issues;
}

export interface DataQualitySummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<DqSeverity, number>;
}

export function summarizeIssues(issues: DataQualityIssueResult[]): DataQualitySummary {
  const byType: Record<string, number> = {};
  const bySeverity: Record<DqSeverity, number> = { info: 0, warning: 0, critical: 0 };
  for (const i of issues) {
    byType[i.issueType] = (byType[i.issueType] || 0) + 1;
    bySeverity[i.severity] += 1;
  }
  return { total: issues.length, byType, bySeverity };
}
