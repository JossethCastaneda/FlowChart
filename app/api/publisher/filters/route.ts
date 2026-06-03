import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

/**
 * GET /api/publisher/filters
 * Returns filter options derived from workspace projects + connected Meta pages.
 *
 * Response:
 * {
 *   clients:   [{ value: "Acme Corp", count: 3 }, ...],
 *   verticals: [{ value: "E-commerce", count: 2 }, ...],
 *   channels:  [{ id: "page_123", name: "Mi Página", type: "fanpage", picture: "..." }, ...]
 * }
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  // 1. Get all projects for this workspace
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: {
      client: true,
      vertical: true,
      fanpage: true,
      instagram: true,
    },
  });

  // 2. Aggregate clients (with count)
  const clientMap = new Map<string, number>();
  for (const p of projects) {
    const c = p.client?.trim();
    if (c) clientMap.set(c, (clientMap.get(c) || 0) + 1);
  }
  const clients = Array.from(clientMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Aggregate verticals (with count)
  const verticalMap = new Map<string, number>();
  for (const p of projects) {
    const v = p.vertical?.trim();
    if (v) verticalMap.set(v, (verticalMap.get(v) || 0) + 1);
  }
  const verticals = Array.from(verticalMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  // 4. Get connected Meta pages from Integration table
  const channels: { id: string; name: string; type: "fanpage" | "instagram"; picture: string | null }[] = [];
  const seenIds = new Set<string>();

  try {
    const integrations = await prisma.integration.findMany({
      where: {
        workspaceId,
        provider: { startsWith: "meta" },
        connected: true,
      },
      select: { credentials: true },
    });

    for (const integration of integrations) {
      const creds = integration.credentials as any;
      const pages = creds?.pages || [];
      for (const page of pages) {
        if (!seenIds.has(page.id)) {
          seenIds.add(page.id);
          channels.push({
            id: page.id,
            name: page.name || "Página sin nombre",
            type: "fanpage",
            picture: page.picture || null,
          });
        }
      }
    }
  } catch (e) {
    console.warn("[FILTERS] Failed to fetch channels from integrations:", e);
  }

  return NextResponse.json({ clients, verticals, channels });
}
