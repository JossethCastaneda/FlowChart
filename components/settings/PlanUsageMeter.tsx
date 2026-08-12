"use client";

import React from "react";
import { usePlanLimit } from "@/hooks/use-plan-limit";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { PLAN_LABELS, PLAN_ORDER, UNLIMITED } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/plan-limits";
import { motion } from "framer-motion";
import { Folder, Users, Link2, CalendarClock } from "lucide-react";

const containerVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { staggerChildren: 0.1, duration: 0.4, ease: "easeOut" } 
  }
};

const itemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ────────────────────────────────────────────────────────────────────────────
// Individual usage meter row
// ────────────────────────────────────────────────────────────────────────────
interface MeterRowProps {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  isUnlimited: boolean;
  loading: boolean;
}

function MeterRow({ label, icon: Icon, used, limit, isUnlimited, loading }: MeterRowProps) {
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const exceeded = !isUnlimited && used >= limit;
  const warning = !isUnlimited && pct >= 80 && !exceeded;

  const barColor = exceeded
    ? "var(--fc-danger)"
    : warning
    ? "var(--fc-warning)"
    : "var(--fc-accent)";

  return (
    <motion.div variants={itemVariants} className="p-4 rounded-xl glass-panel bg-[var(--fc-surface)] border border-[var(--fc-border)]">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--surface-hover)]">
            <Icon className="w-3.5 h-3.5 text-[var(--fc-text-secondary)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--fc-text)]">{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color: exceeded ? "var(--fc-danger)" : warning ? "var(--fc-warning)" : "var(--fc-text-secondary)" }}>
          {loading ? "—" : isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      
      {!isUnlimited && (
        <div className="h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: loading ? "0%" : `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ 
              background: barColor, 
              boxShadow: `0 0 8px ${barColor}40` 
            }} 
          />
        </div>
      )}
      
      {exceeded && (
        <p className="text-[10px] text-[var(--fc-danger)] font-medium mt-2">
          Límite alcanzado — actualiza tu plan para continuar
        </p>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main usage meter panel
// ────────────────────────────────────────────────────────────────────────────
interface PlanUsageMeterProps {
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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <p className="text-[10px] text-[var(--fc-text-muted)] uppercase tracking-widest mb-1.5 font-bold">
            Plan actual
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-[var(--fc-text)] tracking-tight">
              {PLAN_LABELS[plan] ?? "Gratis"}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider" style={{
              background: plan === "agency" ? "rgba(59,130,246,0.12)" : plan === "pro" ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.06)",
              color: plan === "agency" ? "#5b9bff" : plan === "pro" ? "#818cf8" : "var(--fc-text-muted)",
            }}>
              {plan.toUpperCase()}
            </span>
          </div>
        </div>

        {!isHighestPlan && (
          <button
            onClick={onUpgrade}
            className="btn-primary"
            style={{ 
              background: hasAnyExceeded ? "var(--fc-danger)" : "var(--fc-accent)", 
              color: "white",
              boxShadow: hasAnyExceeded ? "0 4px 14px 0 rgba(226,68,92,0.39)" : "0 4px 14px 0 rgba(0,129,251,0.39)"
            }}
          >
            {hasAnyExceeded ? "Actualizar ahora" : `Mejorar a ${nextPlan ? PLAN_LABELS[nextPlan] : "Pro"}`}
          </button>
        )}
      </motion.div>

      {/* Usage meters Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MeterRow label="Proyectos" icon={Folder} used={projects.used} limit={projects.limit} isUnlimited={projects.isUnlimited} loading={projects.loading} />
        <MeterRow label="Miembros del equipo" icon={Users} used={members.used} limit={members.limit} isUnlimited={members.isUnlimited} loading={members.loading} />
        <MeterRow label="Integraciones" icon={Link2} used={integrations.used} limit={integrations.limit} isUnlimited={integrations.isUnlimited} loading={integrations.loading} />
        <MeterRow label="Posts programados" icon={CalendarClock} used={scheduledPosts.used} limit={scheduledPosts.limit} isUnlimited={scheduledPosts.isUnlimited} loading={scheduledPosts.loading} />
      </motion.div>

      {isHighestPlan && (
        <motion.p variants={itemVariants} className="text-[11px] text-[var(--fc-text-muted)] text-center font-medium mt-2">
          Estás en el plan más alto — todos los límites son ilimitados
        </motion.p>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Compact inline limit banner
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
  const { exceeded, used, limit, pct, loading } = usePlanLimit(feature);

  if (loading || (!exceeded && pct < 80)) return null;
  const isCritical = exceeded;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg mb-4"
      style={{
        background: isCritical ? "rgba(226,68,92,0.08)" : "rgba(253,171,61,0.08)",
        border: `1px solid ${isCritical ? "rgba(226,68,92,0.25)" : "rgba(253,171,61,0.25)"}`,
      }}
    >
      <p className="text-xs font-medium m-0" style={{ color: isCritical ? "var(--fc-danger)" : "var(--fc-warning)" }}>
        {isCritical
          ? `Límite de ${FEATURE_LABELS[feature]} alcanzado (${used}/${limit}) — actualiza tu plan.`
          : `Cerca del límite de ${FEATURE_LABELS[feature]}: ${used}/${limit}`}
      </p>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors bg-transparent border whitespace-nowrap"
          style={{
            borderColor: isCritical ? "var(--fc-danger)" : "var(--fc-warning)",
            color: isCritical ? "var(--fc-danger)" : "var(--fc-warning)"
          }}
        >
          Actualizar
        </button>
      )}
    </motion.div>
  );
}
