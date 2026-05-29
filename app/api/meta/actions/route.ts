import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import fs from "fs";

function logApiCall(details: any) {
  try {
    fs.appendFileSync(
      "meta-api.log",
      JSON.stringify({ timestamp: new Date().toISOString(), ...details }) + "\n"
    );
  } catch (e) {}
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ids, level, adAccountId, updates } = body;
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = session.accessToken;
    const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";

    const results = await Promise.allSettled(
      ids.map(async (id: string, index: number) => {
        try {
          if (action === "delete") {
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, { method: "DELETE" });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "duplicate") {
            const url = `https://graph.facebook.com/${version}/${id}/copies?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ deep_copy: true, status_option: "PAUSED" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "archive") {
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "ARCHIVED" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "pause") {
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "PAUSED" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "activate") {
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "ACTIVE" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "rename") {
            const update = updates?.[index];
            if (!update?.newName) return { id, success: false, error: "Missing newName" };
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: update.newName }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "budget_update") {
            const update = updates?.[index];
            if (!update) return { id, success: false, error: "Missing budget update" };
            const budgetField = update.type === "lifetime" ? "lifetime_budget" : "daily_budget";
            const budgetCentavos = Math.round(update.budget * 100);
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [budgetField]: budgetCentavos }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "spend_cap") {
            const update = updates?.[index];
            if (!update) return { id, success: false, error: "Missing spend_cap" };
            const url = `https://graph.facebook.com/${version}/${id}?access_token=${token}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spend_cap: update.spend_cap }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };
          }

          return { id, success: false, error: "Unsupported action" };
        } catch (err: any) {
          return { id, success: false, error: err.message };
        }
      })
    );

    const processedResults = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { id: ids[i], success: false, error: r.reason?.message || "Unknown error" };
    });

    const successCount = processedResults.filter((r: any) => r.success).length;
    const failCount = processedResults.length - successCount;

    logApiCall({ action: `BULK_${action}`, level, idsCount: ids.length, successCount, failCount });
    return NextResponse.json({ success: true, results: processedResults, successCount, failCount });
  } catch (error: any) {
    logApiCall({ action: "BULK_action_error", error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
