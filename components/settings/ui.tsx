/**
 * components/settings/ui.tsx
 * =====================================================================
 * Primitivas visuales de la sección Configuración.
 *
 * Antes cada pantalla inventaba su propia tarjeta (unas `rounded-2xl` con
 * hairline superior, otras `glass-panel p-6`, Branding con estilos inline),
 * así que la misma jerarquía se leía distinta en cada pestaña. Todo lo de
 * aquí es presentacional: sin fetch, sin estado de negocio.
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, Check, AlertTriangle } from "lucide-react";

// ── Animación compartida ────────────────────────────────────────────────────

export const settingsContainerVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.06, duration: 0.35, ease: "easeOut" },
  },
};

export const settingsItemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.18 } },
};

export const inputClass =
  "w-full bg-[var(--surface-hover)] border border-white/5 text-[var(--foreground)] text-[13px] rounded-lg px-3 py-2.5 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] disabled:opacity-60 disabled:cursor-not-allowed";

// ── Contenedor de página ────────────────────────────────────────────────────

/** Envoltorio con stagger para el contenido de cada pestaña. */
export function SettingsStack({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={settingsContainerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Tarjeta ─────────────────────────────────────────────────────────────────

interface SettingsCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  /** Contenido alineado a la derecha del encabezado (contadores, acciones). */
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "danger";
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SettingsCard({
  title,
  description,
  icon,
  aside,
  footer,
  tone = "default",
  children,
  className = "",
  id,
}: SettingsCardProps) {
  const danger = tone === "danger";

  return (
    <motion.section
      id={id}
      variants={settingsItemVariants}
      className={`glass-panel rounded-2xl border relative overflow-hidden ${
        danger
          ? "border-red-500/20 bg-red-500/5 shadow-[0_8px_30px_rgb(239,68,68,0.05)]"
          : "border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      } ${className}`}
    >
      <div
        className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent ${
          danger ? "via-red-500/30" : "via-white/10"
        }`}
      />

      <div className="p-6 sm:p-8">
        {(title || aside) && (
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h2
                  className={`text-lg font-semibold flex items-center gap-2 ${
                    danger ? "text-red-500" : ""
                  }`}
                >
                  {icon}
                  {title}
                </h2>
              )}
              {description && (
                <p
                  className={`text-xs mt-1 leading-relaxed max-w-2xl ${
                    danger ? "text-red-400/80" : "text-[var(--text-muted)]"
                  }`}
                >
                  {description}
                </p>
              )}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
          </header>
        )}

        {children}
      </div>

      {footer && (
        <div className="px-6 sm:px-8 py-4 border-t border-[var(--hairline)] bg-[var(--surface-hover)]/40">
          {footer}
        </div>
      )}
    </motion.section>
  );
}

// ── Fila etiqueta ↔ control ─────────────────────────────────────────────────

export function SettingsRow({
  label,
  description,
  children,
  last,
  htmlFor,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
  htmlFor?: string;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-4 ${
        last ? "" : "border-b border-[var(--hairline)]"
      }`}
    >
      <div className="min-w-0 sm:pr-4">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-[var(--foreground)] block"
        >
          {label}
        </label>
        {description && (
          <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed max-w-xl">
            {description}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Interruptor ─────────────────────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Etiqueta accesible cuando el interruptor no va dentro de un <label>. */
  label?: string;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "w-9 h-5" : "w-11 h-6";
  const knob = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const offset = size === "sm" ? "ml-4" : "ml-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative flex items-center shrink-0 ${track} rounded-full transition-colors duration-300 ease-in-out p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        checked
          ? "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[inset_0_1px_1px_rgba(0,0,0,0.2),0_0_8px_rgba(34,211,238,0.3)]"
          : "bg-[var(--surface-hover)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] border border-white/5"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`inline-block ${knob} bg-white rounded-full shadow-sm ${checked ? offset : "ml-0"}`}
      />
    </button>
  );
}

/** Fila completa con interruptor a la derecha. */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  last,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <SettingsRow label={label} description={description} last={last}>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </SettingsRow>
  );
}

// ── Campo de texto ──────────────────────────────────────────────────────────

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  /** Contenido a la derecha del input (botón de guardar, unidad…). */
  trailing?: React.ReactNode;
}

export function Field({ label, hint, error, trailing, id, ...inputProps }: FieldProps) {
  const fieldId = id || `field-${String(label).replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div>
      <label htmlFor={fieldId} className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
        {label}
      </label>
      <div className={trailing ? "flex flex-col sm:flex-row gap-3" : ""}>
        <input
          id={fieldId}
          {...inputProps}
          aria-invalid={!!error}
          className={inputClass}
          style={error ? { borderColor: "var(--red)" } : undefined}
        />
        {trailing}
      </div>
      {error ? (
        <p className="text-[11px] text-[var(--red)] mt-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
        </p>
      ) : (
        hint && <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

/** Dato de sólo lectura (slug, plan, ids). */
export function ReadOnlyStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 p-4 rounded-xl bg-[var(--surface-hover)] border border-[var(--hairline)]">
      <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        {label}
      </div>
      <div
        className={`text-sm font-mono ${
          accent ? "text-[var(--cyan)] font-semibold capitalize" : "text-[var(--text-secondary)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Barra de guardado pegajosa ──────────────────────────────────────────────

/**
 * Aparece sólo cuando hay cambios sin guardar. Resuelve el problema de tener
 * el botón "Guardar" al final de una lista larga con scroll interno.
 */
export function SaveBar({
  dirty,
  saving,
  saved,
  onSave,
  onDiscard,
  label = "Guardar cambios",
  disabled,
}: {
  dirty: boolean;
  saving?: boolean;
  saved?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  label?: string;
  disabled?: boolean;
}) {
  if (!dirty) {
    return saved ? (
      <div className="flex justify-end">
        <span className="text-[11px] text-[var(--emerald)] flex items-center gap-1 font-medium">
          <Check className="w-3.5 h-3.5" /> Guardado
        </span>
      </div>
    ) : null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="sticky bottom-4 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 pl-4 rounded-xl border border-[rgba(59,130,246,0.25)] bg-[var(--surface)]/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
    >
      <span className="text-[13px] text-[var(--text-secondary)] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] animate-pulse" />
        Tienes cambios sin guardar
      </span>
      <div className="flex items-center gap-2">
        {onDiscard && (
          <button onClick={onDiscard} disabled={saving} className="btn-secondary">
            Descartar
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving || disabled}
          className="btn-primary flex items-center gap-1.5"
          style={{ opacity: saving || disabled ? 0.6 : 1 }}
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Guardando..." : label}
        </button>
      </div>
    </motion.div>
  );
}

// ── Estados ─────────────────────────────────────────────────────────────────

export function SettingsSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="h-40 bg-[var(--surface)] rounded-2xl border border-[var(--surface-hover)]"
        />
      ))}
    </div>
  );
}

export function SettingsEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center p-8 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-hover)]/30">
      {icon && <div className="flex justify-center mb-3 text-[var(--text-muted)]">{icon}</div>}
      <p className="text-[13px] text-[var(--text-secondary)] mb-1">{title}</p>
      {description && <p className="text-[11px] text-[var(--text-muted)]">{description}</p>}
      {action && <div className="mt-4 flex gap-2 justify-center flex-wrap">{action}</div>}
    </div>
  );
}

/** Aviso de permisos insuficientes, con el mismo tono en todas las pestañas. */
export function SettingsRestricted({ message }: { message: string }) {
  return (
    <div className="glass-panel p-8 text-center rounded-2xl border border-white/5">
      <AlertTriangle className="w-6 h-6 text-[var(--amber)] mx-auto mb-3" />
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}
