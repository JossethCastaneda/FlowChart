"use client";

import React from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import type { PublishTarget } from "./Composer";

interface Props {
  charCount: number;
  charLimit: number;
  selectedTargets: PublishTarget[];
}

type RowState = "ok" | "warning" | "error";

function Dot({ state }: { state: RowState }) {
  const color = state === "ok" ? "var(--fc-success)" : state === "warning" ? "var(--fc-warning)" : "var(--fc-danger)";
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flex: "none" }} />;
}

function RowIcon({ state }: { state: RowState }) {
  if (state === "ok") return <Check style={{ width: 13, height: 13, color: "var(--fc-success)" }} />;
  if (state === "warning") return <AlertTriangle style={{ width: 13, height: 13, color: "var(--fc-warning)" }} />;
  return <X style={{ width: 13, height: 13, color: "var(--fc-danger)" }} />;
}

export function ComposerChecklist({ charCount, charLimit, selectedTargets }: Props) {
  const overLimit = charCount > charLimit;
  const disconnected = selectedTargets.filter((t) => t.disconnected);
  const publishable = selectedTargets.filter((t) => !t.disconnected);

  const rows: { state: RowState; label: string }[] = [
    {
      state: overLimit ? "error" : "ok",
      label: overLimit
        ? `El texto excede el límite de ${charLimit.toLocaleString()} caracteres.`
        : `Dentro del límite de caracteres (${charCount.toLocaleString()}/${charLimit.toLocaleString()}).`,
    },
    {
      state: publishable.length > 0 ? "ok" : "warning",
      label:
        publishable.length > 0
          ? `Se publicará a ${publishable.length} ${publishable.length === 1 ? "cuenta" : "cuentas"}.`
          : "No hay cuentas conectadas seleccionadas para publicar.",
    },
  ];

  if (disconnected.length > 0) {
    rows.push({
      state: "warning",
      label: `${disconnected.length === 1 ? "Una cuenta perdió" : `${disconnected.length} cuentas perdieron`} el permiso de publicar y se omitirá${disconnected.length === 1 ? "" : "n"}: ${disconnected
        .map((t) => (t.igUsername ? `@${t.igUsername}` : t.pageName))
        .join(", ")}. Reconéctala${disconnected.length === 1 ? "" : "s"} desde el selector de canales.`,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: "var(--fc-bg)", border: "1px solid var(--hairline)" }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Dot state={row.state} />
          <span style={{ fontSize: 11.5, lineHeight: 1.5, color: row.state === "error" ? "var(--fc-danger)" : row.state === "warning" ? "var(--fc-warning)" : "var(--fc-text-secondary)", flex: 1 }}>
            {row.label}
          </span>
          <RowIcon state={row.state} />
        </div>
      ))}
    </div>
  );
}
