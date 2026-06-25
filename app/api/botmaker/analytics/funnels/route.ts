import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBotmakerConnection, listSessions } from "@/lib/botmaker-api";
import type { BmSession } from "@/lib/botmaker-api";

/**
 * GET /api/botmaker/analytics/funnels
 *
 * Returns the bot flow funnel analytics (Doc 1 - Bot Analytics Improvement):
 * - First interaction type (button / text / media / none)
 * - Field capture funnel (name → phone → NIP → expiration)
 * - Drop-off points per flow type
 * - Comparison: prepago vs pospago-alineado vs pospago-simplificado
 *
 * Query params: from, to, channelId, flowType (prepago|pospago-alineado|pospago-simplificado)
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId }) => {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString();
    const to = url.searchParams.get("to") ?? new Date().toISOString();
    const filterChannelId = url.searchParams.get("channelId") ?? undefined;
    const filterFlowType = url.searchParams.get("flowType") ?? undefined;

    const conn = await getBotmakerConnection(workspaceId);
    if (!conn) {
      return apiSuccess(demoFunnels());
    }

    const sessions = await listSessions(conn, { from, to, includeMessages: true, includeEvents: true }).catch(() => [] as BmSession[]);

    const filtered = filterChannelId
      ? sessions.filter((s) => (s.chat?.chat?.channelId ?? "") === filterChannelId)
      : sessions;

    const total = filtered.length;

    // First interaction type breakdown
    const firstInteraction = { button: 0, text: 0, media: 0, none: 0 };

    // Field capture stages
    let capturedName = 0, capturedPhone = 0, capturedNip = 0, capturedNipDate = 0, confirmedData = 0, sentIntelix = 0;

    // Flow type detection
    const byFlowType: Record<string, number> = {};

    for (const s of filtered) {
      const msgs = (s.messages ?? []).slice().sort(
        (a, b) => new Date(a.creationTime ?? 0).getTime() - new Date(b.creationTime ?? 0).getTime()
      );

      // First user message type
      const firstUserMsg = msgs.find(m => (m.from ?? "") === "user");
      if (firstUserMsg) {
        const type = (firstUserMsg.content?.type ?? "").toLowerCase();
        if (firstUserMsg.content?.selectedButton) firstInteraction.button++;
        else if (type === "image" || type === "video" || type === "document") firstInteraction.media++;
        else if (type === "text" || type === "string") firstInteraction.text++;
        else firstInteraction.none++;
      } else {
        firstInteraction.none++;
      }

      // Variable inspection from events
      const variablesSetByName = new Set<string>();
      for (const e of (s.events ?? [])) {
        if (e.info?.variableName) {
          variablesSetByName.add(e.info.variableName.toLowerCase());
        }
      }

      // Detect captured fields by variable names from events + message content
      const hasName = hasAnyVar(variablesSetByName, ["nombrecliente", "nombre_cliente", "nombre", "name", "fullname", "nombrecompleto"]);
      const hasPhone = hasAnyVar(variablesSetByName, ["telefono", "numeroaportabilizar", "numero_a_cambiar", "numportabilizar", "phonetoechange", "phone"]);
      const hasNip = hasAnyVar(variablesSetByName, ["nip", "nip_cliente", "nipcliente"]);
      const hasNipDate = hasAnyVar(variablesSetByName, ["fechavigencianip", "fecha_vigencia_nip", "fechavigencia", "nipexpiration"]);

      // Flow type from variables
      const flowType = detectFlowTypeFromVars(variablesSetByName);
      if (!filterFlowType || flowType === filterFlowType) {
        byFlowType[flowType] = (byFlowType[flowType] ?? 0) + 1;
        if (hasName) capturedName++;
        if (hasPhone) capturedPhone++;
        if (hasNip) capturedNip++;
        if (hasNipDate) capturedNipDate++;
        // Proxy for confirmed: has all 4 fields
        if (hasName && hasPhone && hasNip && hasNipDate) confirmedData++;
        // Proxy for sent to Intelix: has intelix-related event
        if ((s.events ?? []).some(e => (e.name ?? "").toLowerCase().includes("intelix"))) sentIntelix++;
      }
    }

    const funnel = [
      { stage: "Inicio", count: total, retention: 100, dropOff: 0, dropOffPct: 0 },
      { stage: "Captura nombre", count: capturedName, retention: pct(capturedName, total), dropOff: total - capturedName, dropOffPct: pct(total - capturedName, total) },
      { stage: "Captura teléfono", count: capturedPhone, retention: pct(capturedPhone, total), dropOff: capturedName - capturedPhone, dropOffPct: pct(capturedName - capturedPhone, capturedName) },
      { stage: "Captura NIP", count: capturedNip, retention: pct(capturedNip, total), dropOff: capturedPhone - capturedNip, dropOffPct: pct(capturedPhone - capturedNip, capturedPhone) },
      { stage: "Vigencia NIP", count: capturedNipDate, retention: pct(capturedNipDate, total), dropOff: capturedNip - capturedNipDate, dropOffPct: pct(capturedNip - capturedNipDate, capturedNip) },
      { stage: "Datos confirmados", count: confirmedData, retention: pct(confirmedData, total), dropOff: capturedNipDate - confirmedData, dropOffPct: pct(capturedNipDate - confirmedData, capturedNipDate) },
      { stage: "Enviado a Intelix", count: sentIntelix, retention: pct(sentIntelix, total), dropOff: confirmedData - sentIntelix, dropOffPct: pct(confirmedData - sentIntelix, confirmedData) },
    ];

    return apiSuccess({
      from,
      to,
      total,
      firstInteraction,
      firstInteractionTotal: total,
      byFlowType,
      funnel,
    });
  } catch (err) {
    console.error("[analytics/funnels]", err);
    return apiError("Error calculando funnel de flujo", "FUNNELS_ERROR", 500);
  }
});

function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 10000) / 100 : 0; }

function hasAnyVar(set: Set<string>, candidates: string[]): boolean {
  return candidates.some(c => set.has(c) || Array.from(set).some(s => s.includes(c)));
}

function detectFlowTypeFromVars(vars: Set<string>): string {
  if (vars.has("esim") || vars.has("sim_esim")) return "prepago";
  if (vars.has("capturista") || vars.has("equipo_pospago")) return "pospago-alineado";
  if (vars.has("contrato") || vars.has("numerocontrato")) return "pospago-simplificado";
  return "prepago"; // default
}

function demoFunnels() {
  return {
    demo: true,
    total: 1248,
    firstInteraction: { button: 897, text: 287, media: 43, none: 21 },
    firstInteractionTotal: 1248,
    byFlowType: { prepago: 793, "pospago-alineado": 312, "pospago-simplificado": 143 },
    funnel: [
      { stage: "Inicio", count: 1248, retention: 100, dropOff: 0, dropOffPct: 0 },
      { stage: "Captura nombre", count: 1087, retention: 87.1, dropOff: 161, dropOffPct: 12.9 },
      { stage: "Captura teléfono", count: 987, retention: 79.09, dropOff: 100, dropOffPct: 9.2 },
      { stage: "Captura NIP", count: 847, retention: 67.87, dropOff: 140, dropOffPct: 14.18 },
      { stage: "Vigencia NIP", count: 798, retention: 63.94, dropOff: 49, dropOffPct: 5.79 },
      { stage: "Datos confirmados", count: 743, retention: 59.54, dropOff: 55, dropOffPct: 6.89 },
      { stage: "Enviado a Intelix", count: 712, retention: 57.05, dropOff: 31, dropOffPct: 4.17 },
    ],
  };
}
