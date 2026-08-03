import { NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;
  try {
    const keywords = await prisma.trackedKeyword.findMany({
      where: { workspaceId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ keywords });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;
  try {
    const { query, type } = await request.json();
    if (!query?.trim()) return NextResponse.json({ error: "query required" }, { status: 400 });
    const keyword = await prisma.trackedKeyword.upsert({
      where: { workspaceId_query: { workspaceId, query: query.trim() } },
      update: { active: true },
      create: { workspaceId, query: query.trim(), type: type || "keyword" },
    });
    return NextResponse.json({ keyword });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
