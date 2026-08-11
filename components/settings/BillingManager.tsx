"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Settings2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BillingStatus = {
  plan: "free" | "pro" | "agency";
  configured: boolean;
  hasBillingAccount: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const plans = [
  { id: "pro" as const, name: "Pro", description: "20 clientes, 10 integrantes, 100 publicaciones programadas." },
  { id: "agency" as const, name: "Agencia", description: "Clientes, equipo y programación sin límite operativo." },
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
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/billing/status").then((r) => r.json()).then((payload) => setStatus(payload.data)).catch(() => setError("No pudimos consultar la facturación."));
  }, []);

  async function open(path: "checkout" | "portal", plan?: "pro" | "agency") {
    setBusy(plan ?? path);
    setError("");
    try {
      const response = await fetch(`/api/billing/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: plan ? JSON.stringify({ plan }) : undefined,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos abrir la facturación");
      window.location.assign(payload.data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos abrir la facturación");
      setBusy(null);
    }
  }

  if (!status) return (
    <div className="flex items-center justify-center py-10 gap-2 text-[var(--fc-text-muted)] text-sm">
      <Loader2 size={16} className="animate-spin" /> Consultando facturación...
    </div>
  );

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
        <motion.div variants={itemVariants} className="rounded-xl border border-[var(--fc-warning)]/20 bg-[var(--fc-warning)]/5 p-4 text-xs text-[var(--fc-warning)]">
          Los pagos aún no están configurados en este entorno. Define las claves y precios de Stripe para activar el autoservicio.
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = status.plan === plan.id;
            return (
              <motion.div key={plan.id} variants={itemVariants} className="rounded-xl border border-[var(--fc-border)] p-5 glass-panel transition-all hover:border-[var(--fc-accent)]/30 relative overflow-hidden">
                {isCurrent && <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--fc-accent)]/10 rounded-bl-full" />}
                <div className="mb-3 flex items-center justify-between relative z-10">
                  <p className="text-lg font-black text-[var(--fc-text)] tracking-tight">{plan.name}</p>
                  {isCurrent && <span className="rounded-full bg-[var(--fc-success)]/10 border border-[var(--fc-success)]/20 px-2 py-1 text-[10px] font-bold text-[var(--fc-success)] flex items-center gap-1"><CheckCircle2 size={12} /> PLAN ACTUAL</span>}
                </div>
                <p className="mb-6 text-[13px] text-[var(--fc-text-secondary)] leading-relaxed h-10 relative z-10">{plan.description}</p>
                <button 
                  disabled={busy !== null || isCurrent || status.hasBillingAccount} 
                  onClick={() => open("checkout", plan.id)} 
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all relative z-10 ${isCurrent ? 'bg-[var(--surface-hover)] text-[var(--fc-text-muted)] cursor-default' : 'bg-[var(--fc-text)] text-[var(--fc-bg)] hover:bg-[var(--fc-text-secondary)]'}`}
                  style={{ opacity: busy !== null && busy !== plan.id ? 0.5 : 1 }}
                >
                  {busy === plan.id ? <Loader2 size={14} className="animate-spin" /> : !isCurrent && <CreditCard size={14} />}
                  {status.hasBillingAccount && !isCurrent ? "Cámbialo en facturación" : isCurrent ? "Plan activo" : `Elegir ${plan.name}`}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs text-[var(--fc-danger)] m-0">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
