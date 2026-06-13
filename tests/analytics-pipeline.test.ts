import { describe, it, expect } from "vitest";
import { CariAiAnalyticsAdapter } from "../lib/analytics/adapters/CariAiAnalyticsAdapter";
import { BotmakerAnalyticsAdapter } from "../lib/analytics/adapters/BotmakerAnalyticsAdapter";
import type { NormalizedConversationInput } from "../lib/analytics/adapters/AnalyticsProviderAdapter";
import { buildConversationWhere, parseFilters } from "../lib/analytics/query";
import { applyOutcomeRules, type OutcomeRuleLike } from "../lib/analytics/kpis/rules";
import { computeKpis } from "../lib/analytics/kpis/engine";
import { findDataQualityIssues } from "../lib/analytics/data-quality";
import { hashPII, maskPhone, maskEmail } from "../lib/analytics/privacy";
import {
  aggregateAgents, aggregateCampaigns, aggregateServices, aggregateFunnel, aggregateOperations,
  type AggConversation,
} from "../lib/analytics/kpis/aggregations";

// ── Normalización por adaptador (spec §4, §10) ───────────────────────────────
describe("Normalization", () => {
  it("Cari AI mapea campos propietarios al modelo interno", () => {
    const a = new CariAiAnalyticsAdapter();
    const n = a.normalizeRawData(
      { id_conversacion: "x1", canal: "WhatsApp", estado: "cerrada", atendido_por: "bot", fecha_inicio: "2026-01-01T00:00:00Z", mensajes_usuario: 3, mensajes_bot: 4, csat: 5, etiquetas: ["soporte"] },
      "conversations"
    ) as NormalizedConversationInput;
    expect(n.providerConversationId).toBe("x1");
    expect(n.channel).toBe("whatsapp");
    expect(n.status).toBe("closed");
    expect(n.wasBotOnly).toBe(true);
    expect(n.resolvedBy).toBe("bot");
    expect(n.tags).toEqual(["soporte"]);
  });

  it("Botmaker: bot-only SIN señal de éxito NO se marca resuelto (regla crítica §2/§3)", () => {
    const b = new BotmakerAnalyticsAdapter();
    const n = b.normalizeRawData(
      { chatId: "c1", channel: "whatsapp", status: "closed", tags: ["soporte"], assignedTo: null, messagesCount: 5 },
      "conversations"
    ) as NormalizedConversationInput;
    expect(n.wasBotOnly).toBe(true);
    expect(n.outcome).toBe("unclassified");
    expect(n.resolvedBy).toBeNull();
  });

  it("Botmaker: bot-only CON tag de éxito sí se marca resuelto por bot", () => {
    const b = new BotmakerAnalyticsAdapter();
    const n = b.normalizeRawData(
      { chatId: "c2", tags: ["Venta", "Resuelto_por_Bot"], assignedTo: null },
      "conversations"
    ) as NormalizedConversationInput;
    expect(n.outcome).toBe("resolved");
    expect(n.resolvedBy).toBe("bot");
  });
});

// ── Aislamiento multi-tenant (spec §36) ──────────────────────────────────────
describe("Multi-tenant isolation", () => {
  it("buildConversationWhere fija workspaceId del contexto e ignora el del query", () => {
    const sp = new URLSearchParams("days=7&workspaceId=EVIL_TENANT&provider=cari_ai");
    const where = buildConversationWhere("REAL_WS", parseFilters(sp));
    expect(where.workspaceId).toBe("REAL_WS");
    expect(where.provider).toBe("cari_ai");
  });

  it("siempre incluye workspaceId aunque no haya filtros", () => {
    const where = buildConversationWhere("WS1", parseFilters(new URLSearchParams("")));
    expect(where.workspaceId).toBe("WS1");
  });
});

// ── Reglas de outcome (spec §15) ─────────────────────────────────────────────
describe("Outcome rules engine", () => {
  const conv = { totalFallbacks: 5, csatScore: 1, wasHandoff: false, status: "closed", provider: "botmaker" };

  it("respeta la prioridad (menor número gana) y marca requiresReview", () => {
    const rules: OutcomeRuleLike[] = [
      { id: "r2", name: "fallback", conditions: [{ field: "fallback", operator: "gt", value: 4 }], outcome: "abandoned", resolvedBy: "bot", priority: 5 },
      { id: "r1", name: "csat-bajo", conditions: [{ field: "csat", operator: "lte", value: 2 }], outcome: "not_resolved", resolvedBy: "bot", priority: 1, actions: { requiresReview: true } },
    ];
    const res = applyOutcomeRules(conv, rules);
    expect(res?.appliedRuleId).toBe("r1");
    expect(res?.requiresReview).toBe(true);
  });

  it("ignora reglas deshabilitadas", () => {
    const rules: OutcomeRuleLike[] = [
      { id: "r1", name: "x", enabled: false, conditions: [{ field: "fallback", operator: "gt", value: 4 }], outcome: "abandoned", resolvedBy: "bot" },
    ];
    expect(applyOutcomeRules(conv, rules)).toBeNull();
  });

  it("ignora reglas de otro proveedor", () => {
    const rules: OutcomeRuleLike[] = [
      { id: "r1", name: "x", appliesToProvider: "cari_ai", conditions: [{ field: "fallback", operator: "gt", value: 4 }], outcome: "abandoned", resolvedBy: "bot" },
    ];
    expect(applyOutcomeRules(conv, rules)).toBeNull(); // conv.provider = botmaker
  });
});

// ── Motor de KPIs: bot-only vs resuelto, NPS, abandono temprano ───────────────
describe("KPI engine — separación de métricas", () => {
  it("bot-only y resuelto-por-bot son métricas separadas", () => {
    const rows = [
      { status: "closed", outcome: "unclassified", resolvedBy: "bot", wasBotOnly: true }, // bot-only, NO resuelto
      { status: "closed", outcome: "resolved", resolvedBy: "bot", wasBotOnly: true },
    ];
    const k = computeKpis({ conversations: rows });
    expect(k.botOnlyRate).toBe(100);
    expect(k.botResolutionRate).toBe(50);
  });

  it("calcula NPS y abandono temprano", () => {
    const rows = [
      { status: "abandoned", outcome: "abandoned", totalUserMessages: 1, npsScore: 10 },
      { status: "closed", outcome: "resolved", resolvedBy: "bot", totalUserMessages: 5, npsScore: 9 },
      { status: "closed", outcome: "resolved", resolvedBy: "bot", totalUserMessages: 5, npsScore: 3 },
    ];
    const k = computeKpis({ conversations: rows });
    expect(Math.round(k.avgNps as number)).toBe(33); // (2 prom - 1 detr)/3
    expect(Math.round(k.earlyAbandonmentRate)).toBe(33); // 1 abandono <=2 msgs /3
  });

  it("maneja denominador cero sin romper", () => {
    const k = computeKpis({ conversations: [] });
    expect(k.totalConversations).toBe(0);
    expect(k.realContainmentRate).toBe(0);
    expect(k.avgNps).toBeNull();
  });
});

// ── Calidad de datos (spec §27) ──────────────────────────────────────────────
describe("Data quality", () => {
  it("detecta fechas faltantes, duplicados, duración negativa y cierre sin outcome", () => {
    const issues = findDataQualityIssues([
      { id: "1", conversationStartedAt: null, providerConversationId: "a", status: "closed", outcome: null },
      { id: "2", conversationStartedAt: "2026-01-01", providerConversationId: "a", durationSeconds: -5, status: "active" },
    ]);
    const types = issues.map((i) => i.issueType);
    expect(types).toContain("missing_start_date");
    expect(types).toContain("duplicate_external_id");
    expect(types).toContain("negative_duration");
    expect(types).toContain("closed_without_outcome");
  });
});

// ── Privacidad / PII (spec §5.2, §36) ────────────────────────────────────────
describe("Privacy", () => {
  it("hashea de forma determinística y salada por workspace", () => {
    expect(hashPII("12345", "ws")).toHaveLength(64);
    expect(hashPII("12345", "ws")).toBe(hashPII("12345", "ws"));
    expect(hashPII("12345", "ws1")).not.toBe(hashPII("12345", "ws2"));
    expect(hashPII("", "ws")).toBe("");
  });

  it("enmascara teléfono y email", () => {
    expect(maskPhone("+52 1 5512345678")).toContain("5678");
    expect(maskPhone("+52 1 5512345678")).not.toContain("5512345");
    expect(maskEmail("juan@acme.com")).toBe("j••••@acme.com");
  });
});

// ── Agregaciones (spec §21-§24) ──────────────────────────────────────────────
describe("Aggregations", () => {
  const rows: AggConversation[] = [
    { agentId: "a1", agentName: "A1", status: "closed", wasHandoff: true, firstResponseTimeSeconds: 10, handleTimeSeconds: 100, csatScore: 5, conversationStartedAt: "2026-01-01", campaignId: "c1", serviceId: "s1", totalUserMessages: 3, outcome: "resolved", queueName: "Ventas", waitingTimeSeconds: 20 },
    { agentId: "a1", status: "closed", wasHandoff: true, conversationStartedAt: "2026-01-01", outcome: "resolved", serviceId: "s1", campaignId: "c1", totalUserMessages: 2, queueName: "Ventas", waitingTimeSeconds: 40 },
  ];

  it("agrega por agente, campaña, servicio, funnel y operación", () => {
    expect(aggregateAgents(rows)[0].handled).toBe(2);
    expect(aggregateCampaigns(rows)[0].conversationsStarted).toBe(2);
    const svc = aggregateServices(rows)[0];
    expect(svc.started).toBe(2);
    expect(svc.completed).toBe(2);
    expect(aggregateFunnel(rows)[0].count).toBe(2);
    const ops = aggregateOperations(rows);
    expect(ops.closed).toBe(2);
    expect(ops.topQueuesByWait[0].name).toBe("Ventas");
  });
});
