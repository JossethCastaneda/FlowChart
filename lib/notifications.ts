import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { getTaskAssignedEmailHtml, getSLAWarningEmailHtml } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/get-base-url";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) {
    console.warn("[NOTIFICATIONS] RESEND_API_KEY not set — email sending disabled");
    return null;
  }
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}
const FROM_EMAIL = env.RESEND_FROM_EMAIL || env.EMAIL_FROM || "SODARE <noreply@sodare.xyz>";
const BASE_URL = getBaseUrl();

/**
 * Create an in-app notification + optionally send email + browser push
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
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailHtml?: string;
}) {
  // 1. Create in-app notification
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link },
  });

  // 2. Send email if requested
  if (sendEmail && emailHtml) {
    try {
      const resendClient = getResend();
      if (!resendClient) return notification;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email) {
        await resendClient.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: emailSubject || `SODARE — ${title}`,
          html: emailHtml,
        });
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] Email error:", err);
    }
  }

  return notification;
}

/**
 * Notify when a task is assigned to someone
 */
export async function notifyTaskAssigned({
  taskId,
  taskTitle,
  assigneeName,
  assigneeUserId,
  assignerName,
  assignerUserId,
  priority,
  dueDate,
}: {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  assigneeUserId?: string;
  assignerName: string;
  assignerUserId: string;
  priority: string;
  dueDate: string | null;
}) {
  // Prefer direct userId lookup; fall back to name search for backward compat
  let user: { id: string; email: string | null } | null = null;
  if (assigneeUserId) {
    user = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, email: true },
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
      select: { id: true, email: true },
    });
  }

  if (!user || user.id === assignerUserId) return; // Don't notify yourself

  const taskUrl = `${BASE_URL}/dashboard/ops`;
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  await createNotification({
    userId: user.id,
    type: "task_assigned",
    title: "Nueva tarea asignada",
    message: `${assignerName} te asigno: "${taskTitle}"`,
    link: "/dashboard/ops",
    sendEmail: true,
    emailSubject: `SODARE — Nueva tarea: ${taskTitle}`,
    emailHtml: getTaskAssignedEmailHtml({
      assigneeName,
      taskTitle,
      assignerName,
      priority,
      dueDate: dueDateFormatted,
      taskUrl,
    }),
  });
}

/**
 * Notify when a task status changes
 */
export async function notifyTaskStatusChanged({
  taskId,
  taskTitle,
  assigneeName,
  updaterName,
  updaterUserId,
  newStatus,
}: {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  updaterName: string;
  updaterUserId: string;
  newStatus: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: assigneeName },
        { email: { startsWith: assigneeName } },
      ],
    },
    select: { id: true, email: true },
  });

  if (!user || user.id === updaterUserId) return; // Don't notify yourself

  await createNotification({
    userId: user.id,
    type: "status_changed",
    title: "Estado de tarea actualizado",
    message: `${updaterName} movió la tarea "${taskTitle}" a ${newStatus}`,
    link: "/dashboard/ops",
    sendEmail: false, // In-app notification only for status changes
  });
}

/**
 * Check SLA and send warnings for tasks due within 24h
 * Called by cron or on page load
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
    if (!task.dueDate || !task.assignee) continue;

    const hoursLeft = Math.round((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const type = hoursLeft <= 0 ? "sla_expired" : "sla_warning";

    // Find user
    const user = await prisma.user.findFirst({
      where: { OR: [{ name: task.assignee }, { email: { startsWith: task.assignee } }] },
      select: { id: true },
    });
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

    await createNotification({
      userId: user.id,
      type,
      title: hoursLeft <= 0 ? "SLA Vencido" : "SLA por vencer",
      message: `${task.title} [${task.id}]`,
      link: "/dashboard/ops",
      sendEmail: true,
      emailSubject: `SODARE — ${hoursLeft <= 0 ? "SLA VENCIDO" : "SLA por vencer"}: ${task.title}`,
      emailHtml: getSLAWarningEmailHtml({
        userName: task.assignee,
        taskTitle: task.title,
        hoursLeft,
        dueDate: dueDateFormatted,
        taskUrl,
      }),
    });
  }
}
