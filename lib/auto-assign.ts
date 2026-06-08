import prisma from "@/lib/prisma";
import { parseWorkflow, type Area } from "@/lib/workflow-config";

/**
 * Auto-assign: pick the best available member in an area based on workload.
 *
 * Algorithm:
 * 1. Get area's memberIds from WorkspaceSettings
 * 2. Filter by activityStatus: only "disponible" and "ocupado" (exclude "ausente"/"offline")
 * 3. Count open tasks per member (status ≠ "Done")
 * 4. Pick member with fewest open tasks
 * 5. Tiebreak: "disponible" > "ocupado" > older lastActiveAt
 * 6. If nobody available → return null (stays in queue)
 *
 * Returns { userId, name } of the picked member, or null.
 */
export async function pickAssignee(
  areaId: string,
  workspaceId: string
): Promise<{ userId: string; name: string } | null> {
  // 1. Load workflow config to get area memberIds
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });
  if (!settings) return null;

  const config = parseWorkflow(settings);
  const area = config.areas.find((a: Area) => a.id === areaId);
  if (!area || area.memberIds.length === 0) return null;

  // 2. Load workspace members with activity status (only area members)
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: { in: area.memberIds },
      activityStatus: { in: ["disponible", "ocupado"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (members.length === 0) return null;

  // 3. Count open tasks per member (assignee is stored as name)
  const memberNames = members.map(
    (m) => m.user.name || m.user.email?.split("@")[0] || ""
  );
  const openTasks = await prisma.task.groupBy({
    by: ["assignee"],
    where: {
      workspaceId,
      assignee: { in: memberNames.filter(Boolean) },
      status: { not: "Done" },
    },
    _count: { id: true },
  });

  const taskCountMap: Record<string, number> = {};
  openTasks.forEach((g) => {
    if (g.assignee) taskCountMap[g.assignee] = g._count.id;
  });

  // 4. Score each member: fewer tasks = better, "disponible" > "ocupado"
  const scored = members.map((m) => {
    const name = m.user.name || m.user.email?.split("@")[0] || "";
    const openCount = taskCountMap[name] || 0;
    const statusPriority = m.activityStatus === "disponible" ? 0 : 1;
    return {
      userId: m.userId,
      name,
      openCount,
      statusPriority,
      lastActiveAt: m.lastActiveAt?.getTime() || 0,
    };
  });

  // 5. Sort: fewer tasks → better status → older lastActive (round-robin)
  scored.sort((a, b) => {
    if (a.openCount !== b.openCount) return a.openCount - b.openCount;
    if (a.statusPriority !== b.statusPriority)
      return a.statusPriority - b.statusPriority;
    return a.lastActiveAt - b.lastActiveAt;
  });

  const pick = scored[0];
  if (!pick || !pick.name) return null;

  return { userId: pick.userId, name: pick.name };
}
