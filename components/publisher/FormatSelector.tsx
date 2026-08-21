"use client";
import React from "react";

export type PostFormat = "post" | "reel" | "story" | "carousel";

interface Props {
  value: PostFormat;
  onChange: (f: PostFormat) => void;
  /** Plataformas seleccionadas, para la nota de formatos soportados. */
  platforms?: string[];
}

const FORMATS: { key: PostFormat; label: string }[] = [
  { key: "post", label: "Post" },
  { key: "reel", label: "Reel" },
  { key: "story", label: "Story" },
  { key: "carousel", label: "Carrusel" },
];

/**
 * Formatos que cada plataforma admite hoy por la vía de publicación de la app.
 * Facebook Pages e Instagram Business soportan los cuatro; el mapa existe para
 * que agregar una plataforma con menos formatos no requiera tocar la UI.
 */
const SUPPORTED_BY_PLATFORM: Record<string, PostFormat[]> = {
  facebook: ["post", "reel", "story", "carousel"],
  instagram: ["post", "reel", "story", "carousel"],
};

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

export function FormatSelector({ value, onChange, platforms = [] }: Props) {
  // Un formato se ofrece si TODAS las plataformas elegidas lo admiten: publicar
  // en bloque a un canal que no lo soporta fallaría solo para ese canal.
  const known = platforms.filter((p) => SUPPORTED_BY_PLATFORM[p]);
  const supported: PostFormat[] = known.length
    ? FORMATS.map((f) => f.key).filter((f) => known.every((p) => SUPPORTED_BY_PLATFORM[p].includes(f)))
    : FORMATS.map((f) => f.key);

  const note = known.length
    ? `${known.map((p) => PLATFORM_LABEL[p] ?? p).join(" + ")} admite ${supported.length} de ${FORMATS.length} formatos`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--fc-text-secondary)",
          }}
        >
          Formato de publicación
        </span>
        {note && (
          <span style={{ fontFamily: "var(--fc-font-mono, monospace)", fontSize: 11, color: "var(--fc-text-muted)" }}>
            {note}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: 4,
          borderRadius: 12,
          background: "var(--fc-bg)",
          border: "1px solid var(--hairline)",
        }}
      >
        {FORMATS.map((fmt) => {
          const isActive = value === fmt.key;
          const ok = supported.includes(fmt.key);
          return (
            <button
              key={fmt.key}
              onClick={() => ok && onChange(fmt.key)}
              disabled={!ok}
              title={ok ? undefined : "El canal seleccionado no admite este formato"}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 9,
                textAlign: "center",
                border: "none",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: isActive ? 800 : 700,
                cursor: ok ? "pointer" : "not-allowed",
                transition: "all 140ms cubic-bezier(.2,.8,.2,1)",
                background: isActive && ok ? "var(--fc-accent)" : "transparent",
                color: isActive && ok ? "var(--fc-bg)" : ok ? "var(--fc-text-secondary)" : "var(--fc-text-muted)",
                opacity: ok ? 1 : 0.5,
              }}
            >
              {fmt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
