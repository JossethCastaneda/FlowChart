import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { getTaskAssignedEmailHtml, getSLAWarningEmailHtml } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/get-base-url";
import { getWaCredentials, sendWaText } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) {
    logger.warn("[NOTIFICATIONS] RESEND_API_KEY not set — email sending disabled");
    return null;
  }
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}
const FROM_EMAIL = env.RESEND_FROM_EMAIL || env.EMAIL_FROM || "ZEFIRUS <noreply@zefirus.xyz>";
const BASE_URL = getBaseUrl();

// ─── WhatsApp helper ─────────────────────────────────────────────────────────

/**
 * Sends a WhatsApp notification to a recipient number using the workspace's
 * connected WhatsApp Business account.
 * Silently no-ops if:
 *   - The workspace has no WhatsApp integration connected
 *   - The recipient has no whatsappPhone saved
 * Fire-and-forget: does NOT throw — all errors are logged as warnings.
 */
async function sendWaNotification(
  workspaceId: string,
  recipientPhone: string,
  message: string,
): Promise<void> {
  try {
    const creds = await getWaCredentials(workspaceId);
    if (!creds) return; // WhatsApp not connected for this workspace

    // Sanitize phone: remove +, spaces, dashes — must be digits only
    const phone = recipientPhone.replace(/\D/g, "");
    if (!phone || phone.length < 7) return;

    await sendWaText(creds, { to: phone, text: message });
    logger.info("WA task notification sent", { workspaceId, to: phone });
  } catch (err) {
    logger.warn("WA task notification failed (non-critical)", { workspaceId, error: err });
  }
}

// ─── Core notification ────────────────────────────────────────────────────────

/**
 * Create an in-app notification + optionally send email + WhatsApp
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  sendEmail = false,
  emailSubject,
  emailHtml,
  sendWhatsapp = false,
  whatsappPhone,
  waText,
  workspaceId,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailHtml?: string;
  sendWhatsapp?: boolean;
  whatsappPhone?: string;
  waText?: string;  // Custom WA message (overrides default title+message)
  workspaceId?: string;
}) {
  // 1. Create in-app notification
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link },
  });

  // 2. Send email if requested
  if (sendEmail && emailHtml) {
    try {
      const resendClient = getResend();
      if (resendClient) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (user?.email) {
          await resendClient.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: emailSubject || `ZEFIRUS — ${title}`,
            html: emailHtml,
          });
        }
      }
    } catch (err) {
      logger.error("[NOTIFICATIONS] Email error", { error: err });
    }
  }

  // 3. Send WhatsApp if requested and workspace is configured
  // waText is the rich formatted WA message; fallback to title+message
  if (sendWhatsapp && whatsappPhone && workspaceId) {
    const text = waText || `${title}\n${message}`;
    await sendWaNotification(workspaceId, whatsappPhone, text);
  }

  return notification;
}

// ─── Task notifications ───────────────────────────────────────────────────────

/**
 * Notify when a task is assigned to someone.
 * Sends: in-app + email + WhatsApp (if the assignee has a whatsappPhone saved)
 */
export async function notifyTaskAssigned({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  taskId,
  taskTitle,
  assigneeName,
  assigneeUserId,
  assignerName,
  assignerUserId,
  priority,
  dueDate,
  workspaceId,
}: {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  assigneeUserId?: string;
  assignerName: string;
  assignerUserId: string;
  priority: string;
  dueDate: string | null;
  workspaceId: string;
}) {
  // Prefer direct userId lookup; fall back to name search for backward compat
  let user: { id: string; email: string | null; whatsappPhone: string | null } | null = null;
  if (assigneeUserId) {
    user = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, email: true, whatsappPhone: true },
    });
  }
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: assigneeName },
          { email: { startsWith: assigneeName } },
        ],
      },
      select: { id: true, email: true, whatsappPhone: true },
    });
  }

  if (!user || user.id === assignerUserId) return; // Don't notify yourself

  const taskUrl = `${BASE_URL}/dashboard/ops`;
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const waMessage = [
    ` *Nueva tarea asignada* — ZEFIRUS`,
    ``,
    `*${taskTitle}*`,
    `Prioridad: ${priority}${dueDateFormatted ? `\nVence: ${dueDateFormatted}` : ""}`,
    `Asignada por: ${assignerName}`,
    ``,
    `Ver tarea: ${taskUrl}`,
  ].join("\n");

  await createNotification({
    userId: user.id,
    type: "task_assigned",
    title: "Nueva tarea asignada",
    message: `${assignerName} te asigno: "${taskTitle}"`,
    link: "/dashboard/ops",
    sendEmail: true,
    emailSubject: `ZEFIRUS — Nueva tarea: ${taskTitle}`,
    emailHtml: getTaskAssignedEmailHtml({
      assigneeName,
      taskTitle,
      assignerName,
      priority,
      dueDate: dueDateFormatted,
      taskUrl,
    }),
    sendWhatsapp: !!user.whatsappPhone,
    whatsappPhone: user.whatsappPhone ?? undefined,
    waText: waMessage,
    workspaceId,
  });
}

/**
 * Notify when a task status changes.
 * Sends: in-app + WhatsApp (if assignee has whatsappPhone)
 */
export async function notifyTaskStatusChanged({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  taskId,
  taskTitle,
  assigneeName,
  assigneeUserId,
  updaterName,
  updaterUserId,
  newStatus,
  workspaceId,
}: {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  assigneeUserId?: string | null;
  updaterName: string;
  updaterUserId: string;
  newStatus: string;
  workspaceId: string;
}) {
  let user: { id: string; email: string | null; whatsappPhone: string | null } | null = null;
  if (assigneeUserId) {
    user = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, email: true, whatsappPhone: true },
    });
  }
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: assigneeName },
          { email: { startsWith: assigneeName } },
        ],
      },
      select: { id: true, email: true, whatsappPhone: true },
    });
  }

  if (!user || user.id === updaterUserId) return; // Don't notify yourself

  const statusEmoji: Record<string, string> = {
    WIP: "",
    Review: "",
    Done: "",
    Backlog: "",
  };
  const emoji = statusEmoji[newStatus] ?? "";

  const waMessage = [
    `${emoji} *Tarea actualizada* — ZEFIRUS`,
    ``,
    `*${taskTitle}*`,
    `Estado: ${newStatus}`,
    `Actualizado por: ${updaterName}`,
    ``,
    `Ver: ${BASE_URL}/dashboard/ops`,
  ].join("\n");

  await createNotification({
    userId: user.id,
    type: "status_changed",
    title: "Estado de tarea actualizado",
    message: `${updaterName} movió la tarea "${taskTitle}" a ${newStatus}`,
    link: "/dashboard/ops",
    sendEmail: false,
    sendWhatsapp: !!user.whatsappPhone,
    whatsappPhone: user.whatsappPhone ?? undefined,
    waText: waMessage,
    workspaceId,
  });
}

/**
 * Notify when a task priority changes.
 * Sends: in-app + WhatsApp (if assignee has whatsappPhone)
 */
export async function notifyTaskPriorityChanged({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  taskId,
  taskTitle,
  assigneeName,
  assigneeUserId,
  updaterName,
  updaterUserId,
  newPriority,
  oldPriority,
  workspaceId,
}: {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  assigneeUserId?: string | null;
  updaterName: string;
  updaterUserId: string;
  newPriority: string;
  oldPriority: string;
  workspaceId: string;
}) {
  let user: { id: string; whatsappPhone: string | null } | null = null;
  if (assigneeUserId) {
    user = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, whatsappPhone: true },
    });
  }
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: assigneeName },
          { email: { startsWith: assigneeName } },
        ],
      },
      select: { id: true, whatsappPhone: true },
    });
  }

  if (!user || user.id === updaterUserId) return;

  const priorityEmoji: Record<string, string> = { P0: "", P1: "", P2: "", P3: "" };
  const waMessage = [
    `${priorityEmoji[newPriority] ?? ""} *Prioridad actualizada* — ZEFIRUS`,
    ``,
    `*${taskTitle}*`,
    `Prioridad: ${oldPriority} → ${newPriority}`,
    `Actualizado por: ${updaterName}`,
    ``,
    `Ver: ${BASE_URL}/dashboard/ops`,
  ].join("\n");

  await createNotification({
    userId: user.id,
    type: "priority_changed",
    title: "Prioridad de tarea actualizada",
    message: `${updaterName} cambió la prioridad de "${taskTitle}" a ${newPriority}`,
    link: "/dashboard/ops",
    sendWhatsapp: !!user.whatsappPhone,
    whatsappPhone: user.whatsappPhone ?? undefined,
    waText: waMessage,
    workspaceId,
  });
}

/**
 * Notify the task assignee when someone adds a comment to their task.
 * Sends: in-app + WhatsApp (if assignee has whatsappPhone)
 */
export async function notifyTaskCommented({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  taskId,
  taskTitle,
  assigneeName,
  assigneeUserId,
  commenterName,
  commenterUserId,
  commentPreview,
  workspaceId,
}: {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  assigneeUserId?: string | null;
  commenterName: string;
  commenterUserId: string;
  commentPreview: string;
  workspaceId: string;
}) {
  let user: { id: string; whatsappPhone: string | null } | null = null;

  if (assigneeUserId) {
    user = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, whatsappPhone: true },
    });
  }
  if (!user && assigneeName) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: assigneeName },
          { email: { startsWith: assigneeName } },
        ],
      },
      select: { id: true, whatsappPhone: true },
    });
  }

  if (!user || user.id === commenterUserId) return; // Don't notify yourself

  const preview = commentPreview.length > 80 ? `${commentPreview.slice(0, 80)}…` : commentPreview;

  const waMessage = [
    ` *Nuevo comentario* — ZEFIRUS`,
    ``,
    `*${taskTitle}*`,
    `${commenterName}: "${preview}"`,
    ``,
    `Ver tarea: ${BASE_URL}/dashboard/ops`,
  ].join("\n");

  await createNotification({
    userId: user.id,
    type: "task_comment",
    title: "Nuevo comentario en tarea",
    message: `${commenterName} comentó en "${taskTitle}": ${preview}`,
    link: "/dashboard/ops",
    sendEmail: false,
    sendWhatsapp: !!user.whatsappPhone,
    whatsappPhone: user.whatsappPhone ?? undefined,
    waText: waMessage,
    workspaceId,
  });
}

// ─── SLA warnings ─────────────────────────────────────────────────────────────

/**
 * Check SLA and send warnings for tasks due within 24h.
 * Called by cron or on page load.
 */
export async function checkSLAWarnings(workspaceId: string) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find tasks due within 24h or already overdue, that are not Done
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      status: { not: "Done" },
      dueDate: { not: null, lte: in24h },
      parentId: null, // Only parent tasks
    },
  });

  const taskUrl = `${BASE_URL}/dashboard/ops`;

  for (const task of tasks) {
    if (!task.dueDate || (!task.assigneeId && !task.assignee)) continue;

    const hoursLeft = Math.round((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const type = hoursLeft <= 0 ? "sla_expired" : "sla_warning";

    // SEGURIDAD (aislamiento multi-tenant): resolver el asignado SOLO entre miembros de
    // ESTE workspace. Preferir assigneeId (userId robusto); caer a nombre/email únicamente
    // dentro del workspace. La búsqueda global previa (por nombre/email en TODA la DB)
    // filtraba notificaciones de tareas a usuarios homónimos de otros workspaces.
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: task.assigneeId
          ? { id: task.assigneeId }
          : { OR: [{ name: task.assignee! }, { email: { startsWith: task.assignee! } }] },
      },
      select: { user: { select: { id: true, whatsappPhone: true } } },
    });
    const user = member?.user;
    if (!user) continue;

    // Check if we already sent a notification for this task today
    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: { in: ["sla_warning", "sla_expired"] },
        message: { contains: task.id },
        createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) }, // Within last 12h
      },
    });
    if (existing) continue;

    const dueDateFormatted = task.dueDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
    const slaTitle = hoursLeft <= 0 ? "SLA Vencido" : "SLA por vencer";

    await createNotification({
      userId: user.id,
      type,
      title: slaTitle,
      message: `${task.title} [${task.id}]`,
      link: "/dashboard/ops",
      sendEmail: true,
      emailSubject: `ZEFIRUS — ${hoursLeft <= 0 ? "SLA VENCIDO" : "SLA por vencer"}: ${task.title}`,
      emailHtml: getSLAWarningEmailHtml({
        userName: task.assignee ?? "Responsable",
        taskTitle: task.title,
        hoursLeft,
        dueDate: dueDateFormatted,
        taskUrl,
      }),
      sendWhatsapp: !!user.whatsappPhone,
      whatsappPhone: user.whatsappPhone ?? undefined,
      workspaceId,
    });
  }
}
