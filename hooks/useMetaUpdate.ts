import { useCallback, useState } from "react";

interface UpdateResult {
  success: boolean;
  error?: string;
}

export function useMetaUpdate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCampaign = useCallback(async (
    campaignId: string,
    fields: {
      name?: string;
      status?: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
      daily_budget?: number;
      lifetime_budget?: number;
      bid_strategy?: string;
      special_ad_categories?: string[];
    }
  ): Promise<UpdateResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...fields }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al actualizar campaña");
        return { success: false, error: json.error };
      }
      return { success: true };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAdSet = useCallback(async (
    adsetId: string,
    fields: {
      name?: string;
      status?: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
      daily_budget?: number;
      lifetime_budget?: number;
      bid_amount?: number;
      bid_strategy?: string;
      optimization_goal?: string;
      start_time?: string;
      end_time?: string;
      targeting?: object;
    }
  ): Promise<UpdateResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/adsets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adsetId, ...fields }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al actualizar conjunto");
        return { success: false, error: json.error };
      }
      return { success: true };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAd = useCallback(async (
    adId: string,
    fields: {
      name?: string;
      status?: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
      creative?: object;
      adAccountId?: string;
    }
  ): Promise<UpdateResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, ...fields }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al actualizar anuncio");
        return { success: false, error: json.error };
      }
      return { success: true };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateCampaign, updateAdSet, updateAd, loading, error };
}
