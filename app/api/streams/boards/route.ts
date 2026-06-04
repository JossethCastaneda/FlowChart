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
    let boards = await prisma.streamBoard.findMany({
      where: { workspaceId },
      include: { columns: { orderBy: { position: "asc" } } },
    });
    if (boards.length === 0) {
      const board = await prisma.streamBoard.create({
        data: {
          workspaceId,
          name: "Mi Dashboard",
          columns: {
            create: [
              { type: "home_feed", platform: "facebook", position: 0 },
              { type: "mentions", platform: "instagram", position: 1 },
              { type: "published", platform: "facebook", position: 2 },
            ],
          },
        },
        include: { columns: { orderBy: { position: "asc" } } },
      });
      boards = [board];
    }
    return NextResponse.json({ boards });
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
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const board = await prisma.streamBoard.create({
      data: { workspaceId, name: name.trim() },
      include: { columns: true },
    });
    return NextResponse.json({ board });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
