import { useMemo } from "react";
import { calcROAS, calcCPA, findActionValue, frequencyAlertLevel, isAdvantagePlus, calcHookRate } from "@/lib/ads-metrics";

export type AlertLevel = "critical" | "warning" | "positive";

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  itemId: string;
  itemName: string;
}

export function useAlerts(data: any[], level: "campaigns" | "adsets" | "ads"): Alert[] {
  return useMemo(() => {
    const alerts: Alert[] = [];

    data.forEach((item) => {
      const ins = item.insights || {};
      const spend = ins.spend || 0;
      const roas = calcROAS(ins);
      const reach = ins.reach || 0;
      const impressions = ins.impressions || 0;
      const freq = reach > 0 ? impressions / reach : ins.frequency || 0;
      const freqLevel = frequencyAlertLevel(freq);
      const ctr = ins.ctr || 0;
      const hookRate = calcHookRate(ins);

      // ── CRITICAL ──
      // Active without delivery. Only alert when the entity is truly ACTIVE
      // (effective_status filters out items paused at a parent level) and has
      // been given a chance to deliver. A campaign created hours ago, or one
      // outside the selected date range, has spend=0 legitimately — that is a
      // warning at most, never critical.
      if (item.status === "ACTIVE" && item.effective_status === "ACTIVE" && spend === 0 && impressions === 0) {
        alerts.push({
          id: `${item.id}-no-spend`,
          level: "warning",
          title: "Activa sin entrega",
          message: `"${item.name}" está activa pero sin impresiones en el periodo seleccionado. Si no es nueva, revisa entrega, pagos o revisión de anuncios en Meta.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // ROAS below 1 with significant spend (wait for more spend to not alert on early data)
      if (roas > 0 && roas < 1 && spend > 100) {
        alerts.push({
          id: `${item.id}-low-roas`,
          level: "critical",
          title: "ROAS por debajo del punto de equilibrio",
          message: `"${item.name}" tiene ROAS de ${roas.toFixed(2)}x con $${spend.toFixed(0)} gastados. Considera optimizar.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // Frequency > 5
      if (freqLevel === "critical") {
        alerts.push({
          id: `${item.id}-freq-critical`,
          level: "critical",
          title: "Frecuencia crítica",
          message: `"${item.name}" tiene frecuencia de ${freq.toFixed(1)}. La audiencia está saturada.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // ── WARNING ──
      // Frequency > 3
      if (freqLevel === "warning") {
        alerts.push({
          id: `${item.id}-freq-warning`,
          level: "warning",
          title: "Frecuencia elevada",
          message: `"${item.name}" tiene frecuencia de ${freq.toFixed(1)}. Considera rotar creativos.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // Learning Limited
      if (item.learning_phase_info?.status === "LEARNING_LIMITED") {
        alerts.push({
          id: `${item.id}-learning-limited`,
          level: "warning",
          title: "Learning Limited",
          message: `"${item.name}" no logró suficientes conversiones para optimizar. Considera ampliar audiencia o presupuesto.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // Low CTR
      if (ctr > 0 && ctr < 0.5 && impressions > 5000 && item.status === "ACTIVE") {
        alerts.push({
          id: `${item.id}-low-ctr`,
          level: "warning",
          title: "CTR muy bajo",
          message: `"${item.name}" tiene CTR de ${ctr.toFixed(2)}%. Los creativos no están generando clics suficientes.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // ── POSITIVE ──
      // Excellent ROAS
      if (roas >= 3 && spend > 20) {
        alerts.push({
          id: `${item.id}-great-roas`,
          level: "positive",
          title: "ROAS excelente",
          message: `"${item.name}" tiene ROAS de ${roas.toFixed(2)}x. Considera escalar presupuesto.`,
          itemId: item.id,
          itemName: item.name,
        });
      }

      // High Hook Rate
      if (hookRate >= 35) {
        alerts.push({
          id: `${item.id}-great-hook`,
          level: "positive",
          title: "Hook Rate alto",
          message: `"${item.name}" tiene Hook Rate de ${hookRate.toFixed(1)}%. El video engancha muy bien.`,
          itemId: item.id,
          itemName: item.name,
        });
      }
    });

    // Sort: critical first, then warning, then positive
    const order: Record<AlertLevel, number> = { critical: 0, warning: 1, positive: 2 };
    alerts.sort((a, b) => order[a.level] - order[b.level]);

    return alerts;
  }, [data, level]);
}
