import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl, META_API_VERSION as META_VERSION } from "@/lib/server-auth";
import { subscribePages } from "@/lib/meta-webhooks";
import { logger } from "@/lib/logger";

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

    // Scopes realmente otorgados al token: los campos de webhook se filtran
    // por ellos (subscribed_apps es todo-o-nada; ver lib/meta-webhooks.ts).
    let grantedScopes: string[] | undefined;
    try {
      const permsRes = await metaFetch(metaUrl("me/permissions", {}), token);
      const permsData = await permsRes.json();
      if (permsRes.ok && Array.isArray(permsData?.data)) {
        grantedScopes = permsData.data
          .filter((p: { status?: string }) => p.status === "granted")
          .map((p: { permission?: string }) => p.permission)
          .filter(Boolean);
      }
    } catch { /* sin scopes → subscribePages usa todos los campos + reintento mínimo */ }

    // ─── Subscribe each page (and its linked IG) to webhook fields ───
    // Lógica compartida con el callback de conexión (lib/meta-webhooks.ts):
    // página + IG se suscriben en un solo POST para no sobrescribir campos.
    const subscribablePages = pages.map((page: any) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      instagramId: page.instagram_business_account?.id ?? null,
    }));
    results.push(...(await subscribePages(subscribablePages, META_VERSION, grantedScopes)));

    // ─── Get current webhook verification status ───
    const callbackUrl = `${getCallbackUrl()}/api/webhooks/meta`;

    // Sin fallback hardcodeado: el verify token es un secreto y vive solo en env.
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      return NextResponse.json(
        { error: "META_WEBHOOK_VERIFY_TOKEN no está configurado en este entorno." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      callbackUrl,
      verifyToken,
      subscriptions: results,
      totalPages: pages.length,
      instructions: {
        step1: "Ve a Meta Developers → Tu App → Webhooks",
        step2: `Callback URL: ${callbackUrl}`,
        step3: `Verify Token: ${verifyToken}`,
        step4: "Suscríbete a: page, instagram, ad_account, whatsapp_business_account",
        pageFields: "messages, messaging_postbacks, messaging_optins, messaging_referrals, message_deliveries, message_reads, feed, mention, ratings, leadgen",
        instagramFields: "messages, messaging_postbacks, comments, mentions, story_insights, live_comments",
        adAccountFields: "campaigns, adsets, ads, account_spending_limit_reached, funding_source_removed",
        whatsappFields: "messages, message_template_status_update",
      },
    });
  } catch (err: any) {
    logger.error("[WEBHOOK-SUBSCRIBE] Error:", err);
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

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      return NextResponse.json(
        { error: "META_WEBHOOK_VERIFY_TOKEN no está configurado en este entorno." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      callbackUrl: `${getCallbackUrl()}/api/webhooks/meta`,
      verifyToken,
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
  return "https://zefirus.xyz";
}
