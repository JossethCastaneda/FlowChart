import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/resumen — aggregate KPIs for the active workspace
export const GET = withWorkspace(async (_req, ctx) => {
  const { workspaceId } = ctx;

  const [workspace, projects, members, integrations, taskCounts, briefCounts] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true, plan: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        alias: true,
        status: true,
        channels: { select: { id: true, name: true, type: true, config: true } },
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.integration.count({ where: { workspaceId, connected: true } }),
    // O(1) counts via groupBy
    prisma.task.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: true,
    }),
    prisma.brief.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: true,
    }),
  ]);

  // Aggregate task counts
  const tasks = { total: 0, backlog: 0, wip: 0, review: 0, done: 0 };
  for (const group of taskCounts) {
    tasks.total += group._count;
    if (group.status === "Backlog") tasks.backlog += group._count;
    else if (group.status === "WIP") tasks.wip += group._count;
    else if (group.status === "Review") tasks.review += group._count;
    else if (group.status === "Done") tasks.done += group._count;
  }

  // Aggregate brief counts
  const briefs = { total: 0, draft: 0, review: 0, approved: 0 };
  for (const group of briefCounts) {
    briefs.total += group._count;
    if (group.status === "Draft") briefs.draft += group._count;
    else if (group.status === "Review") briefs.review += group._count;
    else if (group.status === "Approved") briefs.approved += group._count;
  }

  // Active projects: status is "Activo" (the canonical active value in schema)
  const activeProjects = projects.filter((p) => p.status === "Activo").length;

  return apiSuccess({
    workspace,
    projects: {
      total: projects.length,
      active: activeProjects,
    },
    projectsList: projects,
    members: { total: members },
    tasks,
    briefs,
    integrations: { connected: integrations },
  });
});
