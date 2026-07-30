import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { logger } from "@/lib/logger";
import { z } from "zod";
import prisma from "@/lib/prisma";

const ColumnsSchema = z.object({
  columns: z.array(
    z.object({
      type: z.string().min(1).max(40),
      platform: z.string().max(40).optional().nullable(),
      query: z.string().max(500).optional().nullable(),
    })
  ).max(50),
});

export const PUT = withWorkspace(async (
  request,
  ctx
) => {
  const workspaceId = ctx.workspaceId;
  const { id } = await ctx.params;
  try {
    const board = await prisma.streamBoard.findFirst({ where: { id, workspaceId } });
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Validación Zod (antes se usaban c.type/c.platform/c.query crudos).
    const raw = await request.json().catch(() => null);
    const parsed = ColumnsSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Payload de columnas inválido" }, { status: 400 });
    const { columns } = parsed.data;

    await prisma.$transaction([
      prisma.streamColumn.deleteMany({ where: { boardId: id } }),
      prisma.streamColumn.createMany({
        data: columns.map((c, i) => ({
          boardId: id,
          type: c.type,
          platform: c.platform ?? "", // columna StreamColumn.platform es no-nullable
          query: c.query || null,
          position: i,
        })),
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    // No filtrar el mensaje de error crudo al cliente.
    logger.error("[STREAMS] columns PUT error", { boardId: id, error: err });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
});
