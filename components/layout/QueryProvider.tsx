"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Sodare Stateless Cache Defaults
            staleTime: 1000 * 60 * 5, // 5 minutos de caché antes de considerar los datos "viejos"
            gcTime: 1000 * 60 * 30,    // Mantener en memoria por 30 minutos
            refetchOnWindowFocus: false, // No recargar al cambiar de pestaña (evita spam a Meta)
            retry: 1, // Solo reintentar una vez si falla la Graph API
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
