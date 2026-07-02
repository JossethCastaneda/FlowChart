import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  accumulatorsFromConversations,
  accumulatorsToMetricRows,
  accumulatorsFromMetricRows,
  overviewKpisFromAccumulators,
  operationsSummaryFromAccumulators,
  roiFromAccumulators,
  type DailyConv,
} from "../lib/analytics/daily-metrics";

const convs: DailyConv[] = [
  { status: "closed", outcome: "resolved", resolvedBy: "bot", wasBotOnly: true, csatScore: 5, firstResponseTimeSeconds: 30, handleTimeSeconds: 300, totalBotMessages: 3, channel: "whatsapp", conversationStartedAt: "2020-01-10T10:00:00Z" },
  { status: "transferred", outcome: "transferred", wasHandoff: true, firstResponseTimeSeconds: 200, totalUserMessages: 4, channel: "instagram", conversationStartedAt: "2020-01-10T11:00:00Z" },
  { status: "abandoned", outcome: "abandoned", totalUserMessages: 1, channel: "whatsapp", conversationStartedAt: "2020-01-11T09:00:00Z" },
];

describe("daily-metrics: acumuladores puros", () => {
  it("computa acumuladores aditivos correctos", () => {
    const a = accumulatorsFromConversations(convs);
    expect(a.total).toBe(3);
    expect(a.closedSet).toBe(3);
    expect(a.botResolved).toBe(1);
    expect(a.handoffs).toBe(1);
    expect(a.botOnly).toBe(1);
    expect(a.earlyAbandon).toBe(1);
    expect(a.csatSum).toBe(5);
    expect(a.csatN).toBe(1);
    expect(a.frtSum).toBe(230);
    expect(a.slaMet).toBe(1);
    expect(a.slaBreached).toBe(1);
    expect(a.botMsgs).toBe(3);
    expect(a.userMsgs).toBe(5);
  });

  it("round-trip: filas de métrica → acumuladores idénticos", () => {
    const a = accumulatorsFromConversations(convs);
    const rows = accumulatorsToMetricRows(a);
    const b = accumulatorsFromMetricRows(rows);
    expect(b).toEqual(a);
  });

  it("derivación overview coincide con el cálculo en vivo", () => {
    const k = overviewKpisFromAccumulators(accumulatorsFromConversations(convs));
    expect(k.totalConversations).toBe(3);
    expect(k.containmentRate).toBeCloseTo(33.333, 2);
    expect(k.handoffRate).toBeCloseTo(33.333, 2);
    expect(k.avgCsat).toBe(5);
    expect(k.avgFrtSeconds).toBe(115);
    expect(k.avgAhtSeconds).toBe(300);
    expect(k.estimatedRoiSaved).toBeCloseTo(0.8333, 3);
  });

  it("derivación operations y roi coinciden", () => {
    const acc = accumulatorsFromConversations(convs);
    const ops = operationsSummaryFromAccumulators(acc);
    expect(ops).toMatchObject({ active: 0, closed: 1, abandoned: 1, transferred: 1, slaMet: 1, slaBreached: 1, avgFrtSeconds: 115, avgAhtSeconds: 300, avgAsaSeconds: null });

    const roi = roiFromAccumulators(acc, { agentCostPerHour: 10, humanAhtSeconds: 600, monthlyBotCost: 0, incrementalRevenue: 0, costPerMessage: 0 });
    expect(roi.botResolved).toBe(1);
    expect(roi.hoursSaved).toBeCloseTo(0.1667, 3);
    expect(roi.roiPercent).toBeNull(); // costo total 0 → no divide por cero
  });

  it("partir las conversaciones en dos días y sumar = computar de una vez", () => {
    const day1 = convs.slice(0, 2);
    const day2 = convs.slice(2);
    const combined = accumulatorsFromMetricRows([
      ...accumulatorsToMetricRows(accumulatorsFromConversations(day1)),
      ...accumulatorsToMetricRows(accumulatorsFromConversations(day2)),
    ]);
    expect(combined).toEqual(accumulatorsFromConversations(convs));
  });
});

// --- Lector servidor (prisma mockeado) --------------------------------------

vi.mock("@/lib/prisma", () => ({
  default: {
    analyticsDailyMetric: { findMany: vi.fn() },
    normalizedConversation: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { getAnalyticsDataset, aggregatesUsable } from "../lib/analytics/daily-metrics.server";
import type { AnalyticsFilters } from "../lib/analytics/query";

const p = prisma as unknown as {
  analyticsDailyMetric: { findMany: ReturnType<typeof vi.fn> };
  normalizedConversation: { 
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

// Rango histórico cerrado en el pasado (sin componente "hoy"): determinístico.
const pastRange: AnalyticsFilters = {
  startDate: new Date("2020-01-01T00:00:00Z"),
  endDate: new Date("2020-01-31T23:59:59Z"),
};

beforeEach(() => {
  p.analyticsDailyMetric.findMany.mockReset();
  p.normalizedConversation.findMany.mockReset();
  p.normalizedConversation.groupBy.mockReset();
  p.normalizedConversation.count.mockReset();
});

describe("daily-metrics: lector servidor (agregado vs live)", () => {
  it("usa AGREGADOS cuando existen filas; no toca conversaciones para rango pasado", async () => {
    p.analyticsDailyMetric.findMany.mockResolvedValue([
      { date: new Date("2020-01-10T00:00:00Z"), channel: "whatsapp", metricKey: "acc_total", metricValue: 10 },
      { date: new Date("2020-01-10T00:00:00Z"), channel: "whatsapp", metricKey: "acc_botResolved", metricValue: 4 },
      { date: new Date("2020-01-11T00:00:00Z"), channel: "instagram", metricKey: "acc_total", metricValue: 5 },
    ]);
    const ds = await getAnalyticsDataset("ws-1", pastRange, null);
    expect(ds.source).toBe("aggregate");
    expect(ds.acc.total).toBe(15);
    expect(ds.acc.botResolved).toBe(4);
    expect(p.normalizedConversation.findMany).not.toHaveBeenCalled();
    // Scope multi-tenant: el WHERE fija el workspace de la sesión.
    const where = p.analyticsDailyMetric.findMany.mock.calls[0][0].where;
    expect(where.workspaceId).toBe("ws-1");
    expect(where.metricKey).toEqual({ startsWith: "acc_" });
  });

  it("respeta scope de proyecto/canal/proveedor en el WHERE de agregados", async () => {
    p.analyticsDailyMetric.findMany.mockResolvedValue([
      { date: new Date("2020-01-10T00:00:00Z"), channel: "whatsapp", metricKey: "acc_total", metricValue: 7 },
    ]);
    const scope = { projectId: "p1", providers: ["botmaker"], channels: ["whatsapp"] as ("whatsapp")[] };
    const ds = await getAnalyticsDataset("ws-1", pastRange, scope);
    expect(ds.source).toBe("aggregate");
    const where = p.analyticsDailyMetric.findMany.mock.calls[0][0].where;
    expect(where.projectId).toBe("p1");
    expect(where.provider).toEqual({ in: ["botmaker"] });
    expect(where.channel).toEqual({ in: ["whatsapp"] });
  });

  it("FALLBACK a live cuando no hay agregados en la ventana", async () => {
    const mockStatusGroups = [
      {
        status: "closed", outcome: "resolved", resolvedBy: "bot", wasHandoff: false, wasBotOnly: true,
        _count: { _all: 1, csatScore: 1, firstResponseTimeSeconds: 1, handleTimeSeconds: 1, waitingTimeSeconds: 0 },
        _sum: { totalUserMessages: 0, totalBotMessages: 3, totalFallbacks: 0, csatScore: 5, firstResponseTimeSeconds: 30, handleTimeSeconds: 300, waitingTimeSeconds: null }
      },
      {
        status: "transferred", outcome: "transferred", resolvedBy: null, wasHandoff: true, wasBotOnly: false,
        _count: { _all: 1, csatScore: 0, firstResponseTimeSeconds: 1, handleTimeSeconds: 0, waitingTimeSeconds: 0 },
        _sum: { totalUserMessages: 4, totalBotMessages: 0, totalFallbacks: 0, csatScore: null, firstResponseTimeSeconds: 200, handleTimeSeconds: null, waitingTimeSeconds: null }
      },
      {
        status: "abandoned", outcome: "abandoned", resolvedBy: null, wasHandoff: false, wasBotOnly: false,
        _count: { _all: 1, csatScore: 0, firstResponseTimeSeconds: 0, handleTimeSeconds: 0, waitingTimeSeconds: 0 },
        _sum: { totalUserMessages: 1, totalBotMessages: 0, totalFallbacks: 0, csatScore: null, firstResponseTimeSeconds: null, handleTimeSeconds: null, waitingTimeSeconds: null }
      }
    ];
    p.analyticsDailyMetric.findMany.mockResolvedValue([]);
    p.normalizedConversation.groupBy.mockResolvedValue(mockStatusGroups);
    p.normalizedConversation.count.mockResolvedValue(1);
    p.normalizedConversation.findMany.mockResolvedValue(convs);

    const ds = await getAnalyticsDataset("ws-1", pastRange, null);
    expect(ds.source).toBe("live");
    expect(ds.acc.total).toBe(3);
    expect(p.normalizedConversation.findMany).toHaveBeenCalled();
  });

  it("filtro de alta cardinalidad fuerza live y NO consulta agregados", async () => {
    const mockStatusGroups = [
      {
        status: "closed", outcome: "resolved", resolvedBy: "bot", wasHandoff: false, wasBotOnly: true,
        _count: { _all: 1, csatScore: 1, firstResponseTimeSeconds: 1, handleTimeSeconds: 1, waitingTimeSeconds: 0 },
        _sum: { totalUserMessages: 0, totalBotMessages: 3, totalFallbacks: 0, csatScore: 5, firstResponseTimeSeconds: 30, handleTimeSeconds: 300, waitingTimeSeconds: null }
      },
      {
        status: "transferred", outcome: "transferred", resolvedBy: null, wasHandoff: true, wasBotOnly: false,
        _count: { _all: 1, csatScore: 0, firstResponseTimeSeconds: 1, handleTimeSeconds: 0, waitingTimeSeconds: 0 },
        _sum: { totalUserMessages: 4, totalBotMessages: 0, totalFallbacks: 0, csatScore: null, firstResponseTimeSeconds: 200, handleTimeSeconds: null, waitingTimeSeconds: null }
      },
      {
        status: "abandoned", outcome: "abandoned", resolvedBy: null, wasHandoff: false, wasBotOnly: false,
        _count: { _all: 1, csatScore: 0, firstResponseTimeSeconds: 0, handleTimeSeconds: 0, waitingTimeSeconds: 0 },
        _sum: { totalUserMessages: 1, totalBotMessages: 0, totalFallbacks: 0, csatScore: null, firstResponseTimeSeconds: null, handleTimeSeconds: null, waitingTimeSeconds: null }
      }
    ];
    p.normalizedConversation.groupBy.mockResolvedValue(mockStatusGroups);
    p.normalizedConversation.count.mockResolvedValue(1);
    p.normalizedConversation.findMany.mockResolvedValue(convs);

    const ds = await getAnalyticsDataset("ws-1", { ...pastRange, agentId: "agent-7" }, null);
    expect(ds.source).toBe("live");
    expect(p.analyticsDailyMetric.findMany).not.toHaveBeenCalled();
  });

  it("aggregatesUsable: true solo con dimensiones del rollup", () => {
    expect(aggregatesUsable(pastRange)).toBe(true);
    expect(aggregatesUsable({ ...pastRange, provider: "cari", channel: "whatsapp", botId: "b1" })).toBe(true);
    expect(aggregatesUsable({ ...pastRange, campaignId: "c1" })).toBe(false);
    expect(aggregatesUsable({ ...pastRange, outcome: "resolved" })).toBe(false);
  });
});
