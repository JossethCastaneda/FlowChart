"use client";
/**
 * HScroller — deslizable horizontal de marca (FlowChart Ink).
 *
 * Reemplaza los `overflow-x-auto` genéricos (sin affordance de scroll) por un
 * carrusel con:
 *  - Flechas prev/next flotantes: aparecen solo cuando hay contenido oculto en
 *    esa dirección; avanzan ~85% del viewport con scroll suave.
 *  - Degradado en los bordes vía `mask-image` (funciona sobre cualquier fondo
 *    y en los tres temas, sin overlays que tapen contenido).
 *  - Scroll-snap opcional, teclado (flechas al enfocar), touch nativo y
 *    ResizeObserver para recalcular al cambiar el contenido o el viewport.
 *
 * Los hijos definen su propio ancho (`shrink-0` + width fija); este componente
 * solo aporta el riel. Design system: tokens var(--*), iconos Lucide via SIcon,
 * sombras neutras — ver docs/design-system.md.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SIcon } from "@/components/ui/SIcon";

interface HScrollerProps {
  children: React.ReactNode;
  /** Etiqueta accesible del riel (región navegable). */
  ariaLabel: string;
  /** Separación entre items (px). Default 16. */
  gap?: number;
  /** Activa scroll-snap al inicio de cada item. Default true. */
  snap?: boolean;
  /** Estilos del contenedor externo (posicionado; ancla de las flechas). */
  style?: React.CSSProperties;
  /** Estilos extra del riel scrolleable (p. ej. minHeight en tableros). */
  railStyle?: React.CSSProperties;
  className?: string;
}

const FADE = 36; // px del degradado en cada borde

export function HScroller({ children, ariaLabel, gap = 16, snap = true, style, railStyle, className }: HScrollerProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 2px de tolerancia: los navegadores redondean scrollLeft en zoom fraccional.
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Observar también el contenido: cards que cargan async cambian scrollWidth.
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const mask =
    canLeft && canRight
      ? `linear-gradient(to right, transparent, black ${FADE}px, black calc(100% - ${FADE}px), transparent)`
      : canLeft
        ? `linear-gradient(to right, transparent, black ${FADE}px)`
        : canRight
          ? `linear-gradient(to right, black calc(100% - ${FADE}px), transparent)`
          : undefined;

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    [side]: -6,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--surface)",
    border: "1px solid var(--border-strong)",
    color: "var(--foreground)",
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
    transition: "background 0.15s, opacity 0.15s",
  });

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {canLeft && (
        <button
          type="button"
          aria-label="Desplazar a la izquierda"
          onClick={() => nudge(-1)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
          style={arrowStyle("left")}
        >
          <SIcon icon={ChevronLeft} size={16} />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Desplazar a la derecha"
          onClick={() => nudge(1)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
          style={arrowStyle("right")}
        >
          <SIcon icon={ChevronRight} size={16} />
        </button>
      )}

      <div
        ref={railRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
        }}
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap,
          overflowX: "auto",
          scrollSnapType: snap ? "x proximity" : undefined,
          WebkitOverflowScrolling: "touch",
          maskImage: mask,
          WebkitMaskImage: mask,
          scrollbarWidth: "none",
          outline: "none",
          // padding vertical mínimo para que las sombras/anillos de las cards no se recorten
          padding: "2px 2px 8px",
          ...railStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
