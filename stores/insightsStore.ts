import { create } from "zustand";

/**
 * Insights Cache Store
 *
 * Caches Meta Ads insights per project+preset to avoid re-fetching on every
 * page navigation. Data is preloaded on session init and served instantly
 * when the user visits a project page.
 *
 * Cache key format: "projectId:preset" or "projectId:dateStart:dateEnd"
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedInsights {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  data: any;
  fetchedAt: number;
}

// Goal → Meta action_type priority mapping (shared with project detail page)
export const GOAL_ACTION_MAP: Record<string, string[]> = {
  // Explicit goals (new naming)
  "Conversaciones (WhatsApp / Messenger)": ["onsite_conversion.messaging_conversation_started_7d"],
  "Leads (Formulario Meta)": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "onsite_conversion.lead_grouped", "onsite_conversion.lead", "omni_lead"],
  "Leads (Sitio Web / Pixel)": ["offsite_conversion.fb_pixel_lead", "lead", "omni_lead"],
  "Leads (Todas las fuentes)": ["onsite_conversion.flow_complete", "lead", "leadgen", "leadgen_grouped", "omni_lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"],
  "Ventas (Sitio Web)": ["offsite_conversion.fb_pixel_purchase"],
  "Ventas (Todas las fuentes)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
  // Legacy goals
  "Conversaciones": ["onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply"],
  "Leads": ["onsite_conversion.flow_complete", "lead", "leadgen_grouped", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "omni_lead"],
  "Ventas (Purchase)": ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
  "Registros": ["complete_registration", "omni_complete_registration", "offsite_conversion.fb_pixel_complete_registration"],
  "Clics al sitio": ["link_click", "landing_page_view"],
  "Descargas app": ["app_install", "omni_app_install"],
  "Video views": ["video_view"],
  "Alcance (Reach)": ["reach"],
  "Seguidores": ["page_engagement", "like"],
  "Tráfico a tienda": ["store_visit"],
};


const RESULT_TYPES_FALLBACK = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.flow_complete",
  "lead", "purchase", "complete_registration",
  "omni_purchase", "offsite_conversion", "onsite_conversion",
  "app_install", "landing_page_view", "link_click",
];

/** Find the best result action from an actions array using goal-aware matching */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function findResultAction(actions: any[] | undefined, goal?: string): any | null {
  if (!actions?.length) return null;
  // 1. If we know the goal AND it has a specific map, use ONLY those types
  if (goal && GOAL_ACTION_MAP[goal]) {
    for (const t of GOAL_ACTION_MAP[goal]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const exact = actions.find((a: any) => a.action_type === t);
      if (exact) return exact;
    }
    // Goal has explicit map but no matching action found — return null (0 results)
    // NEVER fall through to generic fallback, which would pick page_engagement/link_click
    return null;
  }
  // 2. No explicit goal: try common result types
  for (const t of RESULT_TYPES_FALLBACK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const exact = actions.find((a: any) => a.action_type === t);
    if (exact) return exact;
  }
  // 3. Last resort when no goal: substring match
  for (const t of RESULT_TYPES_FALLBACK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const partial = actions.find((a: any) => a.action_type?.includes(t));
    if (partial) return partial;
  }
  return null;
}

/** Count total results from a timeSeries array using goal-aware matching */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function countResultsFromTimeSeries(timeSeries: any[], goal?: string): number {
  let total = 0;
  if (!timeSeries?.length) return 0;
  for (const day of timeSeries) {
    const action = findResultAction(day.actions, goal);
    if (action) total += parseInt(action.value || "0", 10);
  }
  return total;
}

interface InsightsState {
  cache: Record<string, CachedInsights>;
  preloading: boolean;
  preloaded: boolean;

  /** Build cache key from project ID and date params */
  buildKey: (projectId: string, preset?: string, dateStart?: string, dateEnd?: string, platformId?: string) => string;

  /** Get cached insights (returns null if expired or missing) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  getCached: (projectId: string, preset?: string, dateStart?: string, dateEnd?: string, platformId?: string) => any | null;

  /** Fetch and cache insights for a single project's ad accounts */
  fetchProjectInsights: (
    projectId: string,
    adAccounts: string[],
    preset?: string,
    dateStart?: string,
    dateEnd?: string,
    platformId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  ) => Promise<any>;

  /** Preload insights for ALL active projects (called on login) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  preloadAll: (projects: any[]) => Promise<void>;

  /** Invalidate cache for a specific project */
  invalidate: (projectId: string) => void;

  /** Invalidate all cache */
  invalidateAll: () => void;
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
  cache: {},
  preloading: false,
  preloaded: false,

  buildKey: (projectId, preset, dateStart, dateEnd, platformId = "meta") => {
    if (dateStart && dateEnd) return `${projectId}:${platformId}:${dateStart}:${dateEnd}`;
    return `${projectId}:${platformId}:${preset || "this_month"}`;
  },

  getCached: (projectId, preset, dateStart, dateEnd, platformId = "meta") => {
    const key = get().buildKey(projectId, preset, dateStart, dateEnd, platformId);
    const entry = get().cache[key];
    if (!entry) return null;
    // Check TTL
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  },

  fetchProjectInsights: async (projectId, adAccounts, preset, dateStart, dateEnd, platformId = "meta") => {
    if (!adAccounts?.length) return null;

    // Check cache first
    const cached = get().getCached(projectId, preset, dateStart, dateEnd);
    if (cached) return cached;

    // Build date params
    let dp = "";
    if (dateStart && dateEnd) dp = `&dateStart=${dateStart}&dateEnd=${dateEnd}`;
    else if (preset && preset !== "custom") dp = `&preset=${preset || "this_month"}`;

    // Fetch ALL accounts in parallel
    const accs = adAccounts.map(a => a.startsWith("act_") ? a : `act_${a}`);

    try {
      const endpoint = platformId === "google" ? "/api/google/insights" : "/api/meta/insights";
      const results = await Promise.all(
        accs.map(accId =>
          fetch(`${endpoint}?adAccountId=${accId}${dp}`)
            .then(r => r.json())
            .catch(() => null)
        )
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const valid = results.filter(Boolean).filter((r: any) => !r.error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const merged: any = { timeSeries: [], campaigns: [], adsets: [], ads: [] };
      if (valid.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        const errResult = results.find((r: any) => r && r.error);
        merged._error = errResult ? errResult.error : "No data";
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        valid.forEach((r: any) => {
          const payload = r.data && Array.isArray(r.data.timeSeries) ? r.data : r;
          Object.keys(merged).forEach(k => {
            if (payload[k] && Array.isArray(payload[k])) {
              merged[k].push(...payload[k]);
            }
          });
        });
      }

      // Store in cache
      const key = get().buildKey(projectId, preset, dateStart, dateEnd, platformId);
      set(state => ({
        cache: {
          ...state.cache,
          [key]: { data: merged, fetchedAt: Date.now() },
        },
      }));

      return merged;
    } catch (err) {
      console.error(`[InsightsStore] Failed to fetch for project ${projectId}:`, err);
      return null;
    }
  },

  preloadAll: async (projects) => {
    if (get().preloading) return;
    set({ preloading: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const activeProjects = projects.filter((p: any) => p.status === "EN VUELO" || p.status === "EN ÓRBITA" || p.status === "Activo");
    if (activeProjects.length === 0) {
      set({ preloading: false, preloaded: true });
      return;
    }

    // Extract ad accounts from each project's channels
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const fetchPromises = activeProjects.map(async (p: any) => {
      // Find Meta channel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const metaCh = p.channels?.find((c: any) => {
        const cfg = (typeof c.config === "string" ? JSON.parse(c.config) : c.config) || {};
        return cfg?.platformId === "meta" || cfg?.platformId === "facebook"
          || (c.name || "").toLowerCase().includes("meta")
          || (c.type || "").toLowerCase().includes("facebook");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      }) || p.channels?.find((c: any) => {
        const cfg = (typeof c.config === "string" ? JSON.parse(c.config) : c.config) || {};
        return cfg?.adAccounts?.length > 0;
      });

      if (!metaCh) return;
      const cfg = (typeof metaCh.config === "string" ? JSON.parse(metaCh.config) : metaCh.config) || {};
      if (!cfg.adAccounts?.length) return;

      // Fetch with "this_month" preset (default view)
      await get().fetchProjectInsights(p.id, cfg.adAccounts, "this_month");
    });

    await Promise.allSettled(fetchPromises);
    set({ preloading: false, preloaded: true });
  },

  invalidate: (projectId) => {
    set(state => {
      const newCache = { ...state.cache };
      // Remove all entries for this project
      Object.keys(newCache).forEach(key => {
        if (key.startsWith(`${projectId}:`)) delete newCache[key];
      });
      return { cache: newCache };
    });
  },

  invalidateAll: () => {
    set({ cache: {}, preloaded: false });
  },
}));
