# Sodare Ink — Design System y Reglas de Integración (Figma MCP)

> **Fuente de verdad**: `app/globals.css` (tokens) + este documento (reglas).
> Vigente desde julio 2026. Reemplaza al antiguo "Imperial Command Center / 1A Comando"
> (neón cian + Orbitron), eliminado por ilegible y genérico. El código aún cita
> "Brand Guide §03/§05" en comentarios: esas referencias apuntan ahora a este archivo.

---

## 1. Identidad visual

**Tema: negro / azul / blanco.** Interfaz sobria tipo herramienta profesional
(referencias: Linear, Vercel). Sin glows, sin text-shadows, sin gradientes arcoíris,
sin fuentes sci-fi. La jerarquía se construye con peso tipográfico, espaciado y
una sola familia de acentos azules; los colores semánticos (verde/ámbar/rojo/violeta)
se reservan para estado, no para decoración.

Prohibiciones duras (aplican a todo PR):

- ❌ `text-shadow` o `box-shadow` de color (glow). Sombras solo negras/neutras.
- ❌ Hex nuevos en TSX. Todo color se consume vía `var(--token)` o utilidades Tailwind
  (ya remapeadas a la marca).
- ❌ Fuentes display decorativas. No reintroducir Orbitron ni `@import` de Google Fonts
  (las fuentes se sirven con `next/font` desde `app/layout.tsx`).
- ❌ Emojis como iconos de UI (✅/⚠️/⚡…). Usar Lucide.
- ❌ Re-dibujar logos de plataformas como SVG inline: ya existen en
  `components/ui/AppIcons.tsx` y `public/icons/`.

---

## 2. Tokens de diseño

### 2.1 Dónde viven y su formato

- **`app/globals.css`** — dos capas:
  1. Bloque **`@theme` de Tailwind v4** (no hay `tailwind.config.*`; la config es CSS):
     remapea la paleta default de Tailwind a la marca. `text-cyan-400`, `bg-emerald-500`,
     etc. resuelven a los valores sobrios de abajo.
  2. **CSS custom properties en `:root`** (tema oscuro default "Ink") con overrides por
     clase de tema: `:root.theme-claro` y `:root.theme-azul-medianoche`.
- No hay pipeline de transformación de tokens (ni Style Dictionary ni JSON): el contrato
  es *CSS variables como única fuente*. Cualquier constante JS (p. ej. `COLOR_MAP` en
  `components/ui/KpiCard.tsx`) debe duplicar el RGB del token **con comentario** que
  apunte a `globals.css`.

### 2.2 Paleta (tema oscuro default)

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#0b0d12` | Fondo app (negro azulado) |
| `--surface` / `--bg-raised` | `#12151c` | Tarjetas, paneles, sidebar |
| `--surface-hover` | `#1a1e27` | Hover de superficies |
| `--foreground` | `#e8ebf0` | Texto principal (blanco suave) |
| `--text-secondary` | `#9aa4b2` | Texto secundario |
| `--text-muted` | `#667082` | Texto terciario / labels |
| `--border` / `--border-strong` / `--hairline` | blancos al 8/16/6% | Bordes |
| `--c-brand` | `#3b82f6` | Azul de acción (botones, focus, gradientes) |
| `--cyan` | `#5b9bff` | Azul de acento para texto/iconos (alias histórico) |
| `--c-success` → `--emerald` | `#34b77c` | Éxito |
| `--c-warning` → `--amber` | `#e0a83c` | Advertencia |
| `--c-danger` → `--red` | `#e5484d` | Peligro |
| `--c-info` → `--purple` | `#8b8df2` | Info / acento secundario |
| `--cyan-dim`, `--red-dim`, … | rgba 10–12% | Fondos tenues de cada acento |
| `--mod-*` (15 tokens) | ver globals.css | Acento por módulo del sidebar |
| `--panel-bg`, `--overlay-dark`, `--row-hover`, `--topbar-bg` | — | Overlays/tablas, cambian por tema |

Los alias `--cyan/--emerald/--amber/--red/--purple` existen porque tienen cientos de
consumidores; **en código nuevo prefiere los semánticos `--c-*`**.

RGB de los acentos (para `rgba(r,g,b,a)` cuando no exista un `--*-dim` adecuado):
azul `59,130,246` · azul claro `91,155,255` · verde `52,183,124` · ámbar `224,168,60`
· rojo `229,72,77` · violeta `139,141,242`.

### 2.3 Temas

| Clase en `<html>` | Nombre UI | Notas |
|---|---|---|
| *(sin clase)* | Ink (oscuro) | Default |
| `.theme-claro` | Claro | Blanco/azul `#2563eb`; semánticos oscurecidos para contraste AA |
| `.theme-azul-medianoche` | Azul medianoche | Azul profundo `#0c1220` |

Mecanismo: `components/layout/ClientMainWrapper.tsx` lee/persiste `localStorage["sodare:theme"]`
(valores `original | claro | azul_medianoche`) y aplica la clase. `app/layout.tsx` inyecta un
script inline en `<head>` que aplica la clase **antes del primer paint** (anti-FOUC) — si se
añade un tema nuevo hay que actualizar ambos sitios.

**Regla**: todo estilo debe verse bien en los 3 temas → nunca hardcodear un color de fondo
o de texto; siempre `var(--surface)`, `var(--foreground)`, etc.

### 2.4 Tipografía

- **Sans y display**: Inter Tight vía `next/font` (`--font-inter`, expuesta como
  `--font-sans` y `--font-display` en `@theme`). El "display" se diferencia por peso
  (700) y tracking, no por familia.
- **Mono (datos, IDs, timestamps)**: JetBrains Mono vía `next/font` (`--font-jbmono`
  → `--font-mono`).
- Clases del sistema: `.t-display`, `.t-kpi` (números tabulares), `.t-label`
  (10px uppercase tracking 0.1em), `.t-mono`, `.t-id`, `.t-data`.
- En estilos inline usar `fontFamily: "var(--font-display)"` — **nunca** el nombre
  de la fuente.
- Tracking máximo permitido en uppercase: `0.12em`. Nada de `letter-spacing: 0.2em+`
  (herencia del tema viejo; se fue reduciendo en globals — imitar los valores actuales).

---

## 3. Librería de componentes

### 3.1 Estructura

```
components/
  ui/            ← primitivos del design system (ÚNICO lugar para nuevos primitivos)
    charts/      ← ChartPanel, ChartTheme (+CHART_PALETTE), CustomTooltip
  layout/        ← shell: ClientMainWrapper (sidebar+topbar), providers, WorkspaceSwitcher
  <módulo>/      ← ads-manager/, publisher/, inbox/, settings/, listening/, botmaker/…
  shared/        ← selectores reutilizados entre módulos
lib/sodare-kit/  ← registro de módulos/nav: modules.ts (fuente única), nav-items.ts, roles.ts
stores/          ← zustand (insights, projects, publisher, clipboard)
```

No hay Storybook ni tests de componentes; la validación visual es manual + `npm run typecheck`.
`components/projects/` (EN) y `components/proyectos/` (ES) conviven — deuda de naming, no crear
una tercera variante.

### 3.2 Primitivos y su modelo de acento

| Componente | Acento |
|---|---|
| `KpiCard` | prop `color: "cyan"\|"red"\|"amber"\|"emerald"\|"purple"` (enum cerrado; barra superior + sparkline) |
| `PageHeader` | prop `iconColor` (string CSS libre, aplicado con `color-mix`) |
| `Toast` / `ConfirmModal` | API imperativa `showToast(type, msg)` / `showConfirm({danger})` |
| `ChartPanel` | leyenda `[{label, color}]` — pasar **tokens**, no hex |
| `EmptyState`, `Skeleton`, `DateRangePicker`, `NotificationBell` | neutrales, sin prop de color |

Patrón de página canónico (`app/dashboard/resumen/page.tsx`):
`"use client"` → fetch (`/api/...` + React Query/zustand) → `<PageHeader>` → grid de
`<KpiCard>` → `<ChartPanel>` con Recharts + `<ChartTheme/>` → overlays imperativos
(`showToast`, `showConfirm`) ya montados en el root layout.

### 3.3 Clases CSS del sistema (globals.css)

Superficies: `.glass-panel` / `.glass-card` / `.glass-panel-v2` (sólidas — el blur solo
va en `.modal-overlay`/`.toast`), `.kpi-card`, `.metric-card`, `.chart-panel`, `.project-card`.
Navegación: `.nav-item` (+`data-mod` por módulo), `.tab-pill-nav`/`.tab-pill`.
Datos: `.stat-table`, `.data-row`, `.table-*`, `.badge-*`, `.status-dot-*`, `.stat-chip-*`,
`.metric-pill`. Botones: `.btn-brand` (azul sólido, CTA), `.btn-primary` (azul tenue),
`.btn-ghost`. Formularios: `.f-label`, `.f-input`, `.f-select`, `.f-textarea`, `.f-row`.

---

## 4. Frameworks y build

- **Next.js 16 (App Router)** — leer `node_modules/next/dist/docs/` ante dudas; hay
  breaking changes vs. conocimiento previo. `next dev --webpack` en dev; build de Vercel
  corre `scripts/db-sync.mjs && prisma generate && next build`.
- **React 19**, **TypeScript strict** (CI corre `npx tsc --noEmit` — mantener verde).
- **Tailwind CSS v4** vía `@tailwindcss/postcss`. Configuración 100% en CSS (`@theme`).
- **Recharts 3** (gráficas), **framer-motion** (usar con moderación), **cmdk** (⌘K),
  **zustand** + **React Query** (estado), **lucide-react** (iconos).

---

## 5. Assets

- `public/`: logos Sodare (`sodare-logo*.{jpg,png}`) + `public/icons/` con 15 SVG de
  plataformas (meta, google-ads, ga4, gtm, tiktok, whatsapp, telegram, linkedin, x,
  instagram, messenger, hubspot, botmaker, cari-ai, sodare). Favicon: `app/icon.svg`.
- Subidas en runtime → **Vercel Blob** (`app/api/publisher/upload/route.ts`,
  `app/api/crecimiento/datasets/route.ts`). **Nunca** disco local (regla Zero Local State).
- `next.config.ts` permite imágenes remotas de fbcdn/graph.facebook/cdninstagram/
  googleusercontent/tiktokcdn. Deuda: casi todo usa `<img>`; para superficies nuevas
  usar `next/image`.

---

## 6. Sistema de iconos

1. **Funcionales (UI)**: `lucide-react`, siempre envueltos en **`SIcon`**
   (`components/ui/SIcon.tsx`): `strokeWidth 1.75`, 18px en nav / 20px en contenido.
   ```tsx
   import { SIcon } from "@/components/ui/SIcon";
   import { LayoutDashboard } from "lucide-react";
   <SIcon icon={LayoutDashboard} size={20} />
   ```
   Canónicos: `CheckCircle2` (no `CheckCircle`), `AlertTriangle`, `XCircle`, `Loader2`,
   `Zap`, `BarChart3`. El color del icono se hereda (`currentColor`) o se pasa por
   `style={{ color: "var(--token)" }}`.
2. **Marcas/plataformas**: `components/ui/AppIcons.tsx` — 14 componentes (`MetaIcon`,
   `GoogleAdsIcon`, `TikTokAdsIcon`, `WhatsAppIcon`…) + mapa `APP_ICONS` (23 alias
   snake_case) + helper `getPlatformIcon(platformId)`. Es la ÚNICA fuente para logos.
3. **Sidebar**: `lib/sodare-kit/modules.ts` declara `icon` como nombre lucide en
   kebab-case; `ICON_MAP` en `components/layout/ClientMainWrapper.tsx` lo resuelve
   (tipado `Record<string, LucideIcon>`). **Todo icono nuevo en `modules.ts` debe
   añadirse a `ICON_MAP`** (si falta cae al fallback `LayoutDashboard`).
4. **Marca Sodare**: `SodareLogo` (wordmark + emblema) y `Orbi` (mascota). `HoloIcon`
   es un wrapper legacy del sidebar: hoy pinta acento sólido del tema, sin glow —
   para iconos nuevos usar `SIcon`.

---

## 7. Metodología de estilos

- **Orden de preferencia**: 1) clases del sistema (`.kpi-card`, `.btn-brand`…),
  2) utilidades Tailwind (remapeadas a la marca), 3) estilos inline con `var(--token)`.
  El inline masivo existente es legacy tolerado; no ampliarlo.
- **Responsive**: mobile-first con los breakpoints ya usados (640/768/1024/1280/1440).
  El sidebar colapsa a 80px entre 1024–1279px y con `.sidebar-collapsed`.
  `MobileBottomNav` cubre <768px.
- **Animación**: `page-enter` (entrada escalonada), transiciones 0.15–0.25s. Respetar
  `prefers-reduced-motion` (regla global ya definida).
- **Charts**: colores de series SOLO desde `CHART_PALETTE` o gradientes de `<ChartTheme/>`
  (`colorCyanArea`, `colorEmeraldBar`…); tooltips con `CustomTooltip` compartido;
  grid/ejes ya estilizados globalmente vía `.recharts-*` — no pasar `stroke` redundante.

---

## 8. Integración con Figma (MCP)

Reglas al implementar diseños que lleguen vía `get_design_context` / `get_screenshot`:

1. **Mapear colores a tokens, nunca copiar hex**. Tabla de equivalencia rápida al leer
   variables de Figma (`get_variable_defs`):
   - Azul primario → `var(--c-brand)`; azul de texto/icono → `var(--cyan)`
   - Fondos → `var(--background)` / `var(--surface)` / `var(--surface-hover)`
   - Texto → `var(--foreground)` / `var(--text-secondary)` / `var(--text-muted)`
   - Semánticos → `var(--c-success|c-warning|c-danger|c-info)`
   - Bordes → `var(--border)` / `var(--border-strong)` / `var(--hairline)`
2. **Componentes antes que divs**: si el diseño contiene una tarjeta KPI, tabla, badge,
   tab o modal, usar el primitivo existente (§3.2/3.3) y ajustar props — no re-crear.
3. **Tipografía**: cualquier texto display del diseño → `--font-display` + peso;
   labels uppercase → `.t-label`; números → `.t-kpi`/`.t-data`.
4. **Iconos del diseño** → buscar el equivalente Lucide (via `SIcon`); logos → `AppIcons`.
5. **Radios y sombras**: tarjetas 14–16px, controles 6–10px; sombras solo negras
   (`0 4px 24px rgba(0,0,0,.25)` patrón base).
6. **Code Connect**: al mapear componentes Figma→código, los targets canónicos son los
   primitivos de `components/ui/` (KpiCard, PageHeader, ChartPanel, Toast, badges CSS).
7. Los diseños generados hacia Figma (code-to-design) deben usar esta paleta y tipografía
   para que el roundtrip no degenere en hex sueltos.

---

## 9. Deuda conocida (no bloqueante, atacar oportunísticamente)

- ~290 `fontFamily:` inline y ~150 `boxShadow` inline en TSX: los colores ya se
  migraron a la paleta sobria por codemod, pero siguen siendo literales → al tocar un
  archivo, convertir a tokens/clases.
- 66 SVG inline duplican logos de `AppIcons` (peores: `app/login/page.tsx`,
  `components/publisher/Composer.tsx`, `IntegrationsPanel.tsx`).
- 33 emojis como iconos (peor: `app/dashboard/ads-manager/page.tsx` ×13).
- `SIcon` casi sin adopción (los 117 archivos importan lucide directo con tamaños ad-hoc).
- `CommandMenu.tsx` enlaza rutas muertas (`/dashboard/integraciones`, `/dashboard/miembros`).
- `SodareIcon` duplicado con diseños distintos en `AppIcons.tsx` y `SodareLogo.tsx`;
  IDs SVG fijos sin `useId()` en algunos componentes de marca.
- Casi nulo uso de `next/image`.
- `components/projects/` vs `components/proyectos/` (naming EN/ES).

---

## 10. Checklist para PRs de UI

- [ ] Cero hex/rgba nuevos (salvo en `globals.css` con token + documentación aquí).
- [ ] Sin glow (`box-shadow`/`text-shadow` de color) ni gradientes multicolor.
- [ ] Fuentes solo vía `var(--font-sans|display|mono)`.
- [ ] Iconos: Lucide vía `SIcon` / marcas vía `AppIcons`; sin emojis.
- [ ] Se ve correcto en los 3 temas (Ink, Claro, Azul medianoche).
- [ ] Charts usan `CHART_PALETTE` / `ChartTheme` / `CustomTooltip`.
- [ ] `npx tsc --noEmit` limpio.
