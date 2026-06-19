import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getAdsCampaigns, updateCampaignStatus } from "@/lib/integrations/google/google-ads";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET: Lists Google Ads campaigns for the active workspace,
 * formatted to be 100% compatible with the Ads Manager UI.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || undefined;
  const until = searchParams.get("until") || undefined;

  try {
    const data = await getAdsCampaigns(workspaceId, since, until);
    
    // Map Google Ads campaigns to match the unified frontend structure
    const mappedCampaigns = data.campaigns.map((c) => {
      const statusMapped = c.status === "ENABLED" ? "ACTIVE" : c.status;
      return {
        id: c.id,
        name: c.name,
        status: statusMapped,
        effective_status: statusMapped,
        objective: "OUTCOME_LEADS", // Display "Leads" objective
        insights: {
          spend: c.spend,
          impressions: c.impressions,
          clicks: c.clicks,
          ctr: c.ctr * 100, // Frontend expects CTR as percentage (e.g., 1.5 instead of 0.015)
          cpc: c.cpc,
          cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
          reach: c.impressions, // Google Ads doesn't expose unique reach in basic queries; use impressions
          frequency: 1,
          actions: [
            { action_type: "lead", value: String(c.conversions) }
          ],
          action_values: [
            { action_type: "purchase", value: String(c.conversionsValue) }
          ]
        }
      };
    });

    return NextResponse.json({ data: mappedCampaigns });
  } catch (err: any) {
    logger.error("[Google Ads campaigns GET error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch Google Ads campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST: Updates a Google Ads campaign status (ACTIVE/PAUSED).
 * Re-maps status to Google-specific ENABLED/PAUSED.
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 400 });
  }

  const hasAccess = await verifyWorkspaceAccess(workspaceId, jwt.sub, ["OWNER", "ADMIN"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { campaignId, status } = await request.json();
    if (!campaignId || !status) {
      return NextResponse.json({ error: "Missing campaignId or status" }, { status: 400 });
    }

    if (status !== "ACTIVE" && status !== "PAUSED") {
      return NextResponse.json(
        { error: "Invalid status. Must be ACTIVE or PAUSED" },
        { status: 400 }
      );
    }

    // Map frontend status (ACTIVE) back to Google Ads status (ENABLED)
    const googleStatus = status === "ACTIVE" ? "ENABLED" : "PAUSED";
    
    await updateCampaignStatus(workspaceId, campaignId, googleStatus);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("[Google Ads campaigns POST error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to update campaign status" },
      { status: 500 }
    );
  }
}
