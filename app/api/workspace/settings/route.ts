import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";
import { parseWorkflow, DEFAULT_WORKFLOW } from "@/lib/workflow-config";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET  /api/workspace/settings — workflow config (areas, leads, SLA). Any member.
 * PUT  /api/workspace/settings — replace areas + requireLeadReview. OWNER/ADMIN.
 *
 * Degrades gracefully to defaults if the WorkspaceSettings table isn't migrated
 * yet, so the rest of the app keeps working.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  try {
    const row = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
    const cfg = row ? parseWorkflow({ areas: row.areas, requireLeadReview: row.requireLeadReview }) : DEFAULT_WORKFLOW;
    return NextResponse.json({ ...cfg, configured: !!row });
  } catch (err) {
    console.warn("[WORKSPACE/SETTINGS] read failed (table not migrated?):", err);
    return NextResponse.json({ ...DEFAULT_WORKFLOW, configured: false, needsMigration: true });
  }
}

export async function PUT(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: jwt.sub, workspaceId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Solo OWNER/ADMIN pueden editar áreas y flujos." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const cfg = parseWorkflow(body);

  try {
    await prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: { areas: cfg.areas as unknown as any, requireLeadReview: cfg.requireLeadReview },
      create: { workspaceId, areas: cfg.areas as unknown as any, requireLeadReview: cfg.requireLeadReview },
    });
    return NextResponse.json({ success: true, ...cfg });
  } catch (err: any) {
    console.error("[WORKSPACE/SETTINGS] write failed:", err);
    const tableMissing = err?.code === "P2021" || /does not exist/i.test(String(err?.message || ""));
    return NextResponse.json(
      {
        error: tableMissing
          ? "Falta la tabla en la base de datos. Aplica el schema (npm run db:push) y reintenta."
          : `No se pudo guardar${err?.message ? `: ${err.message}` : "."}`,
      },
      { status: 500 }
    );
  }
}
