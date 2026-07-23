/**
 * TEMPORARY PUBLIC DIAGNOSTIC — /api/diag-leads
 * Returns action_types Meta sends for project "Formulario"
 * Uses the workspace's meta_ads token directly from DB
 * 
 * ⚠️ DELETE AFTER DEBUGGING — no auth required!
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { META_API_VERSION } from "@/lib/server-auth";

export async function GET() {
  try {
    // Find the Formulario project
    const project = await prisma.project.findFirst({
      where: { alias: { contains: "Formulario" } },
      include: { channels: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Formulario project not found" });
    }

    const metaCh = project.channels.find((c) => (c.config as any)?.platformId === "meta");
    if (!metaCh) {
      return NextResponse.json({ error: "No meta channel" });
    }

    const cfg = metaCh.config as any;
    const goal = cfg.goal || "";
    const adAccounts: string[] = cfg.adAccounts || [];

    // Get workspace token
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId: project.workspaceId,
          provider: "meta_ads",
          userId: "workspace",
        },
      },
    });

    if (!integration?.credentials) {
      return NextResponse.json({ error: "No meta_ads integration" });
    }

    const creds = integration.credentials as any;
    const accessToken = decryptToken(creds.accessToken);

    if (!accessToken) {
      return NextResponse.json({ error: "Token decrypt failed" });
    }

    const results: any[] = [];

    for (const accRaw of adAccounts) {
      const accId = accRaw.startsWith("act_") ? accRaw : `act_${accRaw}`;
      const result: any = { accId, goal };

      // Daily timeSeries for this_month
      const dailyUrl = `https://graph.facebook.com/${META_API_VERSION}/${accId}/insights?` +
        `fields=spend,impressions,actions&level=account&time_increment=1&date_preset=this_month&limit=100` +
        `&access_token=${accessToken}`;

      const dailyRes = await fetch(dailyUrl);
      const dailyJson = await dailyRes.json();

      if (dailyJson.error) {
        result.daily = { error: dailyJson.error.message, code: dailyJson.error.code };
      } else {
        const days = dailyJson.data || [];
        result.days_count = days.length;

        // Collect ALL action types and their per-day values
        const actionSums: Record<string, number> = {};
        const dailyDetail: any[] = [];

        days.forEach((d: any) => {
          const dayActions: Record<string, number> = {};
          (d.actions || []).forEach((a: any) => {
            actionSums[a.action_type] = (actionSums[a.action_type] || 0) + parseFloat(a.value || "0");
            dayActions[a.action_type] = parseFloat(a.value || "0");
          });
          dailyDetail.push({
            date: d.date_start,
            spend: d.spend,
            action_types: dayActions,
          });
        });

        result.all_action_types = Object.entries(actionSums)
          .sort((a, b) => b[1] - a[1])
          .map(([type, total]) => ({ type, total }));

        result.daily_detail = dailyDetail;
      }

      results.push(result);
    }

    return NextResponse.json({
      project: project.alias,
      goal,
      workspace: project.workspaceId,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) });
  }
}
