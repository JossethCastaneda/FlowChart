/**
 * lib/accent-color.ts
 * =====================================================================
 * Convierte el color de marca de un workspace en tokens CSS usables.
 *
 * El problema de diseño: una agencia puede elegir amarillo pastel o azul
 * marino. Pintar ese hex tal cual en iconos y enlaces produce texto ilegible
 * sobre el fondo del tema. Aquí el color se separa en dos usos distintos:
 *
 *   • TINTA  (`--cyan`)  → iconos, enlaces, etiquetas. Se ajusta en claridad
 *     hasta alcanzar contraste suficiente contra el fondo del tema activo.
 *   • RELLENO(`--c-brand`) → botones, barras, indicadores. Conserva el color
 *     de marca tal cual, y `--accent-contrast` dice si encima va texto blanco
 *     o negro.
 *
 * Lo que NUNCA se tiñe: verde de éxito, ámbar de alerta, rojo de error y los
 * acentos por módulo. Esos colores comunican estado, no marca: recolorearlos
 * rompe la comprensión y la accesibilidad.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(value: string | undefined | null): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.trim().replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Luminancia relativa WCAG 2.1 (0 = negro, 1 = blanco). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razón de contraste WCAG entre dos luminancias (1 a 21). */
export function contrastRatio(lumA: number, lumB: number): number {
  const light = Math.max(lumA, lumB);
  const dark = Math.min(lumA, lumB);
  return (light + 0.05) / (dark + 0.05);
}

// ── Conversión HSL (para aclarar/oscurecer conservando el matiz) ─────────────

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  };
}

function withLightness(hex: string, lightness: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.min(1, Math.max(0, lightness)) }));
}

/**
 * Ajusta la claridad del color hasta alcanzar `targetRatio` contra el fondo,
 * conservando matiz y saturación. Devuelve el color original si ya cumple.
 *
 * Sobre fondo oscuro aclara; sobre fondo claro oscurece. Si ni el extremo
 * alcanza el objetivo (colores muy poco saturados), devuelve lo más cercano.
 */
export function adjustForContrast(hex: string, backgroundHex: string, targetRatio: number): string {
  const bgLum = relativeLuminance(hexToRgb(backgroundHex));
  if (contrastRatio(relativeLuminance(hexToRgb(hex)), bgLum) >= targetRatio) return hex;

  const bgIsDark = bgLum < 0.5;
  const { l: startL } = rgbToHsl(hexToRgb(hex));

  let best = hex;
  let bestRatio = contrastRatio(relativeLuminance(hexToRgb(hex)), bgLum);

  // Barrido en pasos de 2% hacia el extremo que aumenta el contraste.
  for (let step = 1; step <= 50; step++) {
    const l = bgIsDark ? startL + step * 0.02 : startL - step * 0.02;
    if (l > 1 || l < 0) break;

    const candidate = withLightness(hex, l);
    const ratio = contrastRatio(relativeLuminance(hexToRgb(candidate)), bgLum);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= targetRatio) return candidate;
  }

  return best;
}

/** Color de texto legible encima del color dado: blanco o casi negro. */
export function readableTextOn(hex: string): string {
  const lum = relativeLuminance(hexToRgb(hex));
  const onWhite = contrastRatio(lum, relativeLuminance({ r: 255, g: 255, b: 255 }));
  const onBlack = contrastRatio(lum, relativeLuminance({ r: 17, g: 25, b: 39 }));
  return onWhite >= onBlack ? "#ffffff" : "#111927";
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

// ── Generación de tokens ────────────────────────────────────────────────────

/** Fondo de cada tema, para calcular el contraste de la tinta. */
export const THEME_BACKGROUNDS: Record<string, string> = {
  dark: "#0b0d12",
  light: "#f5f7fa",
  azul: "#0c1220",
};

/**
 * Contraste objetivo para la tinta. 4.5 es el mínimo AA para texto normal;
 * `--cyan` se usa sobre todo en iconos y etiquetas pequeñas, así que se exige
 * el nivel de texto y no el de 3:1 de elementos gráficos.
 */
const INK_TARGET_RATIO = 4.5;

export interface AccentTokens {
  [cssVariable: string]: string;
}

/**
 * Construye las variables CSS a inyectar en <html> para un color de marca.
 *
 * `theme` debe ser el tema resuelto ("dark" | "light" | "azul"), porque el
 * ajuste de la tinta depende del fondo real sobre el que se pintará.
 */
export function buildAccentTokens(accentHex: string, theme: string): AccentTokens {
  const accent = isValidHex(accentHex) ? accentHex.trim().toLowerCase() : "#5b9bff";
  const background = THEME_BACKGROUNDS[theme] ?? THEME_BACKGROUNDS.dark;
  const isDark = relativeLuminance(hexToRgb(background)) < 0.5;

  // Tinta: legible sobre el fondo del tema.
  const ink = adjustForContrast(accent, background, INK_TARGET_RATIO);

  // Relleno: el color de marca íntegro, con su texto legible encima.
  const fill = accent;
  const fillContrast = readableTextOn(accent);
  const { l } = rgbToHsl(hexToRgb(accent));
  const fillHover = withLightness(accent, isDark ? Math.min(1, l + 0.08) : Math.max(0, l - 0.08));

  return {
    // Tokens nuevos, explícitos sobre su uso.
    "--accent": fill,
    "--accent-hover": fillHover,
    "--accent-contrast": fillContrast,
    "--accent-ink": ink,
    "--accent-dim": rgba(ink, isDark ? 0.14 : 0.10),
    "--accent-border": rgba(ink, isDark ? 0.32 : 0.28),

    // Alias históricos: cientos de componentes ya los consumen, así que
    // reasignarlos es lo que hace que la marca se vea en toda la plataforma.
    "--c-brand": fill,
    "--cyan": ink,
    "--cyan-dim": rgba(ink, isDark ? 0.14 : 0.10),
  };
}

/** Nombres de las variables que se inyectan, para poder limpiarlas al salir. */
export const ACCENT_VARIABLE_NAMES = Object.keys(buildAccentTokens("#5b9bff", "dark"));
