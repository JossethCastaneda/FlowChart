import { NextResponse } from "next/server";
import { getMetaAccessToken, metaGetAll , META_API_VERSION } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const accessToken = await getMetaAccessToken(request as any, "ads");

    if (!accessToken) {
      return NextResponse.json({
        data: [],
        source: "no_session",
        message: "No active Meta session token found."
      });
    }

    const version = META_API_VERSION;

    // Period for the per-account spend (used to default to the highest-spend account).
    // Accepts ?preset= (a Meta date_preset) or ?since=&until= for custom ranges.
    const reqUrl = new URL(request.url);
    const preset = reqUrl.searchParams.get("preset") || "maximum";
    const since = reqUrl.searchParams.get("since");
    const until = reqUrl.searchParams.get("until");
    const insightsField =
      since && until
        ? `insights.time_range({'since':'${since}','until':'${until}'}){spend}`
        : `insights.date_preset(${preset === "custom" ? "maximum" : preset}){spend}`;

    const url = `https://graph.facebook.com/${version}/me/adaccounts?fields=id,name,account_id,business{id,name},${insightsField}&limit=100`;
    const { data: allData, error } = await metaGetAll(url, accessToken);

    if (error && allData.length === 0) {
      return NextResponse.json({
        data: [],
        source: "api_error",
        error,
      });
    }

    const accounts = allData.map((acc: any) => {
      const portfolioName = acc.business?.name || "Sin Portafolio Comercial";
      const spend = parseFloat(acc.insights?.data?.[0]?.spend || "0") || 0;
      return {
        id: acc.id,
        name: acc.name ? `${acc.name} — ${acc.id}` : `Ad Account ${acc.account_id} — ${acc.id}`,
        portfolio: portfolioName,
        spend,
      };
    });

    return NextResponse.json({
      data: accounts,
      source: "meta_api",
    });
  } catch (error: any) {
    logger.error("Error in Meta adaccounts API:", error);
    return NextResponse.json({
      data: [],
      source: "catch_error",
      error: error.message || "Internal server error"
    });
  }
}
