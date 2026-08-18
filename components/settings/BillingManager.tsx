"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Settings2, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, apiSend, ApiError } from "@/lib/api-client";
import { useWorkspace } from "@/hooks/use-settings-data";

type BillingStatus = {
  plan: "free" | "pro" | "agency";
  configured: boolean;
  hasBillingAccount: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type LoadState = "loading" | "ready" | "error";

// PLAN_CATALOG_ALIGNMENT_PENDING: lib/ai/finops/plan-catalog.ts only prices
// "pro" (Stripe has no "agency" price yet). Never send plan="agency" to
// checkout until that catalog is unified — the button stays disabled instead.
const plans = [
  { id: "pro" as const, name: "Pro", description: "20 clientes, 10 integrantes, 100 publicaciones programadas.", purchasable: true },
  { id: "agency" as const, name: "Agencia", description: "Clientes, equipo y programación sin límite operativo.", purchasable: false },
];

const containerVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.4, ease: "easeOut" } }
};

const itemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function BillingManager() {
  const { workspaceId } = useWorkspace();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    apiFetch<BillingStatus>("/api/billing/status")
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        setLoadState("ready");
      })
      .catch((reason) => {
        if (cancelled) return;
        setLoadError(reason instanceof ApiError ? reason.message : "No pudimos consultar la facturación.");
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(path: "checkout" | "portal", plan?: "pro" | "agency") {
    if (!workspaceId) {
      setActionError("No hay un workspace activo.");
      return;
    }
    setBusy(plan ?? path);
    setActionError("");
    try {
      const body = path === "checkout" ? { workspaceId, plan } : { workspaceId };
      const { url } = await apiSend<{ url: string }>(`/api/billing/${path}`, "POST", body);
      window.location.assign(url);
    } catch (reason) {
      setActionError(reason instanceof ApiError ? reason.message : "No pudimos abrir la facturación");
      setBusy(null);
    }
  }

  // LOADING
  if (loadState === "loading") {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-[var(--fc-text-muted)] text-sm">
        <Loader2 size={16} className="animate-spin" /> Consultando facturación...
      </div>
    );
  }

  // ERROR — never leaves the UI stuck on the loading state
  if (loadState === "error" || !status) {
    return (
      <div className="rounded-xl border border-[var(--fc-danger)]/20 bg-[var(--fc-danger)]/5 p-4 text-xs text-[var(--fc-danger)] flex items-center gap-2">
        <AlertTriangle size={14} />
        {loadError || "No pudimos consultar la facturación."}
      </div>
    );
  }

  // READY (status.configured true or false — CONFIG_NOT_READY is rendered inline below)
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-5 mt-2">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-[var(--fc-surface)] border border-[var(--fc-border)]">
        <div>
          <p className="text-sm font-semibold text-[var(--fc-text)] flex items-center gap-2">
            Estado de Suscripción
            {status.status && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--fc-accent)]/10 text-[var(--fc-accent)] border border-[var(--fc-accent)]/20">{status.status}</span>}
          </p>
          <p className="text-xs text-[var(--fc-text-secondary)] mt-1">
            {status.currentPeriodEnd ? `${status.cancelAtPeriodEnd ? "Finaliza" : "Se renueva"} el ${new Date(status.currentPeriodEnd).toLocaleDateString("es-MX")}` : "El plan Gratis no requiere método de pago."}
          </p>
        </div>
        {status.hasBillingAccount && (
          <button onClick={() => open("portal")} disabled={busy !== null} className="btn-secondary flex items-center gap-2">
            {busy === "portal" ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
            Gestionar facturación
          </button>
        )}
      </motion.div>

      {!status.configured ? (
        <motion.div variants={itemVariants} className="rounded-xl border border-[var(--fc-warning)]/20 bg-[var(--fc-warning)]/5 p-4 text-xs text-[var(--fc-warning)] flex items-center gap-2">
          <AlertTriangle size={14} />
          Los pagos aún no están configurados en este entorno. Define las claves y precios de Stripe para activar el autoservicio.
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = status.plan === plan.id;
            const disabled = busy !== null || isCurrent || status.hasBillingAccount || !plan.purchasable;
            return (
              <motion.div key={plan.id} variants={itemVariants} className="rounded-xl border border-[var(--fc-border)] p-5 glass-panel transition-all hover:border-[var(--fc-accent)]/30 relative overflow-hidden">
                {isCurrent && <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--fc-accent)]/10 rounded-bl-full" />}
                <div className="mb-3 flex items-center justify-between relative z-10">
                  <p className="text-lg font-black text-[var(--fc-text)] tracking-tight">{plan.name}</p>
                  {isCurrent && <span className="rounded-full bg-[var(--fc-success)]/10 border border-[var(--fc-success)]/20 px-2 py-1 text-[10px] font-bold text-[var(--fc-success)] flex items-center gap-1"><CheckCircle2 size={12} /> PLAN ACTUAL</span>}
                </div>
                <p className="mb-6 text-[13px] text-[var(--fc-text-secondary)] leading-relaxed h-10 relative z-10">{plan.description}</p>
                <button
                  disabled={disabled}
                  onClick={() => open("checkout", plan.id)}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all relative z-10 ${isCurrent ? 'bg-[var(--surface-hover)] text-[var(--fc-text-muted)] cursor-default' : 'bg-[var(--fc-text)] text-[var(--fc-bg)] hover:bg-[var(--fc-text-secondary)]'}`}
                  style={{ opacity: busy !== null && busy !== plan.id ? 0.5 : 1 }}
                >
                  {busy === plan.id ? <Loader2 size={14} className="animate-spin" /> : !isCurrent && plan.purchasable && <CreditCard size={14} />}
                  {!plan.purchasable && !isCurrent ? "Próximamente" : status.hasBillingAccount && !isCurrent ? "Cámbialo en facturación" : isCurrent ? "Plan activo" : `Elegir ${plan.name}`}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      <AnimatePresence>
        {actionError && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs text-[var(--fc-danger)] m-0">
            {actionError}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
