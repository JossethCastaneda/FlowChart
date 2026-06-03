"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-orange-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2 font-orbitron tracking-wide">Error Crítico Detectado</h2>
          <p className="text-[13px] text-slate-400 mb-6 leading-relaxed">
            Algo salió mal al cargar esta sección. Hemos registrado el error para investigarlo. 
            Puedes intentar recargar la página o volver al inicio.
          </p>

          <div className="w-full p-3 bg-black/40 border border-white/5 rounded-lg mb-8 overflow-hidden text-left">
            <p className="text-[11px] font-mono text-red-300/80 break-words line-clamp-3">
              {error.message || "Error desconocido en el renderizado."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => reset()}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reintentar
            </button>
            <Link 
              href="/dashboard/resumen"
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--cyan)] hover:bg-[#00b8e6] text-black py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Home className="w-4 h-4" />
              Ir al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
