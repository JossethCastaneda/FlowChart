# 03 · Patrones de interacción

> Los patrones canónicos reutilizables. Diseñar un módulo nuevo = **componer estos patrones**,
> no inventar. Fuente ejecutable: `components/ui/` + clases de `app/globals.css`. Reglas
> visuales detalladas en [`docs/design-system.md`](../design-system.md) §3, §7.

---

## 1. El patrón de página canónico

Toda página de módulo sigue esta secuencia vertical (referencia: `app/dashboard/resumen/page.tsx`):

```
┌───────────────────────────────────────────────┐
│  PageHeader   (título + esencia + acciones)    │  ← identidad + contexto
├───────────────────────────────────────────────┤
│  [ KpiCard ] [ KpiCard ] [ KpiCard ] [ … ]     │  ← lo importante primero
├───────────────────────────────────────────────┤
│  ChartPanel  (tendencia / evolución)           │  ← el "por qué" del número
├───────────────────────────────────────────────┤
│  Tabla / lista de detalle (stat-table, rows)   │  ← el detalle accionable
└───────────────────────────────────────────────┘
```

Regla: **KPIs arriba, tendencia en medio, detalle abajo.** Es densidad honesta (P3): de lo
general a lo específico, sin obligar al usuario a cazar el dato.

Esqueleto:
```tsx
"use client";
// 1. fetch (/api/... con React Query o zustand)
// 2. <PageHeader title=… iconColor=… actions=… />
// 3. grid de <KpiCard color="cyan|red|amber|emerald|purple" … />
// 4. <ChartPanel> con Recharts + <ChartTheme/> + <CustomTooltip/>
// 5. tabla/lista (.stat-table, .data-row) con estados (§3)
// overlays imperativos (showToast, showConfirm) ya montados en el root layout
```

---

## 2. Navegación

| Patrón | Componente/clase | Regla |
|--------|------------------|-------|
| Sidebar (módulos por grupo) | `ClientMainWrapper` + `.nav-item[data-mod]` | Muestra `label`; acento por módulo. Colapsa a 80px (1024–1279px). |
| Pestañas dentro de módulo | `.tab-pill-nav` / `.tab-pill` | Submódulos = tabs, nunca ítems de sidebar. |
| Salto rápido | `CommandMenu` (⌘K, cmdk) | Toda acción/ruta importante debe ser alcanzable aquí. |
| Móvil | `MobileBottomNav` | Navegación primaria en < 768px. |
| Contexto de cliente | `WorkspaceSwitcher` | Siempre visible; el cliente activo se refleja en headers. |
| Breadcrumbs | header del módulo | Pueden enriquecerse con la esencia (`code`). |

---

## 3. Estados de datos (obligatorios — principio P4)

Todo bloque que muestre datos externos declara sus 4 estados. Nunca un `0` ambiguo ni un
espacio en blanco en lugar de "sin datos" o "error".

| Estado | Componente | Cuándo |
|--------|-----------|--------|
| **Cargando** | `Skeleton` | Mientras la API responde. Nunca spinner suelto sin contexto de layout. |
| **Vacío** | `EmptyState` | Query válida, cero resultados. Incluye acción sugerida si aplica. |
| **Error** | `ErrorBoundary` + `showToast("error", …)` | Falla de red/API. Mensaje humano, no stack. |
| **Con datos** | el contenido real | + indicadores de **frescura/confianza** cuando el dato lo amerite (última sync, calidad de bot, fiabilidad de audiencia). |

---

## 4. Feedback y acciones

| Situación | Patrón | Regla |
|-----------|--------|-------|
| Confirmación no destructiva | `showToast(type, msg)` | `type`: success/info/warning/error. Efímero, no bloquea. |
| Acción destructiva o costosa | `showConfirm({ danger })` (`ConfirmModal`) | Publicar, gastar, borrar, cambiar reglas → **siempre** confirma. Botón peligro en rojo. |
| Acción de IA con consecuencia | `ConfirmModal` + razonamiento visible | La IA sugiere y explica; el humano aprueba (P7). Nunca ejecución silenciosa. |
| Notificación asíncrona | `NotificationBell` | SLAs, sync terminada, menciones. |

Los overlays (`Toast`, `ConfirmModal`) tienen **API imperativa** y ya están montados en el
root layout: se invocan, no se montan por página.

---

## 5. Datos tabulares

- Clases: `.stat-table`, `.data-row`, `.table-*`, `.badge-*`, `.status-dot-*`, `.stat-chip-*`,
  `.metric-pill`.
- Números en fuente **mono tabular** (`.t-kpi` / `.t-data`) para alineación de columnas.
- IDs/timestamps en `.t-id` / `.t-mono`.
- Estado por fila con `.status-dot-*` o `.badge-*` semántico (color = significado, P2).
- Hover de fila con `--row-hover` (cambia por tema).

---

## 6. Formularios

- Clases: `.f-label`, `.f-input`, `.f-select`, `.f-textarea`, `.f-row`.
- Validación inline, mensaje de error humano bajo el campo.
- Estados de campo: normal / focus (anillo azul de marca) / error (borde rojo) / disabled.
- Acción primaria con `.btn-brand`; secundaria `.btn-primary`/`.btn-ghost`. Una sola acción
  primaria por formulario.

---

## 7. Botones y jerarquía de acción

| Clase | Uso | Regla |
|-------|-----|-------|
| `.btn-brand` | CTA principal (azul sólido) | Máximo uno prominente por vista. |
| `.btn-primary` | Acción secundaria (azul tenue) | — |
| `.btn-ghost` | Terciaria / cancelar | Sin relleno. |

Iconos en botones: Lucide vía `SIcon`, nunca emoji.

---

## 8. Superficies y profundidad

- Superficies sólidas: `.glass-panel` / `.glass-card` / `.glass-panel-v2`, `.kpi-card`,
  `.metric-card`, `.chart-panel`, `.project-card`. **El blur solo va en `.modal-overlay` y
  `.toast`** — el resto son sólidas (rendimiento y legibilidad).
- Radios: tarjetas 14–16px, controles 6–10px.
- Sombras: **solo negras/neutras**, nunca de color. Patrón base `0 4px 24px rgba(0,0,0,.25)`.
- Elevación por color de superficie (`--surface` → `--surface-hover` → `--bg-raised`), no por
  glow.

---

## 9. Gráficas

- Series **solo** desde `CHART_PALETTE` o gradientes de `<ChartTheme/>` — nunca hex sueltos.
- Tooltip compartido: `CustomTooltip`.
- Grid/ejes ya estilizados globalmente (`.recharts-*`); no pasar `stroke` redundante.
- Contenedor: `ChartPanel` con leyenda `[{label, color-token}]`.

---

## 10. Movimiento

- Entrada de página: `page-enter` (escalonada). Transiciones 0.15–0.25s.
- `framer-motion` con moderación (P1: sin decoración gratuita).
- **Respetar `prefers-reduced-motion`** (regla global) — ver [04-accesibilidad](04-accesibilidad.md).

---

## 11. Responsive

Mobile-first. Breakpoints en uso: **640 / 768 / 1024 / 1280 / 1440**.
- `< 768px`: `MobileBottomNav`, layout de una columna, KPIs apilados.
- `1024–1279px`: sidebar colapsado a 80px.
- `≥ 1280px`: layout completo.

---

## 12. Checklist de patrón (antes de construir una vista)

- [ ] ¿Sigue el patrón de página canónico (§1)?
- [ ] ¿Declara los 4 estados de datos (§3)?
- [ ] ¿Reutiliza primitivos existentes en vez de crear nuevos (P5)?
- [ ] ¿Las acciones costosas confirman (§4)?
- [ ] ¿Color = significado, no decoración (P2)?
- [ ] ¿Se ve bien en los 3 temas y en móvil?
- [ ] ¿Sin emojis, sin glow, sin hex nuevos (design-system.md §10)?
