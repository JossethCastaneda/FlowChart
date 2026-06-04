import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  try {
    const keywords = await prisma.trackedKeyword.findMany({
      where: { workspaceId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ keywords });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  try {
    const { query, type } = await request.json();
    if (!query?.trim()) return NextResponse.json({ error: "query required" }, { status: 400 });
    const keyword = await prisma.trackedKeyword.upsert({
      where: { workspaceId_query: { workspaceId, query: query.trim() } },
      update: { active: true },
      create: { workspaceId, query: query.trim(), type: type || "keyword" },
    });
    return NextResponse.json({ keyword });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
