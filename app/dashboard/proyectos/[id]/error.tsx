"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProjectError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-full max-w-lg bg-[var(--surface)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5 border border-amber-500/20">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2 tracking-wide">Error al cargar el proyecto</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mb-6 leading-relaxed">
            Se produjo un error al procesar o descargar los datos de este proyecto. 
            Esto puede deberse a una configuración incompleta o a un fallo temporal de conexión con las APIs.
          </p>

          <div className="w-full p-3 bg-[var(--panel-bg)]  border border-[var(--hairline)] rounded-lg mb-8 overflow-hidden text-left">
            <p className="text-[11px] font-mono text-amber-300/80 break-words line-clamp-3">
              {error.message || "Error desconocido al procesar la información del proyecto."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full">
            <Link 
              href="/dashboard/proyectos"
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--surface-hover)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Proyectos
            </Link>
            <button
              onClick={() => reset()}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
