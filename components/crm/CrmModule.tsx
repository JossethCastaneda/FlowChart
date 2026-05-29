"use client";

import React, { useState } from "react";
import { Search, Filter, MessageCircle, MoreVertical, Phone, Mail, X, CheckCircle, Target, ArrowRight, TrendingUp } from "lucide-react";

// Types
type LeadStatus = "Nuevo" | "En Contacto" | "Negociación" | "Ganado" | "Perdido";
type LeadTemperature = "Frío" | "Tibio" | "Caliente";

interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  lastMessage: string;
  time: string;
  phone: string;
  email: string;
  campaign: string;
  adset: string;
  value: number;
}

const INITIAL_LEADS: Lead[] = [
  { id: "L-001", name: "María López", status: "Nuevo", temperature: "Caliente", lastMessage: "¿Cuál es el precio del paquete premium?", time: "Hace 10 min", phone: "+52 55 1234 5678", email: "maria.l@gmail.com", campaign: "Promo Verano 2026", adset: "Audiencia Retargeting", value: 1500 },
  { id: "L-002", name: "Carlos Ruiz", status: "En Contacto", temperature: "Tibio", lastMessage: "Gracias, lo revisaré con mi socio.", time: "Ayer", phone: "+52 81 9876 5432", email: "cruiz@empresa.com", campaign: "Lanzamiento B2B", adset: "Lookalike 1%", value: 4500 },
  { id: "L-003", name: "Ana Gómez", status: "Ganado", temperature: "Caliente", lastMessage: "¡Perfecto, ya envié el comprobante de pago!", time: "Hace 2 días", phone: "+52 33 5555 4444", email: "ana.g@outlook.com", campaign: "Promo Verano 2026", adset: "Intereses Directos", value: 1500 },
  { id: "L-004", name: "Roberto Sánchez", status: "Nuevo", temperature: "Frío", lastMessage: "Info", time: "Hace 1 hora", phone: "+52 55 4444 3333", email: "roberto.s@gmail.com", campaign: "Lead Gen General", adset: "Abierto", value: 0 },
  { id: "L-005", name: "Elena Torres", status: "Negociación", temperature: "Caliente", lastMessage: "¿Me puedes hacer un descuento si pago de contado?", time: "Hace 4 horas", phone: "+52 55 1111 2222", email: "elena.t@corp.mx", campaign: "Lanzamiento B2B", adset: "Lookalike 1%", value: 9000 },
];

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: "Nuevo", title: "Nuevos Leads", color: "var(--cyan)" },
  { id: "En Contacto", title: "En Contacto", color: "var(--amber)" },
  { id: "Negociación", title: "Negociación", color: "var(--purple)" },
  { id: "Ganado", title: "Ganados", color: "var(--emerald)" },
  { id: "Perdido", title: "Perdidos", color: "var(--destructive, #ef4444)" },
];

const TEMP_COLORS = {
  "Frío": "bg-slate-500/20 text-slate-300",
  "Tibio": "bg-amber-500/20 text-amber-400",
  "Caliente": "bg-rose-500/20 text-rose-400",
};

export function CrmModule() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = "move";
    // Transparencia visual al arrastrar
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "1";
    }
    setDraggedLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    setLeads(prev => prev.map(lead => {
      if (lead.id === draggedLeadId) {
        return { ...lead, status };
      }
      return lead;
    }));
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] relative overflow-hidden">
      
      {/* KANBAN BOARD */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${selectedLead ? "mr-[400px]" : ""}`}>
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar prospectos por nombre, teléfono o campaña..." 
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
          </div>
          <div className="text-sm font-semibold text-emerald-400 flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
            Ventas Potenciales: ${leads.filter(l => l.status !== "Perdido" && l.status !== "Ganado").reduce((a,b) => a + b.value, 0).toLocaleString()}
          </div>
        </div>

        {/* Columns Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-4 bg-slate-950/30">
          {COLUMNS.map(col => {
            const columnLeads = leads.filter(l => l.status === col.id);
            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-[300px] flex-shrink-0 flex flex-col glass-panel"
                style={{ padding: 0, background: "rgba(10, 15, 30, 0.4)", border: "1px solid rgba(148,163,184,0.1)" }}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-white/5 flex items-center justify-between" style={{ borderTop: `3px solid ${col.color}` }}>
                  <h3 className="font-bold text-sm tracking-wide text-white uppercase">{col.title}</h3>
                  <span className="bg-slate-800 text-xs text-slate-300 px-2 py-0.5 rounded-full font-medium">{columnLeads.length}</span>
                </div>

                {/* Cards Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {columnLeads.map(lead => (
                    <div 
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer transition-all shadow-lg hover:shadow-cyan-500/10 group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors">{lead.name}</h4>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${TEMP_COLORS[lead.temperature]}`}>
                          {lead.temperature}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 bg-black/20 p-2 rounded border border-white/5 italic">
                        "{lead.lastMessage}"
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <div className="flex items-center gap-1" title="Campaña Atribuida">
                          <Target className="w-3 h-3 text-purple-400" />
                          <span className="truncate max-w-[120px]">{lead.campaign}</span>
                        </div>
                        <span className="text-cyan-400 font-medium">${lead.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-700/50 rounded-xl flex items-center justify-center text-xs text-slate-500">
                      Arrastra leads aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* LEAD DETAILS PANEL (Chat & Info) */}
      <div 
        className={`absolute top-0 right-0 h-full w-[400px] glass-panel border-l border-white/10 flex flex-col transition-transform duration-300 transform ${selectedLead ? "translate-x-0" : "translate-x-full"}`}
        style={{ zIndex: 20, borderRadius: 0 }}
      >
        {selectedLead && (
          <>
            {/* Header Detail */}
            <div className="p-4 border-b border-white/10 bg-slate-900/50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-lg text-white">{selectedLead.name}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${TEMP_COLORS[selectedLead.temperature]}`}>
                    {selectedLead.temperature}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedLead.phone}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meta Attribution Info */}
            <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3" /> Atribución de Marketing
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Origen:</span>
                  <span className="text-white font-medium bg-blue-600/20 px-2 py-0.5 rounded text-[10px] text-blue-400 border border-blue-500/20">Meta Ads</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Valor Estimado:</span>
                  <span className="text-emerald-400 font-bold">${selectedLead.value.toLocaleString()} MXN</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-0.5">Campaña:</span>
                  <span className="text-slate-300">{selectedLead.campaign} <ArrowRight className="inline w-3 h-3 text-slate-600"/> {selectedLead.adset}</span>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/30 custom-scrollbar">
              <div className="flex justify-center">
                <span className="text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">Historial de WhatsApp</span>
              </div>
              
              <div className="flex justify-start">
                <div className="bg-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] border border-slate-700/50 shadow-sm">
                  <p className="text-sm text-slate-200">{selectedLead.lastMessage}</p>
                  <span className="text-[9px] text-slate-500 mt-1 block">{selectedLead.time}</span>
                </div>
              </div>

              {selectedLead.status !== "Nuevo" && (
                <div className="flex justify-end">
                  <div className="bg-cyan-600/80 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] border border-cyan-500/50 shadow-sm">
                    <p className="text-sm text-white">¡Hola {selectedLead.name.split(' ')[0]}! Enseguida te atiende uno de nuestros asesores para darte seguimiento. ¿Te parece bien?</p>
                    <span className="text-[9px] text-cyan-200 mt-1 flex items-center justify-end gap-1">Automático <CheckCircle className="w-3 h-3" /></span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10 bg-slate-900/80">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Escribe un mensaje por WhatsApp..." 
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors shadow-lg shadow-cyan-500/20">
                  <MessageCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
