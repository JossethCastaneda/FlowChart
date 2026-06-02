"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useInsightsStore } from "@/stores/insightsStore";

/**
 * Preloads Meta Ads insights for all active projects once the user is authenticated.
 * Runs once per session — data is cached in the Zustand store.
 */
function InsightsPreloader() {
  const { data: session, status } = useSession();
  const { preloaded, preloading, preloadAll } = useInsightsStore();

  useEffect(() => {
    // Only preload when authenticated and not already done
    if (status !== "authenticated" || preloaded || preloading) return;

    // Fetch projects list and then preload insights
    fetch("/api/projects")
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.length > 0) {
          preloadAll(res.data);
        }
      })
      .catch(err => console.error("[InsightsPreloader] Failed to fetch projects:", err));
  }, [status, preloaded, preloading, preloadAll]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InsightsPreloader />
      {children}
    </SessionProvider>
  );
}
