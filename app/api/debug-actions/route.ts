/**
 * DEBUG DIAGNOSTIC — /api/debug-actions?projectId=XXX
 * Shows EXACTLY what action_types Meta returns for a project's ad accounts.
 * REMOVE THIS FILE AFTER DEBUGGING
 */
import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized — connect Meta Ads first" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const preset = searchParams.get("preset") || "last_7d";

  // Find the project and its meta channel
  const project = await prisma.project.findFirst({
    where: projectId ? { id: projectId } : undefined,
    include: { channels: true },
  });

  if (!project) {
    // Return list of projects if no projectId given
    const projects = await prisma.project.findMany({
      select: { id: true, alias: true },
      orderBy: { alias: "asc" },
    });
    return NextResponse.json({ error: "No projectId given", available_projects: projects });
  }

  const metaCh = project.channels.find((c: any) => (c.config as any)?.platformId === "meta");
  if (!metaCh) {
    return NextResponse.json({ error: "Project has no Meta channel" });
  }

  const cfg = metaCh.config as any;
  const goal = cfg.goal || "";
  const adAccounts: string[] = cfg.adAccounts || [];

  const results: any[] = [];

  for (const accRaw of adAccounts) {
    const accId = accRaw.startsWith("act_") ? accRaw : `act_${accRaw}`;
    const result: any = { accId, goal, daily: null, hourly: null };

    // 1. Daily timeSeries (same as main insights route)
    const dailyUrl = `https://graph.facebook.com/${META_API_VERSION}/${accId}/insights?` +
      `fields=spend,impressions,actions&level=account&time_increment=1&date_preset=${preset}&limit=100`;
    const dailyRes = await metaFetch(dailyUrl, accessToken);
    const dailyJson = await dailyRes.json();
    if (dailyJson.error) {
      result.daily = { error: dailyJson.error.message, code: dailyJson.error.code };
    } else {
      const actionSums: Record<string, number> = {};
      (dailyJson.data || []).forEach((d: any) => {
        (d.actions || []).forEach((a: any) => {
          actionSums[a.action_type] = (actionSums[a.action_type] || 0) + parseFloat(a.value || "0");
        });
      });
      result.daily = {
        days_returned: dailyJson.data?.length || 0,
        action_types: Object.entries(actionSums)
          .sort((a, b) => b[1] - a[1])
          .map(([action_type, total]) => ({ action_type, total })),
      };
    }

    // 2. Hourly (same as heatmap breakdown)
    const hourlyUrl = `https://graph.facebook.com/${META_API_VERSION}/${accId}/insights?` +
      `fields=spend,impressions,actions&level=account&time_increment=1` +
      `&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&date_preset=${preset}&limit=200`;
    const hourlyRes = await metaFetch(hourlyUrl, accessToken);
    const hourlyJson = await hourlyRes.json();
    if (hourlyJson.error) {
      result.hourly = { error: hourlyJson.error.message, code: hourlyJson.error.code };
    } else {
      const actionSumsH: Record<string, number> = {};
      (hourlyJson.data || []).forEach((d: any) => {
        (d.actions || []).forEach((a: any) => {
          actionSumsH[a.action_type] = (actionSumsH[a.action_type] || 0) + parseFloat(a.value || "0");
        });
      });
      // Check if actions field even exists in the response
      const hasActionsField = (hourlyJson.data || []).some((d: any) => "actions" in d);
      result.hourly = {
        rows_returned: hourlyJson.data?.length || 0,
        has_actions_field_in_response: hasActionsField,
        action_types: Object.entries(actionSumsH)
          .sort((a, b) => b[1] - a[1])
          .map(([action_type, total]) => ({ action_type, total })),
        // Raw sample row (first one)
        sample_row_fields: hourlyJson.data?.[0] ? Object.keys(hourlyJson.data[0]) : [],
      };
    }

    results.push(result);
  }

  return NextResponse.json({
    project: project.alias,
    goal,
    preset,
    results,
  });
}
