import { describe, it, expect } from "vitest";
import { evaluateAlerts, DEFAULT_ALERT_THRESHOLDS, type AlertContext } from "../lib/analytics/alerts/engine";
import type { AnalyticsKpiData } from "../lib/analytics/kpis/engine";

function kpis(over: Partial<AnalyticsKpiData> = {}): AnalyticsKpiData {
  return {
    totalConversations: 100, uniqueUsers: 80,
    realContainmentRate: 60, botOnlyRate: 50, botResolutionRate: 55, escalationRate: 10,
    fallbackRate: 5, taskCompletionRate: 80, abandonmentRate: 5, earlyAbandonmentRate: 2,
    avgCsat: 4.5, avgNps: 40, avgFrt: 30, avgAqt: 10, avgAsa: 10, avgAht: 300,
    campaignsSent: 0, campaignsDelivered: 0, campaignsRead: 0, campaignsReplied: 0,
    servicesStarted: 0, servicesCompleted: 0, estimatedRoiSaved: 0, ...over,
  };
}

describe("Alert engine (pure)", () => {
  it("no dispara alertas cuando todo está sano", () => {
    expect(evaluateAlerts({ kpis: kpis() })).toHaveLength(0);
  });

  it("dispara CSAT bajo cuando avgCsat < umbral", () => {
    const alerts = evaluateAlerts({ kpis: kpis({ avgCsat: 3.0 }) });
    const csat = alerts.find((a) => a.type === "csat_low");
    expect(csat).toBeTruthy();
    expect(csat!.severity).toBe("critical"); // 3.0 < 3.8 - 0.5
    expect(csat!.thresholdValue).toBe(DEFAULT_ALERT_THRESHOLDS.csatMin);
  });

  it("dispara fallback alto, FRT alto, AHT alto y handoff alto", () => {
    const alerts = evaluateAlerts({
      kpis: kpis({ fallbackRate: 35, avgFrt: 300, avgAht: 2000, escalationRate: 50 }),
    });
    const types = alerts.map((a) => a.type).sort();
    expect(types).toContain("fallback_high");
    expect(types).toContain("frt_high");
    expect(types).toContain("aht_high");
    expect(types).toContain("handoff_high");
  });

  it("NO evalúa KPIs de calidad con muestra insuficiente (minSampleSize)", () => {
    const alerts = evaluateAlerts({ kpis: kpis({ totalConversations: 5, avgCsat: 1 }) });
    expect(alerts.find((a) => a.type === "csat_low")).toBeFalsy();
  });

  it("dispara caída de volumen comparando con periodo anterior", () => {
    const alerts = evaluateAlerts({ kpis: kpis({ totalConversations: 40 }), previousVolume: 100 });
    const drop = alerts.find((a) => a.type === "volume_drop");
    expect(drop).toBeTruthy();
    expect(drop!.metricValue).toBe(60);
  });

  it("dispara sync_failed y data_quality_critical independientemente de la muestra", () => {
    const ctx: AlertContext = {
      kpis: kpis({ totalConversations: 0 }),
      dataQualityCriticalCount: 3,
      syncFailure: { provider: "meta_ads", error: "401" },
    };
    const types = evaluateAlerts(ctx).map((a) => a.type);
    expect(types).toContain("sync_failed");
    expect(types).toContain("data_quality_critical");
  });

  it("respeta umbrales override (csatMin más estricto)", () => {
    const alerts = evaluateAlerts({ kpis: kpis({ avgCsat: 4.4 }), thresholds: { csatMin: 4.5 } });
    expect(alerts.find((a) => a.type === "csat_low")).toBeTruthy();
  });
});
