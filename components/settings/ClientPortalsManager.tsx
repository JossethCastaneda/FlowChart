"use client";

import { useState, useEffect } from "react";
import { Copy, Link as LinkIcon, RefreshCw, Loader2, Globe, ShieldCheck, Clock, Eye, BarChart3, MessageCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: string;
  name: string;
  publicToken: string | null;
  publicTokenExpiresAt?: string | null;
  publicPortalSettings?: { showTasks?: boolean; showApprovals?: boolean; showReports?: boolean; allowComments?: boolean };
}

const containerVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { staggerChildren: 0.1, duration: 0.4, ease: "easeOut" } 
  }
};

const itemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    if (workspaceId) fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: [React] Refactor de hooks anti-patrón
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
    // Could use a toast here
  };

  const updateSetting = async (project: Project, key: "showTasks" | "showApprovals" | "showReports" | "allowComments", value: boolean) => {
    const current = project.publicPortalSettings || {};
    const settings = { showTasks: current.showTasks !== false, showApprovals: current.showApprovals !== false, showReports: current.showReports !== false, allowComments: current.allowComments !== false, [key]: value };
    setProjects((items) => items.map((item) => item.id === project.id ? { ...item, publicPortalSettings: settings } : item));
    const response = await fetch(`/api/projects/${project.id}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "configure", settings }) });
    if (!response.ok) await fetchProjects();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 text-[var(--fc-text-muted)] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.p variants={itemVariants} className="text-[13px] text-[var(--fc-text-secondary)] m-0 leading-relaxed">
        Genera enlaces públicos mágicos para compartir el progreso de los proyectos con tus clientes. 
        No necesitan iniciar sesión: pueden consultar avances, aprobar contenido, pedir cambios y abrir reportes según los permisos que elijas.
      </motion.p>

      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        {projects.length === 0 && (
          <div className="text-center p-10 bg-[var(--surface-hover)] rounded-xl border border-dashed border-[var(--fc-border)]">
            <Globe className="w-8 h-8 text-[var(--fc-text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[13px] text-[var(--fc-text-secondary)] mb-1">No hay proyectos activos.</p>
            <p className="text-[11px] text-[var(--fc-text-muted)]">Crea un proyecto primero para habilitar su portal.</p>
          </div>
        )}
        
        <AnimatePresence>
          {projects.map((project) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={project.id} 
              className="flex flex-col p-5 glass-panel border border-[var(--fc-border)] rounded-xl gap-5 transition-all hover:border-[var(--fc-accent)]/30 relative overflow-hidden"
            >
              {project.publicToken && <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--fc-success)]/5 rounded-bl-full" style={{ filter: "blur(20px)" }} />}
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                  <h3 className="font-bold text-[var(--fc-text)] text-[15px] flex items-center gap-2">
                    {project.name}
                  </h3>
                  {project.publicToken ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-success)] shadow-[0_0_8px_var(--fc-success)] animate-pulse"></span>
                      <span className="text-[11px] font-medium text-[var(--fc-success)]">
                        Acceso activo{project.publicTokenExpiresAt ? ` hasta el ${new Date(project.publicTokenExpiresAt).toLocaleDateString()}` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-text-muted)]"></span>
                      <span className="text-[11px] font-medium text-[var(--fc-text-muted)] uppercase tracking-wider">Privado</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {project.publicToken ? (
                    <>
                      <Link href={`/public/p/${project.publicToken}`} target="_blank" className="btn-secondary flex items-center gap-1.5 !px-3" title="Ver portal">
                        <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ver portal</span>
                      </Link>
                      <button onClick={() => copyToClipboard(project.publicToken!)} className="btn-secondary flex items-center gap-1.5 !px-3" title="Copiar enlace">
                        <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copiar</span>
                      </button>
                      <button onClick={() => handleAction(project.id, "generate")} disabled={loadingAction === project.id} className="btn-secondary !p-2 shrink-0" title="Regenerar enlace (revocará el actual)">
                        {loadingAction === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-[var(--fc-text-secondary)]" />}
                      </button>
                      <button onClick={() => handleAction(project.id, "revoke")} disabled={loadingAction === project.id} className="btn-secondary !px-3 shrink-0" title="Revocar acceso" style={{ borderColor: "rgba(226,68,92,0.2)" }}>
                        <span className="text-[11px] font-bold text-[var(--fc-danger)]">Revocar</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleAction(project.id, "generate")} disabled={loadingAction === project.id} className="btn-primary text-xs flex items-center gap-2">
                      {loadingAction === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      Generar enlace público
                    </button>
                  )}
                </div>
              </div>

              {/* Portal Settings */}
              {project.publicToken && (
                <div className="pt-4 border-t border-[var(--hairline)] relative z-10">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--fc-text-muted)] mb-3 font-bold">Permisos del portal</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      ['showTasks', 'Ver Tareas', ShieldCheck],
                      ['showApprovals', 'Aprobaciones', Clock],
                      ['showReports', 'Reportes', BarChart3],
                      ['allowComments', 'Comentar', MessageCircle]
                    ] as const).map(([key, label, Icon]) => {
                      const checked = project.publicPortalSettings?.[key] !== false;
                      return (
                        <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--fc-border)]">
                          <label className="flex items-center gap-2 text-[11px] font-medium text-[var(--fc-text-secondary)] cursor-pointer">
                            <Icon className="w-3.5 h-3.5 text-[var(--fc-text-muted)]" />
                            {label}
                          </label>
                          <button
                            onClick={() => updateSetting(project, key, !checked)}
                            role="switch"
                            aria-checked={checked}
                            className="w-8 h-4 rounded-full shrink-0 relative transition-colors duration-200 ml-2"
                            style={{ background: checked ? "var(--fc-accent)" : "rgba(255,255,255,0.1)" }}
                          >
                            <span className="absolute top-[2px] w-3 h-3 rounded-full bg-[var(--fc-surface)] transition-all duration-200" style={{ left: checked ? 18 : 2 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
