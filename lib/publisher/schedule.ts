import { randomUUID } from "crypto";
import { start } from "workflow/api";
import { publishPostWorkflow } from "@/workflows/publish-post";
import { cancelPublishJob } from "@/lib/qstash";

const WORKFLOW_SCHEDULE_PREFIX = "wf_";
const MIN_META_SCHEDULE_MINUTES = 11;
const MAX_META_SCHEDULE_MINUTES = 75 * 24 * 60;

export function createWorkflowScheduleToken(): string {
  return `${WORKFLOW_SCHEDULE_PREFIX}${randomUUID()}`;
}

export function isWorkflowScheduleToken(token: string | null | undefined): boolean {
  return Boolean(token?.startsWith(WORKFLOW_SCHEDULE_PREFIX));
}

export async function cancelLegacyQstashSchedule(
  scheduleId: string | null | undefined
): Promise<void> {
  if (!scheduleId || isWorkflowScheduleToken(scheduleId)) return;
  await cancelPublishJob(scheduleId);
}

export function validatePublisherScheduledAt(scheduledAt: Date): string | null {
  if (Number.isNaN(scheduledAt.getTime())) {
    return "Fecha de publicación inválida";
  }

  const diffMin = (scheduledAt.getTime() - Date.now()) / (1000 * 60);
  if (diffMin < MIN_META_SCHEDULE_MINUTES) {
    return "Meta requiere programar con al menos 11 minutos de antelación";
  }

  if (diffMin > MAX_META_SCHEDULE_MINUTES) {
    return "Meta permite programar hasta un máximo de 75 días";
  }

  return null;
}

export async function startPublishWorkflowSchedule(
  postId: string,
  scheduledAt: Date
): Promise<string> {
  const scheduleToken = createWorkflowScheduleToken();
  const delaySeconds = Math.max(
    0,
    Math.floor((scheduledAt.getTime() - Date.now()) / 1000)
  );

  await start(publishPostWorkflow, [postId, delaySeconds, scheduleToken]);
  return scheduleToken;
}
