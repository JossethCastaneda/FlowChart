"use client";

import React from "react";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PLAN_LABELS, PLAN_ORDER, UNLIMITED } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/plan-limits";

// ────────────────────────────────────────────────────────────────────────────
// Individual usage meter row
// ────────────────────────────────────────────────────────────────────────────
interface MeterRowProps {
  label: string;
  used: number;
  limit: number;
  isUnlimited: boolean;
  loading: boolean;
}

function MeterRow({ label, used, limit, isUnlimited, loading }: MeterRowProps) {
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const exceeded = !isUnlimited && used >= limit;
  const warning = !isUnlimited && pct >= 80 && !exceeded;

  const barColor = exceeded
    ? "#e2445c"
    : warning
    ? "#fdab3d"
    : "#00d4ff";

  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "rgba(148,163,184,0.9)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "11px", color: exceeded ? "#e2445c" : warning ? "#fdab3d" : "rgba(148,163,184,0.7)", fontWeight: 600 }}>
          {loading ? "—" : isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{
          height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: loading ? "0%" : `${pct}%`,
            background: barColor,
            borderRadius: "4px",
            transition: "width 0.5s ease",
            boxShadow: `0 0 8px ${barColor}40`,
          }} />
        </div>
      )}
      {exceeded && (
        <p style={{ fontSize: "10px", color: "#e2445c", margin: "4px 0 0", fontWeight: 500 }}>
          Límite alcanzado — actualiza tu plan para continuar
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main usage meter panel
// ────────────────────────────────────────────────────────────────────────────
interface PlanUsageMeterProps {
  /** Called when the user clicks "Actualizar plan" */
  onUpgrade?: () => void;
}

export function PlanUsageMeter({ onUpgrade }: PlanUsageMeterProps) {
  const projects = usePlanLimit("projects");
  const members = usePlanLimit("members");
  const integrations = usePlanLimit("integrations");
  const scheduledPosts = usePlanLimit("scheduledPosts");

  const plan = projects.plan as PlanId;
  const isHighestPlan = plan === "agency";
  const nextPlan = PLAN_ORDER[PLAN_ORDER.indexOf(plan) + 1] as PlanId | undefined;

  const hasAnyExceeded = [projects, members, integrations, scheduledPosts].some((l) => l.exceeded);

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: hasAnyExceeded ? "1px solid rgba(226,68,92,0.3)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "20px 24px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <p style={{ color: "rgba(100,116,139,0.8)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
            Plan actual
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "18px", fontWeight: 700, color: "white",
            }}>
              {PLAN_LABELS[plan] ?? "Gratis"}
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 700, padding: "2px 8px",
              background: plan === "agency" ? "rgba(0,212,255,0.12)" : plan === "pro" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.06)",
              color: plan === "agency" ? "#00d4ff" : plan === "pro" ? "#818cf8" : "rgba(148,163,184,0.7)",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {plan.toUpperCase()}
            </span>
          </div>
        </div>

        {!isHighestPlan && (
          <button
            id="plan-upgrade-btn"
            onClick={onUpgrade}
            style={{
              padding: "8px 16px",
              background: hasAnyExceeded
                ? "linear-gradient(135deg, #e2445c, #c01f3d)"
                : "linear-gradient(135deg, #00d4ff, #0081fb)",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {hasAnyExceeded ? "⚠ Actualizar ahora" : `Mejorar a ${nextPlan ? PLAN_LABELS[nextPlan] : "Pro"}`}
          </button>
        )}
      </div>

      {/* Usage meters */}
      <MeterRow
        label="Proyectos"
        used={projects.used}
        limit={projects.limit}
        isUnlimited={projects.isUnlimited}
        loading={projects.loading}
      />
      <MeterRow
        label="Miembros del equipo"
        used={members.used}
        limit={members.limit}
        isUnlimited={members.isUnlimited}
        loading={members.loading}
      />
      <MeterRow
        label="Integraciones"
        used={integrations.used}
        limit={integrations.limit}
        isUnlimited={integrations.isUnlimited}
        loading={integrations.loading}
      />
      <MeterRow
        label="Publicaciones programadas"
        used={scheduledPosts.used}
        limit={scheduledPosts.limit}
        isUnlimited={scheduledPosts.isUnlimited}
        loading={scheduledPosts.loading}
      />

      {isHighestPlan && (
        <p style={{ fontSize: "11px", color: "rgba(100,116,139,0.7)", textAlign: "center", margin: "8px 0 0" }}>
          ✓ Estás en el plan más alto — todos los límites son ilimitados
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Compact inline limit banner (use in project list, invite form, etc.)
// ────────────────────────────────────────────────────────────────────────────
interface PlanLimitBannerProps {
  feature: "projects" | "members" | "integrations" | "scheduledPosts";
  onUpgrade?: () => void;
}

const FEATURE_LABELS: Record<PlanLimitBannerProps["feature"], string> = {
  projects: "proyectos",
  members: "miembros",
  integrations: "integraciones",
  scheduledPosts: "publicaciones programadas",
};

export function PlanLimitBanner({ feature, onUpgrade }: PlanLimitBannerProps) {
  const { exceeded, used, limit, pct, loading, planLabel } = usePlanLimit(feature);

  if (loading || (!exceeded && pct < 80)) return null;

  const isCritical = exceeded;

  return (
    <div
      id={`plan-limit-banner-${feature}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 16px",
        background: isCritical ? "rgba(226,68,92,0.08)" : "rgba(253,171,61,0.08)",
        border: `1px solid ${isCritical ? "rgba(226,68,92,0.25)" : "rgba(253,171,61,0.25)"}`,
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <p style={{ fontSize: "12px", color: isCritical ? "#e2445c" : "#fdab3d", margin: 0, fontWeight: 500 }}>
        {isCritical
          ? `Límite de ${FEATURE_LABELS[feature]} alcanzado (${used}/${limit}) — tu plan ${planLabel} no permite más.`
          : `Cerca del límite de ${FEATURE_LABELS[feature]}: ${used}/${limit} (${pct}% usado)`}
      </p>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            flexShrink: 0,
            fontSize: "11px",
            fontWeight: 700,
            padding: "5px 12px",
            background: "transparent",
            border: `1px solid ${isCritical ? "#e2445c" : "#fdab3d"}`,
            borderRadius: "6px",
            color: isCritical ? "#e2445c" : "#fdab3d",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Actualizar plan
        </button>
      )}
    </div>
  );
}
