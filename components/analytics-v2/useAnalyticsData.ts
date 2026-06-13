"use client";

import { useState, useEffect } from "react";

export interface AnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook genérico de carga para los dashboards. El estado solo se actualiza dentro
 * de callbacks asíncronos (no de forma síncrona en el cuerpo del efecto), para
 * cumplir react-hooks/set-state-in-effect y evitar renders en cascada.
 * Para forzar refetch, varía `query` (p. ej. agregando un nonce).
 */
export function useAnalyticsData<T>(endpoint: string | null, query: string): AnalyticsState<T> {
  const [state, setState] = useState<AnalyticsState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    fetch(`${endpoint}?${query}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) setState({ data: j.data as T, loading: false, error: null });
        else setState({ data: null, loading: false, error: j.error || "Error cargando datos" });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: "Error de red" });
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, query]);

  return state;
}
