"use client";

import React, { useEffect, useState } from "react";
import { Server, Trash2, RefreshCw, ShieldAlert } from "lucide-react";

export default function DevPanelPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/dev/tools");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setIntegrations(data.integrations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleAction = async (action: string, id: string) => {
    setActionLoading(id + action);
    try {
      const res = await fetch("/api/dev/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, integrationId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      alert(data.message);
      if (action === "delete_integration") {
        setIntegrations(integrations.filter(i => i.id !== id));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 text-white">Cargando panel dev...</div>;

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-panel border-red-500/50 flex flex-col items-center justify-center p-12 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-slate-400 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-8 h-8 text-[#00d4ff]" />
        <h1 className="text-3xl font-display font-bold text-white m-0">Backend Dev Tools</h1>
      </div>

      <div className="glass-panel">
        <h2 className="text-xl font-bold text-white mb-4">Integraciones en Crudo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">ID / Provider</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 rounded-tr-lg">Acciones de Soporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {integrations.map((int) => (
                <tr key={int.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-[#00d4ff] mb-1">{int.id}</div>
                    <div className="font-bold">{int.provider}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${int.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {int.connected ? "CONECTADO" : "DESCONECTADO"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(int.connectedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAction("force_sync", int.id)}
                        disabled={actionLoading === int.id + "force_sync"}
                        className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 h-auto bg-white/5 hover:bg-[#00d4ff]/20"
                      >
                        <RefreshCw className={`w-3 h-3 ${actionLoading === int.id + "force_sync" ? "animate-spin" : ""}`} />
                        Forzar Sync
                      </button>
                      <button 
                        onClick={() => handleAction("delete_integration", int.id)}
                        disabled={actionLoading === int.id + "delete_integration"}
                        className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 h-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hard Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {integrations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No hay integraciones en la base de datos para este workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
