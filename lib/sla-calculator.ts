import prisma from "@/lib/prisma";
import { parseWorkflow } from "@/lib/workflow-config";

/**
 * Calculate the automatic SLA for an area based on historical task completion times.
 *
 * Algorithm:
 * 1. Fetch the last N closed tasks (status = "Done") for the area
 * 2. For each task, compute duration = closedAt - createdAt (in hours)
 * 3. Return the median duration as the new SLA
 * 4. Optionally update the area's slaHours in WorkspaceSettings
 *
 * @returns The calculated SLA in hours, or null if not enough data
 */
export async function calculateAutoSLA(
  areaId: string,
  workspaceId: string,
  sampleSize = 20
): Promise<number | null> {
  // Fetch closed tasks for this area, ordered by most recent
  const closedTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      targetAreaId: areaId,
      status: "Done",
      closedAt: { not: null },
    },
    select: { createdAt: true, closedAt: true },
    orderBy: { closedAt: "desc" },
    take: sampleSize,
  });

  if (closedTasks.length < 3) return null; // need at least 3 tasks for meaningful SLA

  // Calculate durations in hours
  const durations = closedTasks
    .filter((t) => t.closedAt && t.createdAt)
    .map((t) => {
      const ms = new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime();
      return Math.max(1, Math.round(ms / (1000 * 60 * 60))); // min 1 hour
    })
    .sort((a, b) => a - b);

  if (durations.length === 0) return null;

  // Median
  const mid = Math.floor(durations.length / 2);
  const median =
    durations.length % 2 === 0
      ? Math.round((durations[mid - 1] + durations[mid]) / 2)
      : durations[mid];

  return Math.max(1, median);
}

/**
 * Recalculate and persist the auto SLA for a specific area.
 * Only updates if the area's slaMode is "auto".
 */
export async function updateAutoSLA(
  areaId: string,
  workspaceId: string
): Promise<number | null> {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });
  if (!settings) return null;

  const config = parseWorkflow(settings);
  const area = config.areas.find((a) => a.id === areaId);
  if (!area) return null;

  // Only auto-calculate if slaMode is "auto"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  if ((area as any).slaMode !== "auto") return null;

  const newSLA = await calculateAutoSLA(areaId, workspaceId);
  if (newSLA === null) return null;

  // Update the area's slaHours in the JSON config
  const updatedAreas = config.areas.map((a) =>
    a.id === areaId ? { ...a, slaHours: newSLA } : a
  );

  await prisma.workspaceSettings.update({
    where: { workspaceId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    data: { areas: updatedAreas as any },
  });

  return newSLA;
}
