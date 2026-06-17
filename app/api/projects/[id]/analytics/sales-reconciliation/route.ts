import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { cdmxRange } from "@/lib/crm/timezone";
import { resolveProjectScope } from "@/lib/analytics/project-scope.server";
import { getBotmakerConnection, listSessions, saleSessionPhones, normalizePhone } from "@/lib/botmaker";

// POST /api/projects/[id]/analytics/sales-reconciliation?days=30   (multipart: file)
//
// Cruce de las ventas del dashboard (regla "felicidades") contra la SÁBANA DE
// VENTAS subida (CSV/XLSX). Metodología BAIT:
//   ventas exitosas        = ventas dashboard cuyo teléfono aparece en la sábana
//   primer rechazo Botmaker = ventas dashboard − ventas exitosas
// Los 2 motivos de rechazo se devuelven SIN reparto artificial (solo se aclaran).
//
// Claridad de fuente: ventas dashboard salen de Botmaker (felicidades); las
// exitosas salen del CRUCE con la sábana. No se mezclan universos.

const PHONE_HEADERS = /tel|telefono|tel[eé]fono|numero|n[uú]mero|phone|celular|whatsapp|msisdn|linea|l[ií]nea/i;
const BOT_HEADERS = /\bbot\b|flujo|campa|proyecto/i;
const CAPTURISTA_HEADERS = /capturista|agente|asesor|vendedor|ejecutivo/i;

const pickColumn = (headers: string[], re: RegExp): string | null => headers.find((h) => re.test(h)) || null;

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const days = Math.max(1, Math.min(180, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));

  const scope = await resolveProjectScope(ctx.workspaceId, id);
  if (!scope) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  if (scope.providers[0] !== "botmaker") {
    return apiError("El cruce con sábana aplica solo a proyectos Botmaker", "PROVIDER_NOT_SUPPORTED", 400);
  }

  // 1) Parsear la sábana subida (CSV o XLSX; SheetJS auto-detecta).
  let rows: Record<string, unknown>[] = [];
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("Falta el archivo de la sábana", "NO_FILE", 400);
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  } catch (error) {
    logger.error("sales-reconciliation: parse failed", { workspaceId: ctx.workspaceId, error });
    return apiError("No se pudo leer la sábana (usa CSV o XLSX con encabezados)", "PARSE_ERROR", 400);
  }
  if (!rows.length) return apiError("La sábana está vacía o sin encabezados", "EMPTY_SHEET", 400);

  const headers = Object.keys(rows[0]);
  const phoneCol = pickColumn(headers, PHONE_HEADERS);
  if (!phoneCol) return apiError(`No se detectó columna de teléfono. Encabezados: ${headers.join(", ")}`, "NO_PHONE_COLUMN", 400);
  const botCol = pickColumn(headers, BOT_HEADERS);
  const capCol = pickColumn(headers, CAPTURISTA_HEADERS);

  const sheetPhones = new Set<string>();
  const metaByPhone = new Map<string, { bot?: string; capturista?: string }>();
  for (const r of rows) {
    const p = normalizePhone(r[phoneCol]);
    if (p.length !== 10) continue;
    sheetPhones.add(p);
    metaByPhone.set(p, {
      bot: botCol ? String(r[botCol] || "") : undefined,
      capturista: capCol ? String(r[capCol] || "") : undefined,
    });
  }

  // 2) Ventas del dashboard (felicidades) en la ventana — fuente: Botmaker.
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no está conectado", "NOT_CONNECTED", 400);
  const range = cdmxRange(days);
  let salePhones: string[] = [];
  try {
    const sessions = await listSessions(conn.accessToken, range.fromISO, range.toISO, 6, conn.baseUrl);
    salePhones = saleSessionPhones(sessions);
  } catch (error) {
    logger.error("sales-reconciliation: botmaker failed", { workspaceId: ctx.workspaceId, error });
    return apiError("Error al consultar Botmaker", "BOTMAKER_ERROR", 502);
  }

  // 3) Reconciliación.
  const uniqueSalePhones = [...new Set(salePhones)];
  const dashboardSales = uniqueSalePhones.length;
  const matched = uniqueSalePhones.filter((p) => sheetPhones.has(p));
  const exitosas = matched.length;
  const firstRejection = Math.max(0, dashboardSales - exitosas);

  const byBot: Record<string, number> = {};
  const byCapturista: Record<string, number> = {};
  for (const p of matched) {
    const m = metaByPhone.get(p);
    if (m?.bot) byBot[m.bot] = (byBot[m.bot] || 0) + 1;
    if (m?.capturista) byCapturista[m.capturista] = (byCapturista[m.capturista] || 0) + 1;
  }

  return apiSuccess({
    range: { from: range.fromISO, to: range.toISO, timezone: "America/Mexico_City" },
    columns: { phone: phoneCol, bot: botCol, capturista: capCol },
    sheetRows: rows.length,
    sheetPhones: sheetPhones.size,
    dashboardSales,
    exitosas,
    firstRejection,
    byBot: Object.entries(byBot).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    byCapturista: Object.entries(byCapturista).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    rejectionReasons: [
      "Ya tenemos un registro en proceso con este número telefónico. (3023)",
      "El número a portar ya está registrado en nuestro sistema con un estatus activo reciente.",
    ],
  });
});

export const maxDuration = 300;
