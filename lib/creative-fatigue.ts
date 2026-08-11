/**
 * Creative Fatigue Detection Library
 * Analyzes ad performance degradation over time to detect creative fatigue
 */

export interface FatigueAnalysis {
  level: "fresh" | "healthy" | "warning" | "critical";
  score: number; // 0-100, higher = more fatigued
  reasons: string[];
  action: string;
  details: {
    ctrDrop: number; // % drop from initial CTR
    cpmIncrease: number; // % increase from initial CPM
    frequency: number;
    daysActive: number;
  };
}

/**
 * Analyze creative fatigue for an ad based on current vs historical performance.
 * 
 * @param currentInsights - Current period insights (last 7 days)
 * @param initialInsights - Initial period insights (first 7 days of ad life)
 * @param frequency - Current frequency
 * @param daysActive - Number of days the ad has been active
 */
export function analyzeFatigue(
  currentInsights: { ctr: number; cpm: number; spend: number },
  initialInsights: { ctr: number; cpm: number } | null,
  frequency: number,
  daysActive: number
): FatigueAnalysis {
  const reasons: string[] = [];
  let score = 0;

  // Factor 1: CTR degradation (0-35 points)
  let ctrDrop = 0;
  if (initialInsights && initialInsights.ctr > 0) {
    ctrDrop = ((initialInsights.ctr - currentInsights.ctr) / initialInsights.ctr) * 100;
    if (ctrDrop > 40) {
      score += 35;
      reasons.push(`CTR cayó ${ctrDrop.toFixed(0)}% vs primera semana`);
    } else if (ctrDrop > 20) {
      score += 20;
      reasons.push(`CTR bajó ${ctrDrop.toFixed(0)}% vs primera semana`);
    } else if (ctrDrop > 10) {
      score += 10;
      reasons.push(`CTR disminuyó ${ctrDrop.toFixed(0)}%`);
    }
  }

  // Factor 2: CPM inflation (0-25 points)
  let cpmIncrease = 0;
  if (initialInsights && initialInsights.cpm > 0) {
    cpmIncrease = ((currentInsights.cpm - initialInsights.cpm) / initialInsights.cpm) * 100;
    if (cpmIncrease > 50) {
      score += 25;
      reasons.push(`CPM subió ${cpmIncrease.toFixed(0)}% (audiencia saturada)`);
    } else if (cpmIncrease > 30) {
      score += 15;
      reasons.push(`CPM aumentó ${cpmIncrease.toFixed(0)}%`);
    } else if (cpmIncrease > 15) {
      score += 8;
      reasons.push(`CPM subió ${cpmIncrease.toFixed(0)}%`);
    }
  }

  // Factor 3: Frequency (0-25 points)
  if (frequency >= 6) {
    score += 25;
    reasons.push(`Frecuencia ${frequency.toFixed(1)}x — audiencia sobreexpuesta`);
  } else if (frequency >= 4) {
    score += 18;
    reasons.push(`Frecuencia ${frequency.toFixed(1)}x — fatiga inminente`);
  } else if (frequency >= 3) {
    score += 10;
    reasons.push(`Frecuencia ${frequency.toFixed(1)}x — monitorear`);
  }

  // Factor 4: Days active without refresh (0-15 points)
  if (daysActive >= 45) {
    score += 15;
    reasons.push(`${daysActive} días activo sin rotación`);
  } else if (daysActive >= 30) {
    score += 10;
    reasons.push(`${daysActive} días activo`);
  } else if (daysActive >= 21) {
    score += 5;
  }

  // Determine level and action
  let level: FatigueAnalysis["level"];
  let action: string;

  if (score >= 60) {
    level = "critical";
    action = " Rota creativos inmediatamente. Pausa este anuncio y lanza variaciones nuevas.";
  } else if (score >= 35) {
    level = "warning";
    action = " Prepara nuevos creativos. Este anuncio perderá rendimiento pronto.";
  } else if (score >= 15) {
    level = "healthy";
    action = " Rendimiento estable. Monitorea semanalmente.";
  } else {
    level = "fresh";
    action = " Creativo fresco — rendimiento óptimo.";
  }

  return {
    level,
    score: Math.min(100, score),
    reasons,
    action,
    details: { ctrDrop, cpmIncrease, frequency, daysActive },
  };
}

/**
 * Quick fatigue check from a single insight row (without historical data).
 * Uses frequency and basic heuristics.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function quickFatigueCheck(ins: any): FatigueAnalysis["level"] {
  const frequency = parseFloat(ins.frequency || "0");
  const ctr = parseFloat(ins.ctr || "0");
  
  if (frequency >= 5 && ctr < 0.8) return "critical";
  if (frequency >= 4 && ctr < 1.0) return "warning";
  if (frequency >= 3) return "warning";
  if (frequency >= 2 && ctr < 0.5) return "warning";
  if (frequency < 1.5) return "fresh";
  return "healthy";
}

/**
 * Get fatigue level display properties
 */
export function getFatigueDisplay(level: FatigueAnalysis["level"]) {
  switch (level) {
    case "fresh":
      return { label: "Fresh", color: "var(--fc-success)", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", icon: "" };
    case "healthy":
      return { label: "Estable", color: "var(--fc-accent)", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", icon: "" };
    case "warning":
      return { label: "Fatigando", color: "var(--fc-warning)", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)", icon: "" };
    case "critical":
      return { label: "Fatigado", color: "var(--fc-danger)", bg: "rgba(229,72,77,0.08)", border: "rgba(229,72,77,0.2)", icon: "" };
  }
}
