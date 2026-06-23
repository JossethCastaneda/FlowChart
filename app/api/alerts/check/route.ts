import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/get-base-url";
import { decryptToken } from "@/lib/encryption";
import { verifyCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

// Vercel Cron: called at 9:00, 12:00, 16:00, 18:00 CST (15:00, 18:00, 22:00, 00:00 UTC)
// Authorization via CRON_SECRET (Bearer header — Vercel standard)
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // FIX: use env var, never hardcode a version
  const META_VERSION = process.env.META_API_VERSION || "v25.0";

  try {
    // Get all active projects with channels + workspace members
    // FIX: projects don't have members directly — fetch via workspace
    const projects = await prisma.project.findMany({
      where: { status: "Activo" },
      include: {
        channels: true,
        workspace: {
          select: {
            name: true,
            members: {
              include: { user: { select: { id: true, email: true, name: true } } },
            },
          },
        },
      },
    });

    const results: any[] = [];

    for (const project of projects) {
      try {
        const metaChannel = project.channels.find((c: any) => {
          const cfg = c.config as any;
          return cfg?.platformId === "meta" || c.type === "FACEBOOK";
        });
        if (!metaChannel) continue;
        const cfg = (metaChannel.config as any) || {};
        if (!cfg.adAccounts?.length) continue;

        const alertsEnabled = (project as any).alertsEnabled !== false;
        if (!alertsEnabled) continue;

        // FIX: token comes from the Integration table via workspace, not from cfg.accessToken
        // Get Meta token from workspace Integration table
        const integration = await prisma.integration.findUnique({
          where: {
            workspaceId_provider_userId: {
              workspaceId: project.workspaceId,
              provider: "meta",
              userId: "workspace",
            },
          },
        });

        // Decrypt the stored token — credentials are encrypted at rest with AES-256-GCM.
        // Without decryptToken() the raw "enc:..." string would be sent to Meta, which
        // causes a silent auth failure on every Graph API call.
        const rawToken = (integration?.credentials as any)?.accessToken;
        if (!rawToken) continue;
        const token = decryptToken(rawToken);
        if (!token || token.startsWith("enc:")) {
          logger.error(`[ALERTS] Failed to decrypt token for workspace ${project.workspaceId}`);
          continue;
        }

        // FIX: use Bearer Authorization header — NEVER put token in URL
        const adAccountId = cfg.adAccounts[0].startsWith("act_")
          ? cfg.adAccounts[0]
          : `act_${cfg.adAccounts[0]}`;

        const insightsUrl = `https://graph.facebook.com/${META_VERSION}/${adAccountId}/insights?fields=spend,impressions,clicks,reach,actions,action_values&date_preset=this_month`;

        let insightsData: any = null;
        try {
          const res = await fetch(insightsUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json();
          if (!res.ok) {
            logger.error(`[ALERTS] Meta API error for ${project.name}:`, json?.error?.message);
            continue;
          }
          insightsData = json.data?.[0];
        } catch (e) {
          logger.error(`[ALERTS] Failed to fetch insights for ${project.name}:`, e);
          continue;
        }

        if (!insightsData) continue;

        // Parse metrics
        const spend = parseFloat(insightsData.spend || "0");
        const impressions = parseInt(insightsData.impressions || "0", 10);
        const clicks = parseInt(insightsData.clicks || "0", 10);
        const reach = parseInt(insightsData.reach || "0", 10);

        const RESULT_TYPES = ["lead", "purchase", "complete_registration", "offsite_conversion", "onsite_conversion", "messaging_conversation_started_7d"];
        const findResult = (actions: any[]) => {
          if (!actions?.length) return null;
          for (const t of RESULT_TYPES) {
            const f = actions.find((a: any) => a.action_type.includes(t));
            if (f) return f;
          }
          return actions[0];
        };

        const ra = findResult(insightsData.actions);
        const totalResults = ra ? parseInt(ra.value, 10) : 0;

        // Calculate health metrics
        const cpr = totalResults > 0 ? spend / totalResults : 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const frequency = impressions > 0 && reach > 0 ? impressions / reach : 0;
        const conversionRate = clicks > 0 ? (totalResults / clicks) * 100 : 0;

        const parseBudget = (s: string) => parseFloat((s || "0").replace(/[^0-9.]/g, "")) || 0;
        const budgetNum = parseBudget(cfg.budget || "0");
        const cprTarget = parseBudget(cfg.cpr || "0");

        // Calculate days
        const now = new Date();
        const daysElapsed = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        // Budget pacing
        const period = (cfg.period || "Mensual").toLowerCase();
        let dailyBudget = budgetNum / daysInMonth;
        if (period === "semanal" || period === "semana") dailyBudget = budgetNum / 7;
        else if (period === "diario" || period === "dia" || period === "día") dailyBudget = budgetNum;
        else if (period === "anual" || period === "año") dailyBudget = budgetNum / 365;

        const idealSpend = dailyBudget * daysElapsed;
        const spendPaceRatio = idealSpend > 0 ? spend / idealSpend : 1;

        // Health scores
        const cprScore = cprTarget > 0 ? Math.max(0, Math.min(100, cpr <= cprTarget ? 100 : Math.round(100 - ((cpr / cprTarget - 1) * 333)))) : 50;
        const freqScore = Math.max(0, Math.min(100, Math.round(frequency <= 2 ? 100 : frequency <= 4 ? 100 - ((frequency - 2) * 25) : Math.max(0, 50 - ((frequency - 4) * 25)))));
        const ctrScore = Math.max(0, Math.min(100, Math.round(ctr >= 2 ? 100 : ctr >= 1 ? 60 + (ctr - 1) * 40 : ctr >= 0.5 ? 20 + (ctr - 0.5) * 80 : ctr * 40)));
        const convScore = Math.max(0, Math.min(100, Math.round(conversionRate >= 8 ? 100 : conversionRate >= 4 ? 60 + (conversionRate - 4) * 10 : conversionRate >= 1 ? 20 + (conversionRate - 1) * 13.33 : conversionRate * 20)));
        const paceScore = Math.max(0, Math.min(100, Math.round(Math.abs(spendPaceRatio - 1) <= 0.1 ? 100 : Math.abs(spendPaceRatio - 1) <= 0.25 ? 50 + (0.25 - Math.abs(spendPaceRatio - 1)) / 0.15 * 50 : Math.max(0, 100 - Math.abs(spendPaceRatio - 1) * 200))));

        // Trend component: 50 neutral (no time-series in cron)
        const healthScore = Math.round(cprScore * 0.25 + freqScore * 0.20 + ctrScore * 0.15 + convScore * 0.15 + paceScore * 0.15 + 50 * 0.10);

        // Generate alerts
        const alerts: { severity: string; title: string; message: string; type: string }[] = [];

        if (cprScore < 50 && cprTarget > 0) {
          alerts.push({
            type: "cpr_spike",
            severity: "critical",
            title: "CPR por encima de meta",
            message: `CPR actual: $${cpr.toFixed(2)} vs Meta: $${cprTarget.toFixed(2)} (${((cpr / cprTarget - 1) * 100).toFixed(0)}% sobre meta)`,
          });
        }

        if (freqScore < 50) {
          alerts.push({
            type: "frequency_high",
            severity: "warning",
            title: "Frecuencia elevada",
            message: `Frecuencia actual: ${frequency.toFixed(2)}. Riesgo de fatiga publicitaria. Rota creativos o amplía audiencias.`,
          });
        }

        if (ctrScore < 40) {
          alerts.push({
            type: "ctr_drop",
            severity: "warning",
            title: "CTR bajo",
            message: `CTR actual: ${ctr.toFixed(2)}%. Benchmark mínimo: 0.8%. Renueva creativos con nuevos ángulos.`,
          });
        }

        if (paceScore < 40) {
          alerts.push({
            type: "budget_pace",
            severity: spendPaceRatio > 1.25 ? "critical" : "warning",
            title: spendPaceRatio > 1 ? "Presupuesto sobre-gastado" : "Presupuesto sub-gastado",
            message: `Ritmo de gasto: ${(spendPaceRatio * 100).toFixed(0)}% del ideal. Gastado: $${spend.toFixed(0)} / Ideal: $${idealSpend.toFixed(0)}`,
          });
        }

        if (healthScore < 40) {
          alerts.push({
            type: "health_score",
            severity: "critical",
            title: "Health Score crítico",
            message: `Score general: ${healthScore}/100. Múltiples indicadores fuera de rango. Requiere intervención inmediata.`,
          });
        }

        if (alerts.length === 0) continue;

        // Save alerts to DB — isolated per alert so one failure doesn't block others
        for (const alert of alerts) {
          try {
            await prisma.projectAlert.create({
              data: {
                projectId: project.id,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: alert.message,
              },
            });
          } catch (dbErr) {
            logger.error("[ALERTS] Failed to save alert:", dbErr);
          }
        }

        // FIX: members come from workspace.members, not project.members
        const workspaceMembers = project.workspace.members;
        const emails = workspaceMembers
          .map((m: any) => m.user.email)
          .filter((e: any): e is string => !!e);

        const customEmails = (project as any).alertEmails || [];
        const allEmails = [...new Set([...emails, ...customEmails])].filter(Boolean);

        // Send email — isolated so failure doesn't abort cron
        if (allEmails.length > 0) {
          const baseUrl = getBaseUrl();
          try {
            await sendAlertEmail({
              to: allEmails,
              projectName: project.name,
              healthScore,
              alerts,
              dashboardUrl: `${baseUrl}/dashboard/proyectos/${project.id}`,
            });
          } catch (emailErr) {
            logger.error("[ALERTS] Failed to send email:", emailErr);
          }
        }

        // Create in-app notifications — isolated per member
        for (const member of workspaceMembers) {
          try {
            await prisma.notification.create({
              data: {
                userId: member.userId,
                type: "health_alert",
                title: `${project.name}: Health Score ${healthScore}`,
                message: alerts.map((a) => a.title).join(", "),
                link: `/dashboard/proyectos/${project.id}`,
              },
            });
          } catch (notifErr) {
            logger.error("[ALERTS] Failed to create notification:", notifErr);
          }
        }

        results.push({
          project: project.name,
          healthScore,
          alertCount: alerts.length,
          emailsSent: allEmails.length,
        });
      } catch (projectErr: any) {
        // Isolate per-project errors — don't abort the entire cron
        logger.error(`[ALERTS] Error processing project ${project.name}:`, projectErr);
        results.push({ project: project.name, error: projectErr?.message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projectsChecked: projects.length,
      alertsGenerated: results,
    });
  } catch (err: any) {
    logger.error("[ALERTS] Cron error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
