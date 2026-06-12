import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch , META_API_VERSION } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { validateBody } from "@/lib/validate";
import { BulkActionSchema } from "@/lib/ads-schemas";

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const _validate = await validateBody(req, BulkActionSchema);
    if (!_validate.ok) return _validate.response;
    const { action, ids, level, adAccountId, updates } = _validate.data;

    const token = accessToken;
    const version = META_API_VERSION;

    const results = await Promise.allSettled(
      ids.map(async (id: string, index: number) => {
        try {
          const baseUrl = `https://graph.facebook.com/${version}/${id}`;

          if (action === "delete") {
            // Meta doesn't allow DELETE on campaigns/adsets/ads with spend history.
            // The real Ads Manager "deletes" by archiving. Try DELETE first, fallback to ARCHIVE.
            const delRes = await metaFetch(baseUrl, token, { method: "DELETE" });
            if (delRes.ok) {
              const json = await delRes.json();
              return { id, success: true, data: json, method: "deleted" };
            }
            // Fallback: archive instead (this is what Meta Ads Manager does)
            const archRes = await metaFetch(baseUrl, token, {
              method: "POST",
              body: JSON.stringify({ status: "ARCHIVED" }),
            });
            const archJson = await archRes.json();
            return { id, success: archRes.ok, data: archJson, method: "archived" };

          } else if (action === "duplicate") {
            const res = await metaFetch(`${baseUrl}/copies`, token, {
              method: "POST",
              body: JSON.stringify({ deep_copy: true, status_option: "PAUSED" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "archive") {
            const res = await metaFetch(baseUrl, token, {
              method: "POST",
              body: JSON.stringify({ status: "ARCHIVED" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "pause") {
            const res = await metaFetch(baseUrl, token, {
              method: "POST",
              body: JSON.stringify({ status: "PAUSED" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "activate") {
            const res = await metaFetch(baseUrl, token, {
              method: "POST",
              body: JSON.stringify({ status: "ACTIVE" }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "rename") {
            const update = updates?.[index];
            if (!update?.newName) return { id, success: false, error: "Missing newName" };
            const res = await metaFetch(baseUrl, token, {
              method: "POST",
              body: JSON.stringify({ name: update.newName }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "budget_update") {
            const update = updates?.[index];
            if (!update?.budget) return { id, success: false, error: "Missing budget update" };
            const budgetField = update.type === "lifetime" ? "lifetime_budget" : "daily_budget";
            const budgetCentavos = Math.round(update.budget * 100);
            const res = await metaFetch(baseUrl, token, {
              method: "POST",
              body: JSON.stringify({ [budgetField]: budgetCentavos }),
            });
            const json = await res.json();
            return { id, success: res.ok, data: json };

          } else if (action === "spend_cap") {
            const update = updates?.[index];
            if (!update) return { id, success: false, error: "Missing spend_cap" };
            const res = await metaFetch(baseUrl, token, {
              method: "POST",
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

    return NextResponse.json({
      status: failCount === 0 ? "success" : successCount === 0 ? "error" : "partial",
      // Contract used by the Ads Manager UI (toasts + counts)
      success: successCount > 0,
      successCount,
      failCount,
      results: processedResults,
      error: successCount === 0 ? (processedResults[0] as any)?.error || (processedResults[0] as any)?.data?.error?.message || "Todas las operaciones fallaron" : undefined,
      operation: action,
      object_type: level || "unknown",
      ad_account_id: adAccountId,
      confirmed_by_user: true,
      data: processedResults,
      meta: {
        total_rows: processedResults.length,
        api_version: version
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}
