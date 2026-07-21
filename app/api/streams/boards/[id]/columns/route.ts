import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const { id } = await params;
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
}
