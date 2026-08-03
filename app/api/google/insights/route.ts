import { NextResponse, NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { getAdsInsights } from "@/lib/integrations/google/google-ads";
import { z } from "zod";

const insightsQuerySchema = z.object({
  adAccountId: z.string().optional(),
  preset: z.enum(["this_month", "last_month", "last_7d", "last_30d", "this_year", "all_time", "custom"]).optional(),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function getDateRange(preset: string | undefined, dateStart: string | undefined, dateEnd: string | undefined) {
  if (dateStart && dateEnd) return { since: dateStart, until: dateEnd };

  const now = new Date();
  
  if (preset === "last_7d") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return { since: d.toISOString().split("T")[0], until: now.toISOString().split("T")[0] };
  }
  if (preset === "last_30d") {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return { since: d.toISOString().split("T")[0], until: now.toISOString().split("T")[0] };
  }
  if (preset === "last_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { since: firstDay.toISOString().split("T")[0], until: lastDay.toISOString().split("T")[0] };
  }
  if (preset === "this_year") {
    return { since: `${now.getFullYear()}-01-01`, until: now.toISOString().split("T")[0] };
  }
  
  // Default this_month
  return { since: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, until: now.toISOString().split("T")[0] };
}

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  try {
    const workspaceId = ctx.workspaceId;


    const { searchParams } = new URL(req.url);
    const parsed = insightsQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params", details: parsed.error }, { status: 400 });
    }

    const { adAccountId, preset, dateStart, dateEnd } = parsed.data;
    const { since, until } = getDateRange(preset, dateStart, dateEnd);
    
    // adAccountId can be comma-separated list or "all"
    const accountIds = adAccountId ? adAccountId.split(",") : ["all"];

    const data = await getAdsInsights(workspaceId, accountIds, since, until);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/google/insights ERROR:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
});
