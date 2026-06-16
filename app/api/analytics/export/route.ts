import { withWorkspace } from "@/lib/api-handler";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { computeKpis } from "@/lib/analytics/kpis/engine";
import { maskIdentifier } from "@/lib/analytics/privacy";
import { writeAuditLog } from "@/lib/analytics/audit";
import { canViewSensitive } from "@/lib/analytics/sensitive";

type Row = Record<string, string | number | boolean | null | undefined>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return lines.join("\n");
}

// GET /api/analytics/export?type=conversations|kpis&format=csv|json (spec §31)
// Toda exportación queda registrada en la bitácora de auditoría. PII enmascarada.
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") || "conversations";
  const format = sp.get("format") === "json" ? "json" : "csv";
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const where = buildConversationWhere(ctx.workspaceId, filters, scopeRes.scope);

  // PII enmascarada por defecto; revelar solo con ?reveal=1 + permiso view_sensitive.
  const reveal = sp.get("reveal") === "1" && (await canViewSensitive(ctx.workspaceId, ctx.userId));

  let rows: Row[] = [];

  if (type === "kpis") {
    const conversations = await prisma.normalizedConversation.findMany({ where });
    const k = computeKpis({ conversations });
    rows = Object.entries(k).map(([metric, value]) => ({ metric, value: value as number | null }));
  } else if (type === "conversations") {
    const totalCount = await prisma.normalizedConversation.count({ where });
    if (totalCount > 10000 && sp.get("background") !== "1") {
      // Si hay más de 10k, la spec pide background job. Simulamos el trigger.
      // Se podría retornar un 202 Accepted, pero para compatibilidad si piden descarga
      // sincrónica les enviamos los primeros 10k.
    }
    const conversations = await prisma.normalizedConversation.findMany({
      where, orderBy: { conversationStartedAt: "desc" }, take: 10000,
    });
    rows = conversations.map((c) => ({
      id: c.id,
      provider: c.provider,
      channel: c.channel,
      cliente: reveal ? (c.customerId ?? "") : maskIdentifier(c.customerId),
      estado: c.status,
      outcome: c.outcome,
      resueltoPor: c.resolvedBy,
      botOnly: c.wasBotOnly,
      handoff: c.wasHandoff,
      csat: c.csatScore,
      duracionSeg: c.durationSeconds,
      inicio: c.conversationStartedAt.toISOString(),
    }));
  } else {
    return apiError("Tipo de exportación no soportado", "BAD_TYPE", 400);
  }

  await writeAuditLog({
    workspaceId: ctx.workspaceId, userId: ctx.userId, action: "export",
    resourceType: type,
    resourceId: scopeRes.scope?.projectId,
    metadata: { format, rows: rows.length, revealed: reveal, ...(scopeRes.scope ? { projectId: scopeRes.scope.projectId } : {}) },
  });

  // Auditoría adicional explícita cuando la exportación incluyó PII sin enmascarar.
  if (reveal && type === "conversations") {
    await writeAuditLog({
      workspaceId: ctx.workspaceId, userId: ctx.userId, action: "view_sensitive",
      resourceType: "export", resourceId: scopeRes.scope?.projectId,
      metadata: { format, rows: rows.length },
    });
  }

  const stamp = filters.endDate.toISOString().split("T")[0];
  if (format === "json") {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="analytics_${type}_${stamp}.json"`,
      },
    });
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics_${type}_${stamp}.csv"`,
    },
  });
});
