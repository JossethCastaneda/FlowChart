import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = env.RESEND_FROM_EMAIL || env.EMAIL_FROM || "SODARE <onboarding@resend.dev>";

interface AlertEmailParams {
  to: string[];
  projectName: string;
  healthScore: number;
  alerts: { severity: string; title: string; message: string }[];
  dashboardUrl: string;
}

export async function sendAlertEmail({
  to,
  projectName,
  healthScore,
  alerts,
  dashboardUrl,
}: AlertEmailParams) {
  if (!resend || to.length === 0) {
    logger.info("[EMAIL] Resend not configured or no recipients, skipping email");
    return null;
  }

  const healthColor = healthScore >= 80 ? "#00c875" : healthScore >= 60 ? "#fdab3d" : "#e2445c";
  const healthLabel = healthScore >= 80 ? "Excelente" : healthScore >= 60 ? "Buena" : healthScore >= 40 ? "En Riesgo" : "Crítica";

  const alertRows = alerts
    .map(
      (a) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${
              a.severity === "critical" ? "#e2445c" : a.severity === "warning" ? "#fdab3d" : "#00c875"
            };margin-right:8px;vertical-align:middle;"></span>
            <strong style="color:white;font-size:13px;">${a.title}</strong>
            <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">${a.message}</p>
          </td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h1 style="color:white;font-size:18px;font-weight:700;margin:0 0 4px;">SODARE</h1>
      <p style="color:#94a3b8;font-size:12px;margin:0;">Alerta de Proyecto</p>
    </div>

    <!-- Project + Score -->
    <div style="text-align:center;padding:24px 0;">
      <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Proyecto</p>
      <h2 style="color:white;font-size:20px;font-weight:700;margin:0 0 16px;">${projectName}</h2>
      <div style="display:inline-block;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 32px;">
        <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Health Score</p>
        <p style="font-size:36px;font-weight:800;color:${healthColor};margin:0;">${healthScore}</p>
        <p style="font-size:11px;color:${healthColor};margin:4px 0 0;font-weight:600;">${healthLabel}</p>
      </div>
    </div>

    <!-- Alerts -->
    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <p style="color:white;font-size:12px;font-weight:600;margin:0;text-transform:uppercase;letter-spacing:0.05em;">Alertas Detectadas (${alerts.length})</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">${alertRows}</table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:16px 0;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#00d4ff;color:#0a0f1e;font-size:13px;font-weight:700;padding:10px 24px;border-radius:6px;text-decoration:none;">Ver Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid rgba(255,255,255,0.04);">
      <p style="color:#64748b;font-size:10px;margin:0;">SODARE Alert System · ${new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[SODARE] ${projectName} - Health Score: ${healthScore} (${healthLabel})`,
      html,
    });
    logger.info("[EMAIL] Sent alert email", { projectName, healthScore, recipients: to.length });
    return result;
  } catch (err) {
    logger.error("[EMAIL] Failed to send alert email", { projectName, err });
    return null;
  }
}

export async function sendInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}) {
  if (!resend || !to) {
    logger.info("[EMAIL] Resend not configured or no recipients, skipping invite email");
    return null;
  }

  const { getInviteEmailHtml } = await import("@/lib/email-templates");
  const html = getInviteEmailHtml({ inviterName, workspaceName, role, inviteUrl });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Invitación a ${workspaceName} — SODARE`,
      html,
    });
    logger.info("[EMAIL] Sent invite email", { to, workspaceName });
    return result;
  } catch (err) {
    logger.error("[EMAIL] Failed to send invite email", { to, workspaceName, err });
    return null;
  }
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
}: {
  to: string;
  userName: string;
  resetUrl: string;
}) {
  if (!resend || !to) {
    logger.info("[EMAIL] Resend not configured or no recipients, skipping password reset email");
    return null;
  }

  const { getPasswordResetEmailHtml } = await import("@/lib/email-templates");
  const html = getPasswordResetEmailHtml({ userName, resetUrl });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Recuperar contraseña — SODARE",
      html,
    });
    logger.info("[EMAIL] Sent password reset email", { to });
    return result;
  } catch (err) {
    logger.error("[EMAIL] Failed to send password reset email", { to, err });
    return null;
  }
}

export async function sendWelcomeEmail({
  to,
  userName,
  dashboardUrl,
}: {
  to: string;
  userName: string;
  dashboardUrl: string;
}) {
  if (!resend || !to) {
    logger.info("[EMAIL] Resend not configured or no recipients, skipping welcome email");
    return null;
  }

  const { getWelcomeEmailHtml } = await import("@/lib/email-templates");
  const html = getWelcomeEmailHtml({ userName, dashboardUrl });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Bienvenido a SODARE",
      html,
    });
    logger.info("[EMAIL] Sent welcome email", { to });
    return result;
  } catch (err) {
    logger.error("[EMAIL] Failed to send welcome email", { to, err });
    return null;
  }
}
