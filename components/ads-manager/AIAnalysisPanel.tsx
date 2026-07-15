"use client";

import React, { useState, useEffect } from "react";
import { Brain, Zap, AlertTriangle, TrendingUp, TrendingDown, Lightbulb, RefreshCw } from "lucide-react";
import { calcROAS, calcCPA, findActionValue, frequencyAlertLevel } from "@/lib/ads-metrics";

interface AIAnalysisPanelProps {
  item: any;
  level: "campaigns" | "adsets" | "ads";
}

interface AIAnalysis {
  score: number;
  status: "excellent" | "good" | "warning" | "critical";
  summary: string;
  opportunities: string[];
  problems: string[];
  actions: string[];
}

function analyzeLocally(item: any): AIAnalysis {
  const ins = item.insights || {};
  const spend = ins.spend || 0;
  const roas = calcROAS(ins);
  const cpa = calcCPA(ins, item.objective);
  const ctr = ins.ctr || 0;
  const freq = ins.reach > 0 ? ins.impressions / ins.reach : ins.frequency || 0;
  const freqLevel = frequencyAlertLevel(freq);
  const impressions = ins.impressions || 0;
  const clicks = ins.clicks || 0;

  let score = 70;
  const opportunities: string[] = [];
  const problems: string[] = [];
  const actions: string[] = [];

  // ROAS analysis
  if (roas >= 3) {
    score += 15;
    opportunities.push(`ROAS excelente de ${roas.toFixed(2)}x — considera escalar el presupuesto un 20-30%.`);
  } else if (roas >= 1.5) {
    score += 5;
    opportunities.push(`ROAS de ${roas.toFixed(2)}x está por encima del punto de equilibrio.`);
  } else if (roas > 0 && roas < 1) {
    score -= 15;
    problems.push(`ROAS de ${roas.toFixed(2)}x está por debajo del punto de equilibrio. Estás perdiendo dinero.`);
    actions.push("Pausa los ad sets con peor rendimiento y redistribuye presupuesto.");
  }

  // CTR analysis
  if (ctr >= 2) {
    score += 10;
    opportunities.push("CTR alto indica que los creativos resuenan bien con la audiencia.");
  } else if (ctr < 0.5 && impressions > 1000) {
    score -= 10;
    problems.push(`CTR de ${ctr.toFixed(2)}% es muy bajo. Los creativos no están captando atención.`);
    actions.push("Prueba nuevos formatos (video corto, UGC) o cambia el copy del headline.");
  }

  // Frequency analysis
  if (freqLevel === "critical") {
    score -= 15;
    problems.push(`Frecuencia de ${freq.toFixed(1)} es crítica. Tu audiencia está viendo los anuncios demasiadas veces.`);
    actions.push("Amplía tu audiencia, rota creativos, o reduce el presupuesto.");
  } else if (freqLevel === "warning") {
    score -= 5;
    problems.push(`Frecuencia de ${freq.toFixed(1)} está subiendo. Pronto verás fatiga creativa.`);
    actions.push("Prepara nuevos creativos para rotación.");
  }

  // Spend analysis
  if (spend === 0 && item.status === "ACTIVE") {
    score -= 20;
    problems.push("Campaña activa sin gasto. Posible problema de configuración o revisión de Meta.");
    actions.push("Verifica que el método de pago esté activo y que no haya políticas violadas.");
  }

  // Learning phase
  if (item.learning_phase_info?.status === "LEARNING") {
    opportunities.push("En fase de aprendizaje — evita hacer cambios significativos durante 7 días.");
  } else if (item.learning_phase_info?.status === "LEARNING_LIMITED") {
    problems.push("Learning Limited — no hubo suficientes conversiones para optimizar.");
    actions.push("Incrementa el presupuesto o amplía la ventana de conversión.");
  }

  // CPA analysis
  if (cpa.value > 0 && spend > 0) {
    const cpaBenchmark = spend / 10; // rough benchmark
    if (cpa.value < cpaBenchmark * 0.5) {
      opportunities.push(`${cpa.label} de $${cpa.value.toFixed(2)} es muy eficiente.`);
    }
  }

  // No results
  if (spend > 50 && findActionValue(ins.actions, "onsite_conversion.messaging_conversation_started_7d") === 0
    && findActionValue(ins.actions, "lead") === 0
    && findActionValue(ins.actions, "omni_purchase") === 0) {
    score -= 10;
    problems.push("Gasto significativo sin conversiones. El embudo puede tener fugas.");
    actions.push("Revisa el píxel, la landing page, y verifica que el evento de conversión esté disparando.");
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let status: AIAnalysis["status"] = "good";
  if (score >= 85) status = "excellent";
  else if (score >= 60) status = "good";
  else if (score >= 40) status = "warning";
  else status = "critical";

  const summaryMap: Record<string, string> = {
    excellent: "Esta campaña tiene un rendimiento excepcional. Los indicadores clave están muy por encima del promedio.",
    good: "Rendimiento sólido. Hay oportunidades de optimización pero la campaña es rentable.",
    warning: "La campaña muestra señales de advertencia que requieren atención inmediata.",
    critical: "Rendimiento crítico. Se recomienda intervenir de inmediato para evitar pérdidas.",
  };

  return {
    score,
    status,
    summary: summaryMap[status],
    opportunities: opportunities.length > 0 ? opportunities : ["No se detectaron oportunidades específicas."],
    problems: problems.length > 0 ? problems : [],
    actions: actions.length > 0 ? actions : ["Mantén la campaña monitoreada y revisa en 24-48 horas."],
  };
}

// Score Gauge Circle
function ScoreGauge({ score, status }: { score: number; status: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors: Record<string, string> = {
    excellent: "var(--emerald)",
    good: "var(--cyan)",
    warning: "var(--amber)",
    critical: "var(--red)",
  };
  const color = colors[status] || "var(--cyan)";

  return (
    <div style={{ position: "relative", width: 90, height: 90 }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        {/* Background ring */}
        <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
        {/* Progress ring */}
        <circle
          cx="45" cy="45" r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 6px ${color}50)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color, letterSpacing: "-0.02em" }}>
          {score}
        </div>
        <div style={{ fontSize: "7px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em" }}>
          SCORE IA
        </div>
      </div>
    </div>
  );
}

export function AIAnalysisPanel({ item, level }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate analysis delay for UX
    const timer = setTimeout(() => {
      const result = analyzeLocally(item);
      setAnalysis(result);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [item.id]);

  return (
    <div style={{
      padding: "16px", borderRadius: "8px",
      background: "var(--surface-hover)", border: "1px solid rgba(59,130,246,0.08)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px",
        fontSize: "10px", fontWeight: 700, color: "var(--cyan)",
        letterSpacing: "0.06em",
      }}>
        <Brain className="w-4 h-4" />
        ANÁLISIS IA ZEFIRUS
      </div>

      {loading ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "30px", gap: "10px",
        }}>
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--cyan)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            El Consejo Jedi está analizando tus campañas...
          </span>
        </div>
      ) : analysis ? (
        <>
          {/* Score + Summary */}
          <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "16px" }}>
            <ScoreGauge score={analysis.score} status={analysis.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "6px" }}>
                {analysis.summary}
              </div>
            </div>
          </div>

          {/* Problems */}
          {analysis.problems.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--red)", marginBottom: "6px", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px" }}>
                <AlertTriangle className="w-3 h-3" /> PROBLEMAS DETECTADOS
              </div>
              {analysis.problems.map((p, i) => (
                <div key={i} style={{
                  fontSize: "10px", color: "var(--text-secondary)", lineHeight: "1.5",
                  padding: "6px 8px", marginBottom: "4px", borderRadius: "4px",
                  background: "var(--red-dim)", borderLeft: "2px solid rgba(229,72,77,0.3)",
                }}>
                  {p}
                </div>
              ))}
            </div>
          )}

          {/* Opportunities */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--emerald)", marginBottom: "6px", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px" }}>
              <TrendingUp className="w-3 h-3" /> OPORTUNIDADES
            </div>
            {analysis.opportunities.map((o, i) => (
              <div key={i} style={{
                fontSize: "10px", color: "var(--text-secondary)", lineHeight: "1.5",
                padding: "6px 8px", marginBottom: "4px", borderRadius: "4px",
                background: "var(--surface)", borderLeft: "2px solid rgba(52,211,153,0.3)",
              }}>
                {o}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--amber)", marginBottom: "6px", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px" }}>
              <Lightbulb className="w-3 h-3" /> ACCIONES RECOMENDADAS
            </div>
            {analysis.actions.map((a, i) => (
              <div key={i} style={{
                fontSize: "10px", color: "var(--text-secondary)", lineHeight: "1.5",
                padding: "6px 8px", marginBottom: "4px", borderRadius: "4px",
                background: "var(--surface)", borderLeft: "2px solid rgba(251,191,36,0.3)",
              }}>
                {i + 1}. {a}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
