"use client";

import { useState, useEffect } from "react";
import { Copy, Link as LinkIcon, RefreshCw, Loader2, Globe, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  publicToken: string | null;
}

export function ClientPortalsManager({ workspaceId }: { workspaceId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?workspaceId=${workspaceId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) fetchProjects();
  }, [workspaceId]);

  const handleAction = async (id: string, action: "generate" | "revoke") => {
    setLoadingAction(id);
    try {
      const res = await fetch(`/api/projects/${id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await fetchProjects();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `${window.location.origin}/public/p/${token}`;
    await navigator.clipboard.writeText(url);
    alert("Enlace copiado al portapapeles");
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-muted)]"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="glass-panel p-4 md:p-6">
      <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4">
        <span className="section-title flex items-center gap-2">
          <Globe className="w-5 h-5 text-[var(--cyan)]" /> Portal de Clientes
        </span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-2xl">
        Genera enlaces públicos mágicos para compartir el progreso de los proyectos con tus clientes. 
        Ellos no necesitarán iniciar sesión para ver una pantalla de inicio personalizada y de solo lectura.
      </p>

      <div className="flex flex-col gap-3">
        {projects.length === 0 && (
          <div className="text-center p-8 bg-[var(--surface-hover)] rounded-xl border border-[var(--hairline)]">
            <p className="text-[var(--text-secondary)] text-sm">No hay proyectos activos en este workspace.</p>
          </div>
        )}
        
        {projects.map((project) => (
          <div key={project.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[var(--surface-hover)] border border-[var(--hairline)] rounded-xl gap-4">
            <div>
              <h3 className="font-medium text-[var(--text-secondary)] text-[14px]">{project.name}</h3>
              {project.publicToken ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[11px] text-emerald-400/80">Acceso público activo</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--surface-hover)]"></span>
                  <span className="text-[11px] text-[var(--text-muted)]">Privado</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {project.publicToken ? (
                <>
                  <Link href={`/public/p/${project.publicToken}`} target="_blank" className="btn-secondary !p-2 shrink-0" title="Ver portal">
                    <ArrowUpRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </Link>
                  <button onClick={() => copyToClipboard(project.publicToken!)} className="btn-secondary !p-2 shrink-0" title="Copiar enlace">
                    <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  <button onClick={() => handleAction(project.id, "generate")} disabled={loadingAction === project.id} className="btn-secondary !p-2 shrink-0" title="Regenerar enlace (Revocará el actual)">
                    {loadingAction === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />}
                  </button>
                  <button onClick={() => handleAction(project.id, "revoke")} disabled={loadingAction === project.id} className="btn-secondary !px-3 shrink-0" title="Revocar acceso">
                    <span className="text-[11px] font-medium" style={{ color: "var(--red)" }}>Revocar</span>
                  </button>
                </>
              ) : (
                <button onClick={() => handleAction(project.id, "generate")} disabled={loadingAction === project.id} className="btn-primary text-xs !py-1.5 flex items-center gap-2">
                  {loadingAction === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                  Habilitar Portal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
