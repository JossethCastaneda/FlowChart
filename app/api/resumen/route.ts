import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

// GET /api/resumen — aggregate KPIs for the active workspace
export const GET = withAuth(async (_req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
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

  const [workspace, projects, members, integrations, taskCounts, briefCounts] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true, plan: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true, alias: true, status: true, channels: { select: { id: true, name: true, type: true, config: true } } },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.integration.count({
      where: { workspaceId, connected: true },
    }),
    // O(1) DB counts for tasks (group by status)
    prisma.task.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: true,
    }),
    // O(1) DB counts for briefs (group by status)
    prisma.brief.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: true,
    })
  ]);

  // Aggregate results into simpler objects
  const tasks = { total: 0, backlog: 0, wip: 0, done: 0 };
  for (const group of taskCounts) {
    tasks.total += group._count;
    if (group.status === "Backlog") tasks.backlog += group._count;
    else if (group.status === "WIP") tasks.wip += group._count;
    else if (group.status === "Done") tasks.done += group._count;
  }

  const briefs = { total: 0, draft: 0, review: 0, approved: 0 };
  for (const group of briefCounts) {
    briefs.total += group._count;
    if (group.status === "Draft") briefs.draft += group._count;
    else if (group.status === "Review") briefs.review += group._count;
    else if (group.status === "Approved") briefs.approved += group._count;
  }

  return NextResponse.json({
    data: {
      workspace,
      projects: {
        total: projects.length,
        active: projects.filter((p) => p.status === "EN VUELO").length,
      },
      projectsList: projects,
      members: { total: members },
      tasks,
      briefs,
      integrations: { connected: integrations },
    },
  });
});
