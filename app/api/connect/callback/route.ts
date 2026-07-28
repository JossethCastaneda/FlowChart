import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { env } from "@/lib/env";
import { start } from "workflow/api";
import { syncIntegrationAssetsWorkflow } from "@/workflows/sync-integration-assets";
import { validateModulePermissions } from "@/lib/meta-scopes";
import { subscribePages, logSubscriptionResults } from "@/lib/meta-webhooks";
import { logger } from "@/lib/logger";

const META_API_VERSION = env.META_API_VERSION;
const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET || env.AUTH_SECRET;

/**
 * GET /api/connect/callback
 * Facebook OAuth callback — exchanges code for token and saves to Integration table.
 * 
 * Query params from Facebook:
 *   - code: authorization code
 *   - state: base64url-encoded JSON { payload, sig } — HMAC-signed
 * 
 * FIX: Properly separate user access token vs page access token
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  let baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || request.nextUrl.origin;
  baseUrl = baseUrl.replace(/\/$/, "");

  // User cancelled or error
  if (error) {
    logger.error("[CONNECT CALLBACK] Facebook error:", error);
    return NextResponse.redirect(`${baseUrl}/connect/done?error=${error}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/connect/done?error=missing_params`);
  }

  // ── SECURITY: Verify active session ──
  const jwt = await getToken({ req: request as any, secret: NEXTAUTH_SECRET });
  if (!jwt?.sub) {
    return NextResponse.redirect(`${baseUrl}/connect/done?error=not_authenticated`);
  }

  // ── SECURITY: Verify HMAC signature on state ──
  if (!NEXTAUTH_SECRET) {
    logger.error("[CONNECT CALLBACK] NEXTAUTH_SECRET/AUTH_SECRET not configured");
    return NextResponse.redirect(`${baseUrl}/connect/done?error=server_error_auth_secret`);
  }

  let module = "unknown";
  let userId = "";
  let workspaceId = "";
  try {
    const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    const { payload, sig } = parsed;

    if (!payload || !sig) {
      return NextResponse.redirect(`${baseUrl}/connect/done?error=invalid_state`);
    }

    const expected = createHmac("sha256", NEXTAUTH_SECRET)
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      logger.warn("[CONNECT CALLBACK] HMAC signature mismatch — possible CSRF attack");
      return NextResponse.redirect(`${baseUrl}/connect/done?error=invalid_state`);
    }

    const decoded = JSON.parse(payload);
    module = decoded.module;
    userId = decoded.userId;
    workspaceId = decoded.workspaceId || "";

    // Anti-replay: rechazar estados de más de 15 min (o sin timestamp = legacy).
    const STATE_TTL_MS = 15 * 60 * 1000;
    if (typeof decoded.ts !== "number" || Date.now() - decoded.ts > STATE_TTL_MS) {
      logger.warn("[CONNECT CALLBACK] State expirado o sin timestamp");
      return NextResponse.redirect(`${baseUrl}/connect/done?error=state_expired`);
    }

    // Verify that the userId in the state matches the current JWT session
    if (userId !== jwt.sub) {
      logger.warn(`[CONNECT CALLBACK] User mismatch — state userId: ${userId}, jwt.sub: ${jwt.sub}`);
      return NextResponse.redirect(`${baseUrl}/connect/done?error=user_mismatch`);
    }
  } catch {
    return NextResponse.redirect(`${baseUrl}/connect/done?error=invalid_state`);
  }

  const clientId = env.META_APP_ID || "";
  const clientSecret = env.META_APP_SECRET || "";
  const redirectUri = `${baseUrl}/api/connect/callback`;

  // ── BRANCH: Instagram Platform Direct Login ─────────────────────────────────
  // Cuando module=instagram, el flujo usa instagram.com/oauth → graph.instagram.com
  // con INSTAGRAM_APIKEY_CONNECT/SECRET (app separada, no la app de Meta Ads/Webhooks).
  if (module === "instagram" || module === "publisher_instagram") {
    return await handleInstagramDirectCallback({
      code,
      baseUrl,
      redirectUri,
      userId,
      workspaceId,
      providerName: module === "publisher_instagram" ? "meta_publisher_instagram" : "instagram",
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  try {
    let userAccessToken = "";

    if (module === "publisher_instagram") {
      // Logic moved to handleInstagramDirectCallback
    } else {
      // 1. Exchange code for short-lived token via Facebook Graph API
      const tokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
      tokenUrl.searchParams.set("client_id", clientId);
      tokenUrl.searchParams.set("client_secret", clientSecret);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("code", code);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        logger.error("[CONNECT CALLBACK] FB Token exchange failed:", tokenData);
        return NextResponse.redirect(`${baseUrl}/connect/done?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error?.message || "Unknown error")}`);
      }
      userAccessToken = tokenData.access_token;

      // 2. Exchange for long-lived token (~60 days) via Facebook Graph API
      try {
        const llUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
        llUrl.searchParams.set("grant_type", "fb_exchange_token");
        llUrl.searchParams.set("client_id", clientId);
        llUrl.searchParams.set("client_secret", clientSecret);
        llUrl.searchParams.set("fb_exchange_token", userAccessToken);

        const llRes = await fetch(llUrl.toString());
        const llData = await llRes.json();
        if (llRes.ok && llData.access_token) {
          userAccessToken = llData.access_token;
          logger.info(`[CONNECT CALLBACK] Long-lived user token obtained for module: ${module}`);
        }
      } catch (e) {
        logger.warn("[CONNECT CALLBACK] Long-lived exchange failed for FB, using short-lived:", e);
      }
    }

    // FIX: Use USER access token to fetch pages, then validate
    // CRITICAL: Do NOT use page tokens for Graph API calls
    let pages: Array<{
      id: string;
      name: string;
      accessToken: string; // Page token (encrypted)
      picture?: string | null;
      instagramId?: string | null;
    }> = [];

    // Page tokens EN TEXTO PLANO — solo en memoria, para suscribir webhooks
    // tras la conexión. NUNCA se persisten ni se devuelven al client.
    let rawPages: Array<{
      id: string;
      name: string;
      accessToken: string;
      instagramId: string | null;
    }> = [];

    let userScopes: string[] = [];
    
    try {
      // 3a. Validate user permissions first
      const permissionsRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/permissions`,
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
      const permissionsData = await permissionsRes.json();
      
      if (permissionsRes.ok && permissionsData.data) {
        userScopes = permissionsData.data
          .filter((p: any) => p.status === "granted")
          .map((p: any) => p.permission);
        
        // FIX: Validate permissions match module requirements
        const validation = validateModulePermissions(module, userScopes);
        if (!validation.valid) {
          logger.warn(`[CONNECT CALLBACK] Missing scopes for ${module}:`, validation.missing);
          // Don't fail yet — proceed but log warning
        }
      }

      // 3b. Fetch connected pages using USER token
      const pagesRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,picture,instagram_business_account&limit=100`,
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
      const pagesData = await pagesRes.json();
      
      if (pagesRes.ok && pagesData.data) {
        pages = pagesData.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          accessToken: encryptToken(p.access_token), // Encrypt PAGE token for storage
          picture: p.picture?.data?.url || null,
          instagramId: p.instagram_business_account?.id || null,
        }));
        rawPages = pagesData.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          accessToken: p.access_token, // PLAINTEXT — solo para suscribir webhooks
          instagramId: p.instagram_business_account?.id || null,
        }));
        logger.info(`[CONNECT CALLBACK] Fetched ${pages.length} pages with user token`);
      }
    } catch (e) {
      logger.warn("[CONNECT CALLBACK] Failed to fetch pages:", e);
      return NextResponse.redirect(`${baseUrl}/connect/done?error=fetch_pages_failed`);
    }

    // 3c. Identidad del PERFIL DE FACEBOOK que otorgó el acceso (nickname +
    // avatar). Se guarda por módulo para que cada sección muestre la cuenta
    // independiente con la que fue conectada — no el usuario de Zefirus.
    let connectedProfile: { id: string; name: string | null; picture: string | null } | null = null;
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/me?fields=id,name,picture.width(96).height(96)`,
        { headers: { Authorization: `Bearer ${userAccessToken}` } }
      );
      const meData = await meRes.json();
      if (meRes.ok && meData.id) {
        connectedProfile = {
          id: meData.id,
          name: meData.name ?? null,
          picture: meData.picture?.data?.url ?? null,
        };
      }
    } catch (e) {
      logger.warn("[CONNECT CALLBACK] Failed to fetch connected profile:", e);
    }


    // 4. Verify workspace membership using workspaceId from state
    let resolvedWorkspaceId = workspaceId;

    if (resolvedWorkspaceId) {
      // Verify that the user actually belongs to this workspace
      const member = await prisma.workspaceMember.findFirst({
        where: { userId, workspaceId: resolvedWorkspaceId, role: { in: ["OWNER", "ADMIN"] } },
      });
      if (!member) {
        logger.warn(`[CONNECT CALLBACK] User ${userId} is not OWNER/ADMIN of workspace ${resolvedWorkspaceId}`);
        return NextResponse.redirect(`${baseUrl}/connect/done?error=insufficient_role`);
      }
    } else {
      // Fallback: primer workspace del usuario donde sea OWNER/ADMIN. Antes NO verificaba
      // el rol → un MEMBER (vía un state legacy sin workspaceId) podía conectar una
      // integración a su primer workspace sin ser admin.
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId, role: { in: ["OWNER", "ADMIN"] } },
        orderBy: { workspace: { createdAt: "asc" } },
        select: { workspaceId: true },
      });
      if (!membership) {
        return NextResponse.redirect(`${baseUrl}/connect/done?error=insufficient_role`);
      }
      resolvedWorkspaceId = membership.workspaceId;
    }

    // 5. Store the token in the Integration table keyed by module
    // FIX: Store USER access token (for Graph API), NOT page tokens
    const provider = `meta_${module}`; // e.g. "meta_social", "meta_analytics"
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    
    const encryptedUserToken = encryptToken(userAccessToken);

    // Store module-specific integration
    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: resolvedWorkspaceId,
          provider,
          userId: "workspace",
        },
      },
      update: {
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages, // Page data (with encrypted page tokens)
          expiresAt,
          refreshedAt: new Date().toISOString(),
          module,
          grantedScopes: userScopes, // Track what was actually granted
          profile: connectedProfile, // Perfil FB conectado (nickname + avatar)
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider,
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          module,
          grantedScopes: userScopes,
          profile: connectedProfile,
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    // Also update the generic "meta" integration so all modules can use it as fallback.
    // G5 FIX: cada módulo se conecta con su propio config_id (scopes distintos).
    // Si sobrescribimos ciegamente el token genérico con el del último módulo,
    // un caller que use el genérico (sin pasar `module`) puede perder scopes
    // (ej. conectar Analytics pisaría el token con ads_management de Ads).
    // Por eso: si el token genérico actual tiene scopes que el nuevo NO incluye,
    // conservamos el token existente (más amplio) y solo unificamos el registro
    // de scopes. Si el nuevo es igual o superset, sí lo promovemos.
    const existingGeneric = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId: resolvedWorkspaceId,
          provider: "meta",
          userId: "workspace",
        },
      },
    });
    const existingCreds = (existingGeneric?.credentials as Record<string, unknown> | null) ?? null;
    const existingScopes = Array.isArray(existingCreds?.grantedScopes)
      ? (existingCreds!.grantedScopes as string[])
      : [];
    const newScopeSet = new Set(userScopes);
    const wouldLoseScopes =
      existingGeneric?.connected === true &&
      existingScopes.some((s) => !newScopeSet.has(s));
    const unionScopes = [...new Set([...existingScopes, ...userScopes])];

    const genericCredentials = wouldLoseScopes
      ? {
          // Conserva el token existente (más amplio); solo refresca metadatos.
          ...existingCreds,
          grantedScopes: unionScopes,
          refreshedAt: new Date().toISOString(),
          // Refresca la identidad mostrada al perfil recién conectado.
          profile: connectedProfile ?? (existingCreds?.profile ?? null),
        }
      : {
          accessToken: encryptedUserToken, // USER token
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          grantedScopes: unionScopes,
          profile: connectedProfile,
          // Preservar ajustes por-página (p.ej. toggles de Messenger). Sin esto, cada
          // reconexión de un módulo Meta los borraba al reconstruir las credenciales.
          ...(existingCreds?.pageSettings ? { pageSettings: existingCreds.pageSettings } : {}),
        };

    if (wouldLoseScopes) {
      logger.warn(
        `[CONNECT CALLBACK] Token genérico "meta" conservado (el módulo "${module}" no cubre scopes existentes: ${existingScopes.filter((s) => !newScopeSet.has(s)).join(", ")})`
      );
    }

    const metaIntegration = await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: resolvedWorkspaceId,
          provider: "meta",
          userId: "workspace",
        },
      },
      update: {
        credentials: genericCredentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider: "meta",
        credentials: {
          accessToken: encryptedUserToken, // USER token
          pages,
          expiresAt,
          refreshedAt: new Date().toISOString(),
          grantedScopes: userScopes,
          profile: connectedProfile,
        },
        connected: true,
        connectedAt: new Date(),
        connectedBy: userId,
      },
    });

    logger.info(`[CONNECT CALLBACK] Module "${module}" connected with ${pages.length} pages`);

    // Invalida el cache de connection-status (F6) para que el estado refleje la
    // nueva conexión de inmediato en vez de esperar el TTL.
    await prisma.metaAnalyticsCache.deleteMany({
      where: { workspaceId: resolvedWorkspaceId, endpoint: "connection-status" },
    }).catch(() => {});

    // ── Seed inmediato de IntegrationAssetCache (page + ig_account) ────────────
    // El workflow de sync es async y puede tardar. Si llega un webhook de IG DM
    // antes de que corra el workflow, resolveWorkspaceForMetaAsset falla y el
    // mensaje se descarta silenciosamente. Sembramos el cache aquí de forma
    // sincrónica para que el primer evento ya resuelva el workspace.
    try {
      for (const p of pages) {
        await prisma.integrationAssetCache.upsert({
          where: { integrationId_assetType_externalId: { integrationId: metaIntegration.id, assetType: "page", externalId: p.id } },
          update: { name: p.name, syncedAt: new Date() },
          create: { integrationId: metaIntegration.id, workspaceId: resolvedWorkspaceId, provider: "meta", assetType: "page", externalId: p.id, name: p.name, metadata: {} },
        });
        if (p.instagramId) {
          await prisma.integrationAssetCache.upsert({
            where: { integrationId_assetType_externalId: { integrationId: metaIntegration.id, assetType: "ig_account", externalId: p.instagramId } },
            update: { name: p.name, syncedAt: new Date() },
            create: { integrationId: metaIntegration.id, workspaceId: resolvedWorkspaceId, provider: "meta", assetType: "ig_account", externalId: p.instagramId, name: p.name, metadata: { linkedPageId: p.id } },
          });
        }
      }
      logger.info(`[CONNECT CALLBACK] Seeded asset cache: ${pages.length} pages for module ${module}`);
    } catch (cacheErr) {
      logger.warn("[CONNECT CALLBACK] Asset cache seed failed (non-fatal — workflow will retry):", cacheErr);
    }

    // Dispatch background sync workflow for deep asset data (campaigns, ad accounts, etc.)
    try {
      await start(syncIntegrationAssetsWorkflow, [metaIntegration.id]);
      logger.info(`[CONNECT CALLBACK] Dispatched asset sync for integration ${metaIntegration.id}`);
    } catch (syncErr) {
      logger.error("[CONNECT CALLBACK] Failed to dispatch sync workflow:", syncErr);
    }

    // Auto-suscribir webhooks con UNION de scopes de todas las integraciones.
    // FIX: subscribed_apps es un PUT implicito — si solo usamos los scopes del
    // modulo recien conectado, sobrescribimos y eliminamos campos que otros modulos
    // habian suscrito (ej. 'messages' de Messenger se pierde al conectar publisher).
    // Solucion: unir los scopes de todas las integraciones Meta del workspace.
    try {
      const existingIntegrations = await prisma.integration.findMany({
        where: { workspaceId: resolvedWorkspaceId, provider: { startsWith: "meta" }, connected: true },
        select: { credentials: true },
      });
      const allScopesSet = new Set<string>(userScopes);
      for (const intg of existingIntegrations) {
        const creds = intg.credentials as { grantedScopes?: string[] } | null;
        for (const s of creds?.grantedScopes ?? []) allScopesSet.add(s);
      }
      const unionScopes = Array.from(allScopesSet);

      const subResults = await subscribePages(rawPages, META_API_VERSION, unionScopes);
      const { subscribed, failed } = logSubscriptionResults(subResults, {
        route: "api/connect/callback",
        module,
        workspaceId: resolvedWorkspaceId,
      });
      await prisma.auditLog.create({
        data: {
          workspaceId: resolvedWorkspaceId,
          userId,
          action: "subscribe_webhooks",
          resourceType: "Integration",
          resourceId: metaIntegration.id,
          details: { module, pages: rawPages.length, subscribed, failed, unionScopes: unionScopes.length },
        },
      }).catch((auditErr) => {
        logger.error("[CONNECT CALLBACK] Failed to write AuditLog:", auditErr);
      });
    } catch (subErr) {
      logger.error("[CONNECT CALLBACK] Webhook auto-subscribe failed:", subErr);
    }

    // Always redirect to /connect/done — it handles popup close OR fallback navigation
    return NextResponse.redirect(`${baseUrl}/connect/done?module=${module}`);

  } catch (err: any) {
    logger.error("[CONNECT CALLBACK] Error:", err);
    return NextResponse.redirect(`${baseUrl}/connect/done?module=&error=server_error`);
  }
}

/**
 * Maneja el callback del flujo de Instagram Business Login (Direct, sin Facebook).
 * Usa INSTAGRAM_APIKEY_CONNECT/SECRET y graph.instagram.com (no graph.facebook.com).
 *
 * Ref: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
 */
async function handleInstagramDirectCallback({
  code,
  baseUrl,
  redirectUri,
  userId,
  workspaceId,
  providerName = "instagram",
}: {
  code: string;
  baseUrl: string;
  redirectUri: string;
  userId: string;
  workspaceId: string;
  providerName?: string;
}): Promise<Response> {
  const igAppId = env.INSTAGRAM_APIKEY_CONNECT;
  const igAppSecret = env.INSTAGRAM_SECRET_CONNECT;

  if (!igAppId || !igAppSecret) {
    logger.error("[IG DIRECT CALLBACK] INSTAGRAM_APIKEY_CONNECT or INSTAGRAM_SECRET_CONNECT not configured");
    return NextResponse.redirect(`${baseUrl}/connect/done?error=instagram_not_configured`);
  }

  try {
    // ── PASO 1: Intercambiar code por short-lived token (Instagram Platform) ──
    // POST a https://api.instagram.com/oauth/access_token (form-encoded)
    const tokenForm = new URLSearchParams({
      client_id: igAppId,
      client_secret: igAppSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenForm.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error("[IG DIRECT CALLBACK] Short-lived token exchange failed:", tokenData);
      return NextResponse.redirect(
        `${baseUrl}/connect/done?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error_message || tokenData.error_description || "Unknown error")}`
      );
    }

    const shortLivedToken: string = tokenData.access_token;
    const instagramUserId: string = String(tokenData.user_id);

    // ── PASO 2: Intercambiar por long-lived token (~60 días) ──
    // GET https://graph.instagram.com/access_token
    let longLivedToken = shortLivedToken;
    let expiresAt: Date | null = null;
    try {
      const llUrl = new URL("https://graph.instagram.com/access_token");
      llUrl.searchParams.set("grant_type", "ig_exchange_token");
      llUrl.searchParams.set("client_secret", igAppSecret);
      llUrl.searchParams.set("access_token", shortLivedToken);

      const llRes = await fetch(llUrl.toString());
      const llData = await llRes.json();

      if (llRes.ok && llData.access_token) {
        longLivedToken = llData.access_token;
        if (llData.expires_in) {
          expiresAt = new Date(Date.now() + llData.expires_in * 1000);
        }
        logger.info("[IG DIRECT CALLBACK] Long-lived Instagram token obtained", { instagramUserId });
      } else {
        logger.warn("[IG DIRECT CALLBACK] Long-lived exchange failed, using short-lived:", llData);
      }
    } catch (e) {
      logger.warn("[IG DIRECT CALLBACK] Long-lived exchange error:", e);
    }

    // ── PASO 3: Obtener perfil del usuario de Instagram ──
    // GET https://graph.instagram.com/me?fields=id,username,name,profile_picture_url
    let profile: { username?: string; name?: string; picture?: string } = {};
    try {
      const meUrl = new URL("https://graph.instagram.com/me");
      meUrl.searchParams.set("fields", "id,username,name,profile_picture_url");
      meUrl.searchParams.set("access_token", longLivedToken);

      const meRes = await fetch(meUrl.toString());
      const meData = await meRes.json();
      if (meRes.ok && meData.id) {
        profile = {
          username: meData.username ?? undefined,
          name: meData.name ?? undefined,
          picture: meData.profile_picture_url ?? undefined,
        };
        logger.info("[IG DIRECT CALLBACK] Profile fetched", { username: profile.username });
      }
    } catch (e) {
      logger.warn("[IG DIRECT CALLBACK] Failed to fetch IG profile:", e);
    }

    // ── PASO 4: Verificar workspace ──
    let resolvedWorkspaceId = workspaceId;
    if (resolvedWorkspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId, workspaceId: resolvedWorkspaceId, role: { in: ["OWNER", "ADMIN"] } },
      });
      if (!member) {
        return NextResponse.redirect(`${baseUrl}/connect/done?error=insufficient_role`);
      }
    } else {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId, role: { in: ["OWNER", "ADMIN"] } },
        orderBy: { workspace: { createdAt: "asc" } },
        select: { workspaceId: true },
      });
      if (!membership) return NextResponse.redirect(`${baseUrl}/connect/done?error=insufficient_role`);
      resolvedWorkspaceId = membership.workspaceId;
    }

    // ── PASO 5: Guardar en la tabla Integration ──
    const { encryptToken } = await import("@/lib/encryption");
    const encryptedToken = encryptToken(longLivedToken);

    const integration = await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: {
          workspaceId: resolvedWorkspaceId,
          provider: providerName,
          userId: "workspace",
        },
      },
      update: {
        connected: true,
        connectedAt: new Date(),
        // El token se guarda cifrado DENTRO de credentials (el modelo no tiene campo accessToken separado)
        credentials: {
          accessToken: encryptedToken, // cifrado AES-256
          instagramUserId,
          username: profile.username ?? null,
          name: profile.name ?? null,
          profile: {
            username: profile.username,
            name: profile.name,
            picture: profile.picture,
          },
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      },
      create: {
        workspaceId: resolvedWorkspaceId,
        provider: providerName,
        userId: "workspace",
        connected: true,
        connectedAt: new Date(),
        credentials: {
          accessToken: encryptedToken, // cifrado AES-256
          instagramUserId,
          username: profile.username ?? null,
          name: profile.name ?? null,
          profile: {
            username: profile.username,
            name: profile.name,
            picture: profile.picture,
          },
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      },
    });

    logger.info("[IG DIRECT CALLBACK] Integration saved", {
      workspaceId: resolvedWorkspaceId,
      instagramUserId,
      username: profile.username,
      integrationId: integration.id,
    });

    // ── PASO 6: Sembrar el cache de assets para resolución de webhooks ──
    try {
      const { cacheAssetWorkspace } = await import("@/lib/inbox-store");
      await cacheAssetWorkspace(instagramUserId, "ig_account", resolvedWorkspaceId);
      logger.info("[IG DIRECT CALLBACK] Asset cache seeded", { instagramUserId });
    } catch (cacheErr) {
      logger.warn("[IG DIRECT CALLBACK] Asset cache seed failed (non-fatal):", cacheErr);
    }

    // ── PASO 6b: Suscribir webhooks de Instagram (automático, con retry) ────────
    // POST /me/subscribed_apps es REQUERIDO para que Meta envíe eventos al webhook.
    // Sin esta llamada, Instagram no enviará nada aunque el webhook esté configurado en Meta Developers.
    // Intentamos múltiples endpoints y actualizamos la DB con el resultado.
    {
      const subscribedFields = [
        "messages",
        "messaging_postbacks",
        "comments",
        "mentions",
        "story_insights",
        "message_reactions",
        "messaging_seen",
        "messaging_referral",
        "message_edit",
      ].join(",");

      const endpointsToTry = [
        // 1. Instagram Platform API (recomendado para Business Login)
        `https://graph.instagram.com/me/subscribed_apps`,
        // 2. Instagram Platform con user ID explícito
        `https://graph.instagram.com/${instagramUserId}/subscribed_apps`,
        // 3. Facebook Graph API con versión
        `https://graph.facebook.com/${env.META_API_VERSION}/me/subscribed_apps`,
        // 4. Facebook Graph API sin versión (legacy)
        `https://graph.facebook.com/me/subscribed_apps`,
      ];

      let subscriptionOk = false;
      let lastError: unknown = null;
      let successEndpoint: string | null = null;

      for (const endpoint of endpointsToTry) {
        try {
          const subBody = new URLSearchParams({
            access_token: longLivedToken,
            subscribed_fields: subscribedFields,
          });
          const subRes = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: subBody.toString(),
          });
          const subData = await subRes.json();

          if (subRes.ok && subData.success) {
            subscriptionOk = true;
            successEndpoint = endpoint;
            logger.info("[IG DIRECT CALLBACK] Webhook subscription activated", {
              instagramUserId,
              endpoint,
              fields: subscribedFields,
            });
            break;
          } else {
            lastError = subData;
            logger.warn("[IG DIRECT CALLBACK] Subscription endpoint failed, trying next", {
              instagramUserId,
              endpoint,
              error: subData?.error ?? subData,
            });
          }
        } catch (endpointErr) {
          lastError = endpointErr;
          logger.warn("[IG DIRECT CALLBACK] Subscription endpoint threw, trying next", {
            instagramUserId,
            endpoint,
            error: String(endpointErr),
          });
        }
      }

      // Actualizar la integración con el resultado de la suscripción (para diagnóstico)
      try {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            credentials: {
              accessToken: encryptedToken,
              instagramUserId,
              username: profile.username ?? null,
              name: profile.name ?? null,
              profile: {
                username: profile.username,
                name: profile.name,
                picture: profile.picture,
              },
              expiresAt: expiresAt?.toISOString() ?? null,
              webhookSubscribedAt: subscriptionOk ? new Date().toISOString() : null,
              webhookSubscriptionResult: subscriptionOk ? "success" : "failed",
              webhookSubscribedVia: successEndpoint,
              webhookSubscribedFields: subscriptionOk ? subscribedFields : null,
              webhookLastError: subscriptionOk ? null : JSON.stringify(lastError)?.slice(0, 500),
            },
          },
        });
      } catch (updateErr) {
        logger.warn("[IG DIRECT CALLBACK] Failed to persist subscription result (non-fatal):", updateErr);
      }

      if (!subscriptionOk) {
        logger.error("[IG DIRECT CALLBACK] ALL webhook subscription endpoints failed", {
          instagramUserId,
          igAppId,
          lastError,
          hint: "El token puede no tener permisos para suscribir webhooks, o la app no está configurada en Meta Developers.",
        });
        // NO abortar — la integración ya se guardó, el usuario puede reactivar desde la UI.
      }
    }

    // ── PASO 7: AuditLog ──
    await prisma.auditLog.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        userId,
        action: "integration.connected",
        resourceType: "Integration",
        resourceId: integration.id,
        details: { module: "instagram", username: profile.username, instagramUserId },
      },
    }).catch((err) => logger.warn("[IG DIRECT CALLBACK] AuditLog failed:", err));

    return NextResponse.redirect(`${baseUrl}/connect/done?module=instagram`);

  } catch (err) {
    logger.error("[IG DIRECT CALLBACK] Unhandled error:", err);
    return NextResponse.redirect(`${baseUrl}/connect/done?module=instagram&error=server_error`);
  }
}
