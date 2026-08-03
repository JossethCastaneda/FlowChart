"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { Loader2, Calendar, Target, CheckCircle2, TrendingUp, Sparkles, Building2, LayoutDashboard } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { PageHeader } from "@/components/ui/PageHeader";
import { Orbi } from "@/components/ui/Orbi";

interface PublicProject {
  id: string;
  name: string;
  client: string | null;
  status: string;
  dateStart: string | null;
  dateEnd: string | null;
  workspace: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    branding: any;
  };
  stats: {
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
  recentTasks: {
    id: string;
    title: string;
    status: string;
    updatedAt: string;
  }[];
}

export default function PublicProjectPortal() {
  const { token } = useParams();
  const [data, setData] = useState<PublicProject | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/project/${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.data) setError(res.error || "Portal no encontrado");
        else setData(res.data);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-6">
        <Orbi state="working" scale={0.8} />
        <p style={{ color: "var(--cyan)", fontFamily: "var(--font-display)", letterSpacing: "0.1em", fontSize: "14px" }}>CARGANDO PORTAL...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Target className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Enlace expirado o inválido</h1>
        <p className="text-[var(--text-secondary)]">Este enlace mágico ya no es válido o el proyecto fue removido.</p>
      </div>
    );
  }

  const { branding } = data.workspace;
  const brandColor = branding.accentColor || "var(--cyan)";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-secondary)] overflow-x-hidden selection:bg-[var(--cyan)]/30 relative">
      {/* Abstract Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-r from-[rgba(59,130,246,0.03)] to-transparent blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-l from-[rgba(139,92,246,0.03)] to-transparent blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8">
        
        {/* Header / Branding */}
        <div className="flex items-center justify-between pb-6 border-b border-[var(--hairline)]">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- TODO: Deuda técnica
              <img src={branding.logoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            )}
            <span className="font-semibold text-sm tracking-wide text-[var(--text-secondary)]">
              {branding.displayName || data.workspace.name}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-medium text-emerald-400 tracking-wider uppercase">Portal Activo</span>
          </div>
        </div>

        {/* Project Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-secondary)] mb-4 font-medium">
              <Sparkles className="w-3.5 h-3.5" style={{ color: brandColor }} />
              Vista de Cliente
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
              {data.name}
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">{data.client || "Proyecto Activo"}</p>
          </div>
          
          <div className="flex items-center gap-6 glass-panel p-4 px-6 self-start rounded-2xl">
            <div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Estado</div>
              <div className="font-medium text-[var(--foreground)]">{data.status}</div>
            </div>
            <div className="w-px h-8 bg-[var(--surface-hover)]"></div>
            <div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Fechas</div>
              <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                {data.dateStart ? new Date(data.dateStart).toLocaleDateString() : "TBD"} - {data.dateEnd ? new Date(data.dateEnd).toLocaleDateString() : "TBD"}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-16 h-16" />
            </div>
            <h3 className="text-[13px] text-[var(--text-secondary)] font-medium mb-2">Progreso General</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-[var(--foreground)]">{data.stats.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${data.stats.progress}%`, background: brandColor }}
              />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <LayoutDashboard className="w-16 h-16" />
            </div>
            <h3 className="text-[13px] text-[var(--text-secondary)] font-medium mb-2">Tareas Completadas</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[var(--foreground)]">{data.stats.completedTasks}</span>
              <span className="text-sm text-[var(--text-muted)]">/ {data.stats.totalTasks}</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-16 h-16" />
            </div>
            <h3 className="text-[13px] text-[var(--text-secondary)] font-medium mb-2">Tendencia</h3>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-400">En buen camino</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel p-6 rounded-2xl mt-4">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: brandColor }} />
            Hitos y Tareas Recientes
          </h2>
          
          {data.recentTasks.length === 0 ? (
            <div className="text-center py-12 border border-[var(--hairline)] rounded-xl bg-[var(--surface-hover)]">
              <p className="text-[var(--text-secondary)] text-sm">Aún no hay tareas completadas para mostrar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data.recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--hairline)] bg-[var(--background)]/20 hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{task.title}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-[11px] text-[var(--text-secondary)] font-medium uppercase tracking-widest">
            Powered by Zefirus
          </p>
        </div>

      </div>
    </div>
  );
}
