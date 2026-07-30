import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const DELETE = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;
  const { id } = await ctx.params;
  try {
    const kw = await prisma.trackedKeyword.findFirst({ where: { id, workspaceId } });
    if (!kw) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.trackedKeyword.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
