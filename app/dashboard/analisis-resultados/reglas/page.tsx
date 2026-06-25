"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Scale, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { PermissionGuard } from "@/components/layout/PermissionsContext";

export default function OutcomeRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario nueva regla
  const [newName, setNewName] = useState("");
  const [newField, setNewField] = useState("handoff");
  const [newOperator, setNewOperator] = useState("eq");
  const [newValue, setNewValue] = useState("true");
  const [newOutcome, setNewOutcome] = useState("transferred");
  const [newResolvedBy, setNewResolvedBy] = useState("agent");

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/outcome-rules");
      const json = await res.json();
      if (json.success) setRules(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    try {
      const res = await fetch(`/api/analytics/outcome-rules/${id}`, { method: "DELETE" });
      if (res.ok) fetchRules();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    
    // Parse value depending on field
    let finalValue: any = newValue;
    if (newValue === "true") finalValue = true;
    if (newValue === "false") finalValue = false;
    if (!isNaN(Number(newValue)) && newValue !== "") finalValue = Number(newValue);

    const payload = {
      name: newName,
      outcome: newOutcome,
      resolvedBy: newResolvedBy,
      conditions: [{ field: newField, operator: newOperator, value: finalValue }]
    };

    try {
      const res = await fetch("/api/analytics/outcome-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewName("");
        fetchRules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PermissionGuard permKey="canAccessAnalytics">
      <div className="space-y-6">
        <PageHeader
          title="Reglas de Outcome (Éxito)"
          description="Define cómo el motor clasificará el éxito o fracaso de una conversación basada en sus atributos."
          icon={<Scale className="w-6 h-6" style={{ color: "var(--purple)" }} />}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          
          {/* Creador de Reglas */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Plus className="w-4 h-4 text-purple-400" /> Añadir Regla
            </h3>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <label className="block mb-1 text-xs">Nombre de la Regla</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Abandono por Fallback" className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-purple-500" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1 text-xs">Campo</label>
                  <select value={newField} onChange={e => setNewField(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-white outline-none">
                    <option value="handoff">Handoff</option>
                    <option value="fallback">Fallback (Count)</option>
                    <option value="csatScore">CSAT Score</option>
                    <option value="taskCompleted">Task Completed</option>
                    <option value="integrationError">Integration Error</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs">Operador</label>
                  <select value={newOperator} onChange={e => setNewOperator(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-white outline-none">
                    <option value="eq">Igual a (=)</option>
                    <option value="gt">Mayor a (&gt;)</option>
                    <option value="lt">Menor a (&lt;)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs">Valor</label>
                  <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-white outline-none" />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 mt-4">
                <p className="text-xs text-slate-400 mb-2">Si se cumple, clasificar como:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 text-xs">Resultado (Outcome)</label>
                    <select value={newOutcome} onChange={e => setNewOutcome(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-white outline-none">
                      <option value="resolved">Resuelto</option>
                      <option value="transferred">Transferido</option>
                      <option value="abandoned">Abandonado</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs">Atendido Por</label>
                    <select value={newResolvedBy} onChange={e => setNewResolvedBy(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-white outline-none">
                      <option value="bot">Bot</option>
                      <option value="agent">Humano</option>
                      <option value="mixed">Mixto</option>
                    </select>
                  </div>
                </div>
              </div>

              <button onClick={handleCreate} disabled={!newName} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" /> Guardar Regla
              </button>
            </div>
          </div>

          {/* Lista de Reglas Activas */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "16px" }}>Reglas Activas</h3>
            
            {loading ? (
              <p className="text-slate-400 text-sm">Cargando reglas...</p>
            ) : rules.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-lg">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No tienes reglas personalizadas.</p>
                <p className="text-xs text-slate-500">Se usará el motor de clasificación por defecto.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(r => {
                  const conditions = typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions;
                  return (
                    <div key={r.id} className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-bold">{r.name}</h4>
                        <div className="flex gap-2 mt-1">
                          {conditions.map((c: any, i: number) => (
                            <span key={i} className="text-[10px] uppercase bg-black/30 px-2 py-1 rounded text-slate-300">
                              IF {c.field} {c.operator} {String(c.value)}
                            </span>
                          ))}
                          <span className="text-[10px] uppercase bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            THEN {r.outcome} by {r.resolvedBy}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </PermissionGuard>
  );
}
