/**
 * hooks/use-plan-limit.ts
 * =====================================================================
 * Client-side hook for checking plan limits and usage.
 * No external dependencies — uses native fetch + useEffect.
 *
 * Usage:
 *   const { used, limit, remaining, exceeded, plan, loading } = usePlanLimit("projects");
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { PLAN_LIMITS, PLAN_LABELS, resolvePlan, UNLIMITED } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/plan-limits";

interface WorkspaceUsage {
  plan: PlanId;
  projects: number;
  members: number;
  integrations: number;
  scheduledPosts: number;
}

// Simple module-level cache (30s TTL) to avoid repeated fetches
let cachedUsage: WorkspaceUsage | null = null;
let cacheExpiry = 0;
const listeners = new Set<() => void>();

async function fetchUsage(): Promise<WorkspaceUsage | null> {
  if (cachedUsage && Date.now() < cacheExpiry) return cachedUsage;
  try {
    const res = await fetch("/api/workspace/usage", { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data ?? json;
    cachedUsage = data as WorkspaceUsage;
    cacheExpiry = Date.now() + 30_000;
    listeners.forEach((fn) => fn());
    return cachedUsage;
  } catch {
    return null;
  }
}

/**
 * Fetches the current workspace usage from the server and returns
 * limit-check values for a specific feature.
 */
export function usePlanLimit(feature: keyof typeof PLAN_LIMITS["free"]) {
  const [data, setData] = useState<WorkspaceUsage | null>(cachedUsage);
  const [loading, setLoading] = useState(!cachedUsage);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Subscribe to shared cache updates
    const onUpdate = () => {
      if (mounted.current) setData(cachedUsage);
    };
    listeners.add(onUpdate);

    if (!cachedUsage || Date.now() >= cacheExpiry) {
      fetchUsage().then((result) => {
        if (mounted.current) {
          setData(result);
          setLoading(false);
        }
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
      setLoading(false);
    }

    return () => {
      mounted.current = false;
      listeners.delete(onUpdate);
    };
  }, []);

  if (loading || !data) {
    return {
      plan: "free" as PlanId,
      planLabel: PLAN_LABELS["free"],
      used: 0,
      limit: PLAN_LIMITS["free"][feature] as number,
      remaining: PLAN_LIMITS["free"][feature] as number,
      exceeded: false,
      pct: 0,
      isUnlimited: false,
      loading: true,
      error: null,
    };
  }

  const plan = resolvePlan(data.plan);
  const limit = PLAN_LIMITS[plan][feature] as number;
  const used = (data[feature as keyof WorkspaceUsage] as number) ?? 0;
  const remaining = Math.max(0, limit - used);
  const exceeded = used >= limit;
  const isUnlimited = limit >= UNLIMITED;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    used,
    limit,
    remaining,
    exceeded,
    pct,
    isUnlimited,
    loading: false,
    error: null,
  };
}
