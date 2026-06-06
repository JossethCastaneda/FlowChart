import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

const META_VERSION = process.env.META_API_VERSION || "v23.0";

/**
 * POST /api/webhooks/subscribe
 * Subscribes all connected pages and IG accounts to webhook events.
 * This should be called after a user connects their Meta account.
 *
 * What it does:
 * 1. Gets all pages the user manages
 * 2. Subscribes each page to relevant webhook fields
 * 3. Subscribes the Meta App to page/instagram/ad_account webhooks
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "webhook");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  const results: any[] = [];

  try {
    // Get all pages the user manages
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No se encontraron páginas. Conecta tu cuenta de Meta primero.",
      });
    }

    // ─── Subscribe each page to webhook fields ───
    for (const page of pages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;

      // Page subscriptions
      const pageFields = [
        "messages",              // Messenger messages
        "messaging_postbacks",   // Button clicks in Messenger
        "messaging_optins",      // User opt-ins
        "messaging_referrals",   // Referrals (m.me links, ads)
        "message_deliveries",    // Delivery confirmations
        "message_reads",         // Read receipts
        "feed",                  // Page feed events (posts, comments, reactions)
        "mention",               // Page mentions
        "ratings",               // Page ratings/reviews
        "leadgen",               // Lead generation forms
      ];

      try {
        const subRes = await fetch(
          `https://graph.facebook.com/${META_VERSION}/${page.id}/subscribed_apps`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${pageToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscribed_fields: pageFields.join(","),
            }),
          }
        );
        const subData = await subRes.json();

        results.push({
          entity: `Page: ${page.name}`,
          id: page.id,
          type: "page",
          fields: pageFields,
          success: subData.success === true,
          error: subData.error?.message || null,
        });
      } catch (err: any) {
        results.push({
          entity: `Page: ${page.name}`,
          id: page.id,
          type: "page",
          success: false,
          error: err.message,
        });
      }

      // ─── Instagram subscription ───
      const igId = page.instagram_business_account?.id;
      if (igId) {
        // Instagram uses the page's subscribed_apps endpoint too
        // but with instagram-specific fields
        try {
          const igSubRes = await fetch(
            `https://graph.facebook.com/${META_VERSION}/${page.id}/subscribed_apps`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${pageToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                subscribed_fields: [
                  "messages",              // IG DMs
                  "messaging_postbacks",   // IG postbacks
                  "feed",                  // Already subscribed above, but ensures IG events too
                ].join(","),
              }),
            }
          );
          const igSubData = await igSubRes.json();

          results.push({
            entity: `Instagram: ${page.name}`,
            id: igId,
            type: "instagram",
            success: igSubData.success === true,
            error: igSubData.error?.message || null,
          });
        } catch (err: any) {
          results.push({
            entity: `Instagram: ${page.name}`,
            id: igId,
            type: "instagram",
            success: false,
            error: err.message,
          });
        }
      }
    }

    // ─── Get current webhook verification status ───
    const callbackUrl = `${getCallbackUrl()}/api/webhooks/meta`;

    return NextResponse.json({
      success: true,
      callbackUrl,
      verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "sodare_webhook_verify_2026",
      subscriptions: results,
      totalPages: pages.length,
      instructions: {
        step1: "Ve a Meta Developers → Tu App → Webhooks",
        step2: `Callback URL: ${callbackUrl}`,
        step3: `Verify Token: ${process.env.META_WEBHOOK_VERIFY_TOKEN || "sodare_webhook_verify_2026"}`,
        step4: "Suscríbete a: page, instagram, ad_account, whatsapp_business_account",
        pageFields: "messages, messaging_postbacks, messaging_optins, messaging_referrals, message_deliveries, message_reads, feed, mention, ratings, leadgen",
        instagramFields: "messages, messaging_postbacks, comments, mentions, story_insights, live_comments",
        adAccountFields: "campaigns, adsets, ads, account_spending_limit_reached, funding_source_removed",
        whatsappFields: "messages, message_template_status_update",
      },
    });
  } catch (err: any) {
    console.error("[WEBHOOK-SUBSCRIBE] Error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/subscribe
 * Returns current subscription status for all pages
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "webhook");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    const subscriptions: any[] = [];

    for (const page of pages) {
      const pageToken = page.access_token;
      if (!pageToken) continue;

      try {
        const subRes = await fetch(
          `https://graph.facebook.com/${META_VERSION}/${page.id}/subscribed_apps`,
          {
            headers: { Authorization: `Bearer ${pageToken}` },
          }
        );
        const subData = await subRes.json();

        subscriptions.push({
          pageId: page.id,
          pageName: page.name,
          subscribedFields: subData.data?.[0]?.subscribed_fields || [],
          appId: subData.data?.[0]?.id || null,
        });
      } catch (err: any) {
        subscriptions.push({
          pageId: page.id,
          pageName: page.name,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      callbackUrl: `${getCallbackUrl()}/api/webhooks/meta`,
      verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "sodare_webhook_verify_2026",
      subscriptions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}

function getCallbackUrl(): string {
  // Production URL
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return "https://sodare.xyz";
}
