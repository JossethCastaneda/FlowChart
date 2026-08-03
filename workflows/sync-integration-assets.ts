import { sleep } from "workflow";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { env } from "@/lib/env";
import { metaFetch } from "@/lib/server-auth";
import { logger } from "@/lib/logger";
import { getAdsCampaigns } from "@/lib/integrations/google/google-ads";

/** Versión centralizada de la Graph API (default v25.0 en lib/env.ts). */
const META_GRAPH_VERSION = env.META_API_VERSION;

/**
 * Workflow asíncrono para mantener sincronizados los activos de las integraciones
 * (Cuentas Publicitarias, Páginas) sin bloquear la interfaz del usuario.
 */
export async function syncIntegrationAssetsWorkflow(integrationId: string, delaySeconds: number = 0) {
  "use workflow";

  if (delaySeconds > 0) {
    await sleep(`${delaySeconds}s`);
  }

  // Este step aislado maneja la lógica y posibles reintentos ante Rate Limits
  const result = await executeSyncStep(integrationId);
  return result;
}

async function executeSyncStep(integrationId: string) {
  "use step";

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || !integration.connected) {
    return { status: "skipped", reason: "Integration not found or not connected" };
  }

  // credentials es un objeto { accessToken: "enc:…", pages, … }; decryptToken
  // exige el string cifrado, no el objeto completo.
  const encryptedToken = (integration.credentials as { accessToken?: string } | null)?.accessToken;
  let token: string;
  try {
    token = decryptToken(encryptedToken);
  } catch {
    return { status: "failed", reason: "Could not decrypt token" };
  }
  if (!token) {
    return { status: "failed", reason: "Could not decrypt token" };
  }

  try {
    if (integration.provider.startsWith("meta")) {
      await syncMetaAssets(integration, token);
    } else if (integration.provider === "google") {
      await syncGoogleAssets(integration, token);
    }

    return { status: "success", timestamp: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (error: any) {
    // Si Meta devuelve un Rate Limit (código 4, 17 o 32), podemos pausar el workflow
    if (error.message?.includes("limit reached") || error.code === 4 || error.code === 17) {
      logger.warn("[SYNC-ASSETS] Rate limit alcanzado, reintentando", { integrationId });
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
async function syncMetaAssets(integration: any, token: string) {
  // 1. Sincronizar Páginas (Pages)
  const pagesRes = await metaFetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,category,instagram_business_account`, token);
  if (!pagesRes.ok) throw await pagesRes.json();
  const pagesData = await pagesRes.json();

  for (const page of pagesData.data) {
    await prisma.integrationAssetCache.upsert({
      where: {
        integrationId_assetType_externalId: {
          integrationId: integration.id,
          assetType: "page",
          externalId: page.id,
        }
      },
      update: {
        name: page.name,
        metadata: { category: page.category, instagram_business_account: page.instagram_business_account },
        syncedAt: new Date()
      },
      create: {
        integrationId: integration.id,
        workspaceId: integration.workspaceId,
        provider: "meta",
        assetType: "page",
        externalId: page.id,
        name: page.name,
        metadata: { category: page.category, instagram_business_account: page.instagram_business_account }
      }
    });

    // ── FIX: también persistir la cuenta IG vinculada como assetType "ig_account" ──
    // resolveWorkspaceForMetaAsset(igId, "ig_account") falla en cache-miss si no
    // está aquí. Sin esto los webhooks de IG DM se descartan silenciosamente.
    const igId = page.instagram_business_account?.id;
    if (igId) {
      await prisma.integrationAssetCache.upsert({
        where: {
          integrationId_assetType_externalId: {
            integrationId: integration.id,
            assetType: "ig_account",
            externalId: igId,
          }
        },
        update: {
          name: page.name, // nombre de la página FB vinculada como referencia
          metadata: { linkedPageId: page.id, linkedPageName: page.name },
          syncedAt: new Date()
        },
        create: {
          integrationId: integration.id,
          workspaceId: integration.workspaceId,
          provider: "meta",
          assetType: "ig_account",
          externalId: igId,
          name: page.name,
          metadata: { linkedPageId: page.id, linkedPageName: page.name }
        }
      });
    }
  }

  // 2. Sincronizar Cuentas Publicitarias
  const adAccountsRes = await metaFetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,balance`, token);
  if (!adAccountsRes.ok) throw await adAccountsRes.json();
  const adAccountsData = await adAccountsRes.json();

  for (const adAccount of adAccountsData.data) {
    await prisma.integrationAssetCache.upsert({
      where: {
        integrationId_assetType_externalId: {
          integrationId: integration.id,
          assetType: "ad_account",
          externalId: adAccount.id,
        }
      },
      update: {
        name: adAccount.name,
        metadata: {
          account_status: adAccount.account_status,
          currency: adAccount.currency,
          timezone_name: adAccount.timezone_name,
          amount_spent: adAccount.amount_spent,
          balance: adAccount.balance
        },
        syncedAt: new Date()
      },
      create: {
        integrationId: integration.id,
        workspaceId: integration.workspaceId,
        provider: "meta",
        assetType: "ad_account",
        externalId: adAccount.id,
        name: adAccount.name,
        metadata: {
          account_status: adAccount.account_status,
          currency: adAccount.currency,
          timezone_name: adAccount.timezone_name,
          amount_spent: adAccount.amount_spent,
          balance: adAccount.balance
        }
      }
    });

    // Sincronizar datos profundos de ads (campañas, adsets, ads) en segundo plano
    try {
      await syncDeepMetaAdsData(adAccount.id, token, integration.workspaceId);
    } catch (error) {
      logger.error("[SYNC-ASSETS] Error precalculando analytics", { workspaceId: integration.workspaceId, adAccountId: adAccount.id, error });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
async function fetchPaginated(url: string, token: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  let results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res = await metaFetch(nextUrl, token);
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const err: any = await res.json().catch(() => ({}));
      throw err;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const data: any = await res.json();
    results = results.concat(data.data || []);
    nextUrl = data.paging?.next || null;

    // Pausa para evitar rate limits. IMPORTANTE: esto corre dentro de un "use step"
    // (executeSyncStep), NO en el contexto del workflow, así que sleep() de WDK lanzaría
    // "sleep() can only be called in a workflow". Usar un delay normal de Node.
    if (nextUrl) await new Promise((r) => setTimeout(r, 2000));
  }
  return results;
}

async function syncDeepMetaAdsData(adAccountId: string, token: string, workspaceId: string) {
  const version = META_GRAPH_VERSION;
  const datePreset = "last_30d";
  const cacheKey = "last_30d";

  try {
    // CAMPAIGNS
    const campaignsFields = "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,bid_strategy,special_ad_categories,buying_type,smart_promotion_type,start_time,stop_time,created_time,updated_time";
    const campaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/campaigns?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${campaignsFields}&limit=50`;
    const campaigns = await fetchPaginated(campaignsUrl, token);

    const insightsCampaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?date_preset=${datePreset}&level=campaign&fields=campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,outbound_clicks&limit=50`;
    const insightsCamp = await fetchPaginated(insightsCampaignsUrl, token);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const insightsMapC = new Map(insightsCamp.map((item: any) => [item.campaign_id, item]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const mergedCampaigns = campaigns.map((campaign: any) => {
      const insight = insightsMapC.get(campaign.id) || {};
      return {
        ...campaign,
        insights: {
          ...insight,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
          video_3_sec_watched_actions: (insight.actions || []).filter((a: any) => a.action_type === "video_view")
        }
      };
    });

    await prisma.metaAdsCache.upsert({
      where: { workspaceId_adAccountId_level_dateRange: { workspaceId, adAccountId, level: "campaigns", dateRange: cacheKey } },
      update: { data: mergedCampaigns, updatedAt: new Date() },
      create: { workspaceId, adAccountId, level: "campaigns", dateRange: cacheKey, data: mergedCampaigns }
    });

    // ADSETS
    const adsetsFields = "id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,budget_remaining,optimization_goal,billing_event,bid_amount,bid_strategy,start_time,end_time,created_time,updated_time,targeting";
    const adsetsUrl = `https://graph.facebook.com/${version}/${adAccountId}/adsets?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${adsetsFields}&limit=50`;
    const adsets = await fetchPaginated(adsetsUrl, token);

    const insightsAdsetsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?date_preset=${datePreset}&level=adset&fields=adset_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,outbound_clicks&limit=50`;
    const insightsAdset = await fetchPaginated(insightsAdsetsUrl, token);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const insightsMapS = new Map(insightsAdset.map((item: any) => [item.adset_id, item]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const mergedAdsets = adsets.map((adset: any) => {
      const insight = insightsMapS.get(adset.id) || {};
      return {
        ...adset,
        insights: {
          ...insight,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
          video_3_sec_watched_actions: (insight.actions || []).filter((a: any) => a.action_type === "video_view")
        }
      };
    });

    await prisma.metaAdsCache.upsert({
      where: { workspaceId_adAccountId_level_dateRange: { workspaceId, adAccountId, level: "adsets", dateRange: cacheKey } },
      update: { data: mergedAdsets, updatedAt: new Date() },
      create: { workspaceId, adAccountId, level: "adsets", dateRange: cacheKey, data: mergedAdsets }
    });

    // ADS
    const creativeFields = "id,name,thumbnail_url,image_url,title,body,object_story_spec,call_to_action_type,effective_object_story_id,image_hash";
    const adsFields = `id,name,status,effective_status,adset_id,campaign_id,creative{${creativeFields}}`;
    const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${adsFields}&limit=50`;
    const ads = await fetchPaginated(adsUrl, token);

    const insightsAdsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?date_preset=${datePreset}&level=ad&fields=ad_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,outbound_clicks&limit=50`;
    const insightsAd = await fetchPaginated(insightsAdsUrl, token);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const insightsMapA = new Map(insightsAd.map((item: any) => [item.ad_id, item]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const mergedAds = ads.map((ad: any) => {
      const insight = insightsMapA.get(ad.id) || {};
      return {
        ...ad,
        insights: {
          ...insight,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
          video_3_sec_watched_actions: (insight.actions || []).filter((a: any) => a.action_type === "video_view")
        }
      };
    });

    await prisma.metaAdsCache.upsert({
      where: { workspaceId_adAccountId_level_dateRange: { workspaceId, adAccountId, level: "ads", dateRange: cacheKey } },
      update: { data: mergedAds, updatedAt: new Date() },
      create: { workspaceId, adAccountId, level: "ads", dateRange: cacheKey, data: mergedAds }
    });

  } catch (error) {
    logger.error("[SYNC-ASSETS] Error en deep sync", { adAccountId, error });
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- TODO: Limpieza de deuda técnica
async function syncGoogleAssets(integration: any, _token: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const creds = integration.credentials as any;
    const customerId = creds?.resources?.google_ads?.customerId;

    if (!customerId) {
      return; // No Ads account connected
    }

    const { campaigns } = await getAdsCampaigns(integration.workspaceId);
    
    // Guardar en GoogleAdsCache
    const cacheKey = "last_30d"; // O el default de getAdsCampaigns
    
    await prisma.googleAdsCache.upsert({
      where: { 
        workspaceId_customerId_level_dateRange: { 
          workspaceId: integration.workspaceId, 
          customerId, 
          level: "campaigns", 
          dateRange: cacheKey 
        } 
      },
      update: { data: campaigns, updatedAt: new Date() },
      create: { 
        workspaceId: integration.workspaceId, 
        customerId, 
        level: "campaigns", 
        dateRange: cacheKey, 
        data: campaigns 
      }
    });

    logger.info("[SYNC-ASSETS] Google Ads cache updated", { workspaceId: integration.workspaceId, customerId });
  } catch (error) {
    logger.error("[SYNC-ASSETS] Error syncGoogleAssets", { workspaceId: integration.workspaceId, error });
  }
}
