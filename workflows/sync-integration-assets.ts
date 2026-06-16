import { sleep } from "workflow";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { botmakerFetch } from "@/lib/botmaker";
import { env } from "@/lib/env";

/** Versión centralizada de la Graph API (default v25.0 en lib/env.ts). */
const META_GRAPH_VERSION = env.META_API_VERSION;

/**
 * Workflow asíncrono para mantener sincronizados los activos de las integraciones 
 * (Cuentas Publicitarias, Páginas, Bots) sin bloquear la interfaz del usuario.
 */
export async function syncIntegrationAssetsWorkflow(integrationId: string) {
  "use workflow";

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

  const token = decryptToken(integration.credentials as any);
  if (!token) {
    return { status: "failed", reason: "Could not decrypt token" };
  }

  try {
    if (integration.provider.startsWith("meta")) {
      await syncMetaAssets(integration, token);
    } else if (integration.provider === "botmaker") {
      await syncBotmakerAssets(integration, token);
    } else if (integration.provider === "google") {
      await syncGoogleAssets(integration, token);
    }
    
    return { status: "success", timestamp: new Date().toISOString() };
  } catch (error: any) {
    // Si Meta devuelve un Rate Limit (código 4, 17 o 32), podemos pausar el workflow
    if (error.message?.includes("limit reached") || error.code === 4 || error.code === 17) {
      console.warn(`Rate limit alcanzado para integración ${integrationId}. Reintentando en 30m...`);
      // Vercel Workflow manejará el Error reintentando con backoff exponencial 
      // de acuerdo a la configuración del SDK.
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    throw error;
  }
}

async function syncMetaAssets(integration: any, token: string) {
  // 1. Sincronizar Páginas (Pages)
  const pagesRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,access_token,category,instagram_business_account&access_token=${token}`);
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

    // Si tiene cuenta de IG, también la cacheamos
    if (page.instagram_business_account) {
      await prisma.integrationAssetCache.upsert({
        where: {
          integrationId_assetType_externalId: {
            integrationId: integration.id,
            assetType: "ig_account",
            externalId: page.instagram_business_account.id,
          }
        },
        update: { name: `IG - ${page.name}`, syncedAt: new Date(), metadata: {} },
        create: {
          integrationId: integration.id,
          workspaceId: integration.workspaceId,
          provider: "meta",
          assetType: "ig_account",
          externalId: page.instagram_business_account.id,
          name: `IG - ${page.name}`,
          metadata: {}
        }
      });
    }
  }

  // 2. Sincronizar Cuentas Publicitarias (Ad Accounts)
  const adRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status,amount_spent,currency&access_token=${token}`);
  if (adRes.ok) {
    const adData = await adRes.json();
    for (const adAcc of adData.data) {
      await prisma.integrationAssetCache.upsert({
        where: {
          integrationId_assetType_externalId: {
            integrationId: integration.id,
            assetType: "ad_account",
            externalId: adAcc.id,
          }
        },
        update: {
          name: adAcc.name || adAcc.id,
          metadata: { status: adAcc.account_status, spend: adAcc.amount_spent, currency: adAcc.currency },
          syncedAt: new Date()
        },
        create: {
          integrationId: integration.id,
          workspaceId: integration.workspaceId,
          provider: "meta",
          assetType: "ad_account",
          externalId: adAcc.id,
          name: adAcc.name || adAcc.id,
          metadata: { status: adAcc.account_status, spend: adAcc.amount_spent, currency: adAcc.currency }
        }
      });
      
      // EXTRACCIÓN PROFUNDA: Descargar datos reales de Anuncios
      await syncDeepMetaAdsData(adAcc.id, token);
    }
  }
}

async function fetchPaginated(url: string, token: string): Promise<any[]> {
  let results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err: any = await res.json().catch(()=>({}));
      throw err;
    }
    const data: any = await res.json();
    results = results.concat(data.data || []);
    nextUrl = data.paging?.next || null;
    
    // Pausa para evitar rate limits
    if (nextUrl) await sleep("2s"); 
  }
  return results;
}

async function syncDeepMetaAdsData(adAccountId: string, token: string) {
  const version = META_GRAPH_VERSION;
  const datePreset = "last_30d";
  const cacheKey = "last_30d";

  try {
    // CAMPAIGNS
    const campaignsFields = "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,bid_strategy,special_ad_categories,buying_type,smart_promotion_type,start_time,stop_time,created_time,updated_time";
    const campaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/campaigns?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${campaignsFields}&limit=50`;
    const campaigns = await fetchPaginated(campaignsUrl, token);

    const insightsCampaignsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?date_preset=${datePreset}&level=campaign&fields=campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_3_sec_watched_actions,video_thruplay_watched_actions,outbound_clicks&limit=50`;
    const insightsCamp = await fetchPaginated(insightsCampaignsUrl, token);
    
    const insightsMapC = new Map(insightsCamp.map((item: any) => [item.campaign_id, item]));
    const mergedCampaigns = campaigns.map((campaign: any) => ({
      ...campaign,
      insights: insightsMapC.get(campaign.id) || {}
    }));

    await prisma.metaAdsCache.upsert({
      where: { adAccountId_level_dateRange: { adAccountId, level: "campaigns", dateRange: cacheKey } },
      update: { data: mergedCampaigns, updatedAt: new Date() },
      create: { adAccountId, level: "campaigns", dateRange: cacheKey, data: mergedCampaigns }
    });

    // ADSETS
    const adsetsFields = "id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,budget_remaining,optimization_goal,billing_event,bid_amount,bid_strategy,start_time,end_time,created_time,updated_time,targeting";
    const adsetsUrl = `https://graph.facebook.com/${version}/${adAccountId}/adsets?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${adsetsFields}&limit=50`;
    const adsets = await fetchPaginated(adsetsUrl, token);

    const insightsAdsetsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?date_preset=${datePreset}&level=adset&fields=adset_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_3_sec_watched_actions,video_thruplay_watched_actions,outbound_clicks&limit=50`;
    const insightsAdset = await fetchPaginated(insightsAdsetsUrl, token);

    const insightsMapS = new Map(insightsAdset.map((item: any) => [item.adset_id, item]));
    const mergedAdsets = adsets.map((adset: any) => ({
      ...adset,
      insights: insightsMapS.get(adset.id) || {}
    }));

    await prisma.metaAdsCache.upsert({
      where: { adAccountId_level_dateRange: { adAccountId, level: "adsets", dateRange: cacheKey } },
      update: { data: mergedAdsets, updatedAt: new Date() },
      create: { adAccountId, level: "adsets", dateRange: cacheKey, data: mergedAdsets }
    });

    // ADS
    const creativeFields = "id,name,thumbnail_url,image_url,title,body,object_story_spec,call_to_action_type,effective_object_story_id,image_hash";
    const adsFields = `id,name,status,effective_status,adset_id,campaign_id,creative{${creativeFields}}`;
    const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&fields=${adsFields}&limit=50`;
    const ads = await fetchPaginated(adsUrl, token);

    const insightsAdsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?date_preset=${datePreset}&level=ad&fields=ad_id,spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas,website_purchase_roas,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_3_sec_watched_actions,video_thruplay_watched_actions,outbound_clicks&limit=50`;
    const insightsAd = await fetchPaginated(insightsAdsUrl, token);

    const insightsMapA = new Map(insightsAd.map((item: any) => [item.ad_id, item]));
    const mergedAds = ads.map((ad: any) => ({
      ...ad,
      insights: insightsMapA.get(ad.id) || {}
    }));

    await prisma.metaAdsCache.upsert({
      where: { adAccountId_level_dateRange: { adAccountId, level: "ads", dateRange: cacheKey } },
      update: { data: mergedAds, updatedAt: new Date() },
      create: { adAccountId, level: "ads", dateRange: cacheKey, data: mergedAds }
    });

  } catch (error) {
    console.error(`Error in deep sync for adAccountId ${adAccountId}:`, error);
    throw error;
  }
}


async function syncBotmakerAssets(integration: any, token: string) {
  // Sincronizar Canales de Botmaker (WhatsApp, Messenger, etc.)
  try {
    const res = await botmakerFetch("/channels", token);
    // Suponemos que retorna un arreglo de canales
    if (res && Array.isArray(res)) {
      for (const channel of res) {
        await prisma.integrationAssetCache.upsert({
          where: {
            integrationId_assetType_externalId: {
              integrationId: integration.id,
              assetType: "bot",
              externalId: channel.id || channel.channelId,
            }
          },
          update: {
            name: channel.name || `${channel.platform} Bot`,
            metadata: { platform: channel.platform, phoneNumber: channel.phoneNumber },
            syncedAt: new Date()
          },
          create: {
            integrationId: integration.id,
            workspaceId: integration.workspaceId,
            provider: "botmaker",
            assetType: "bot",
            externalId: channel.id || channel.channelId,
            name: channel.name || `${channel.platform} Bot`,
            metadata: { platform: channel.platform, phoneNumber: channel.phoneNumber }
          }
        });
      }
    }
  } catch (error) {
    console.error("Error fetching Botmaker channels for sync:", error);
  }
}

async function syncGoogleAssets(integration: any, token: string) {
  // TODO: Implementar lógica de caché de métricas de Google Ads una vez que se defina la estructura de la API.
  // Por ahora loggeamos para trazabilidad.
  console.log(`[Google Sync] Pending implementation for integration: ${integration.id}`);
}

