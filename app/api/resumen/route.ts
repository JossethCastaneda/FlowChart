import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

// GET /api/resumen — aggregate KPIs for the active workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({
        data: {
          workspace: null,
          projects: { total: 0, active: 0 },
          projectsList: [],
          members: { total: 0 },
          tasks: { total: 0, backlog: 0, wip: 0, done: 0 },
          briefs: { total: 0, draft: 0, review: 0, approved: 0 },
          integrations: { connected: 0 },
        },
      });
    }

    const [workspace, projects, members, tasks, briefs, integrations] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, slug: true, plan: true, createdAt: true },
      }),
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true, alias: true, status: true, channels: { select: { id: true, name: true, type: true, config: true } } },
      }),
      prisma.workspaceMember.count({ where: { workspaceId } }),
      prisma.task.findMany({
        where: { workspaceId },
        select: { status: true },
      }),
      prisma.brief.findMany({
        where: { workspaceId },
        select: { status: true },
      }),
      prisma.integration.count({
        where: { workspaceId, connected: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        workspace,
        projects: {
          total: projects.length,
          active: projects.filter((p) => p.status === "EN VUELO").length,
        },
        projectsList: projects,
        members: { total: members },
        tasks: {
          total: tasks.length,
          backlog: tasks.filter((t) => t.status === "Backlog").length,
          wip: tasks.filter((t) => t.status === "WIP").length,
          done: tasks.filter((t) => t.status === "Done").length,
        },
        briefs: {
          total: briefs.length,
          draft: briefs.filter((b) => b.status === "Draft").length,
          review: briefs.filter((b) => b.status === "Review").length,
          approved: briefs.filter((b) => b.status === "Approved").length,
        },
        integrations: { connected: integrations },
      },
    });
  } catch (err: any) {
    console.error("[RESUMEN] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
