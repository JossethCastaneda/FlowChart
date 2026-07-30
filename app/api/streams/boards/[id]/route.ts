import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const DELETE = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;
  const { id } = await ctx.params;
  try {
    const board = await prisma.streamBoard.findFirst({ where: { id, workspaceId } });
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.streamBoard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
