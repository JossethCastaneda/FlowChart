import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

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
    const { columns } = await request.json();
    if (!Array.isArray(columns)) return NextResponse.json({ error: "columns must be array" }, { status: 400 });
    await prisma.$transaction([
      prisma.streamColumn.deleteMany({ where: { boardId: id } }),
      prisma.streamColumn.createMany({
        data: columns.map((c: any, i: number) => ({
          boardId: id,
          type: c.type,
          platform: c.platform,
          query: c.query || null,
          position: i,
        })),
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
