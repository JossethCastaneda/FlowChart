import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Folder, CreditCard, ChevronRight, Settings, Command } from "lucide-react";
import { HoloIcon } from "@/components/ui/HoloIcon";
import { motion, AnimatePresence } from "framer-motion";

interface AdAccount {
  id: string;
  name: string;
  portfolio?: string;
  spend?: number;
}

interface AccountSelectorProps {
  accounts: AdAccount[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
}

const fmtSpend = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function AccountSelector({ accounts, selectedAccountId, onSelectAccount }: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("LID Marketing");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Highest-spend account in the current period (the default) — flagged in the list.
  const topSpendId = accounts.reduce<{ id: string; spend: number }>(
    (top, a) => ((a.spend || 0) > top.spend ? { id: a.id, spend: a.spend || 0 } : top),
    { id: "", spend: 0 }
  ).id;

  // Group accounts by portfolio for the sidebar
  const portfolios: Record<string, AdAccount[]> = {};
  accounts.forEach((acc) => {
    const port = acc.portfolio || "LID Marketing";
    if (!portfolios[port]) portfolios[port] = [];
    portfolios[port].push(acc);
  });

  // Ensure selectedPortfolio exists or fallback
  if (!portfolios[selectedPortfolio] && Object.keys(portfolios).length > 0) {
    setSelectedPortfolio(Object.keys(portfolios)[0]);
  }

  // Get accounts specifically for the selected portfolio that ALSO match the search query
  const displayedAccounts = portfolios[selectedPortfolio]?.filter(acc => {
    const searchLower = search.toLowerCase();
    return (
      (acc.name?.toLowerCase().includes(searchLower)) || 
      (acc.id?.toLowerCase().includes(searchLower))
    );
  }) || [];

  return (
    <div className="relative z-50 w-full sm:w-auto" ref={containerRef}>
      {/* ── Selector Button ── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 w-full sm:min-w-[220px] px-3 py-2 rounded-lg text-sm font-medium text-left cursor-pointer transition-colors shadow-sm
          ${isOpen 
            ? "bg-[var(--fc-surface-raised)] border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
            : "bg-[var(--fc-surface)] border border-[var(--fc-border)] hover:bg-[var(--fc-surface-raised)] hover:border-blue-500/40"
          }`}
      >
        <div className="p-1 rounded bg-gradient-to-br from-emerald-500 to-[#2b9a67] shadow-[0_2px_8px_rgba(16,185,129,0.4)]">
           <HoloIcon icon={Folder} variant="emerald" isActive={true} className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 truncate text-[13px]">
          {selectedAccountId === "all" ? `Todas las cuentas (${accounts.length})` : selectedAccount ? selectedAccount.name.split(" — ")[0] : "Seleccionar Cuenta"}
        </span>
        <div className="bg-[var(--fc-surface-raised)] text-[var(--fc-text)] px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
           {accounts.length}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <HoloIcon icon={ChevronDown} variant="cyan" isActive={isOpen} className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* ── Dropdown Modal ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 sm:left-auto sm:right-auto mt-2 bg-[var(--fc-surface)] border border-[var(--fc-border)] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col w-[90vw] sm:w-[650px] max-w-full"
          >
            {/* Top Search Bar */}
            <div className="p-3 border-b border-[var(--fc-border)] bg-white/[0.02]">
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--fc-surface)] border border-[var(--fc-border)] rounded-lg">
                <HoloIcon icon={Search} variant="cyan" isActive={true} className="w-4 h-4 shrink-0" />
                <input
                  type="text" autoFocus
                  placeholder="Buscar cuenta por nombre o ID..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none text-[var(--fc-text)] text-xs sm:text-sm w-full outline-none font-medium placeholder:text-[var(--fc-text)]/30"
                />
                <div className="hidden sm:flex gap-1 shrink-0">
                  <span className="text-[10px] text-[var(--fc-text)]/40 bg-[var(--fc-surface-raised)] px-1.5 py-0.5 rounded border border-[var(--fc-border)]">⌘</span>
                  <span className="text-[10px] text-[var(--fc-text)]/40 bg-[var(--fc-surface-raised)] px-1.5 py-0.5 rounded border border-[var(--fc-border)]">K</span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col sm:flex-row h-[380px] max-h-[60vh]">
              
              {/* Left Sidebar: Portfolios */}
              <div className="w-full sm:w-[200px] border-b sm:border-b-0 sm:border-r border-[var(--fc-border)] flex flex-col bg-white/[0.01] shrink-0 h-[140px] sm:h-auto">
                <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between text-[var(--fc-text)]/40">
                  Portfolios
                </div>
                
                <div className="overflow-y-auto flex-1 px-2 custom-scrollbar">
                  {Object.entries(portfolios).map(([portName, items], idx) => {
                    const isSelected = selectedPortfolio === portName;
                    const bgColors = ["bg-gradient-to-br from-emerald-500 to-emerald-700", "bg-gradient-to-br from-amber-500 to-amber-700", "bg-gradient-to-br from-purple-500 to-purple-700", "bg-gradient-to-br from-cyan-500 to-cyan-700"];
                    const bgColor = portName.includes("LID") ? bgColors[0] : bgColors[idx % bgColors.length];
                    const initial = portName.charAt(0).toUpperCase();
                    
                    return (
                      <motion.button
                        key={portName}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedPortfolio(portName)}
                        className={`flex items-center gap-3 w-full p-2.5 rounded-lg mb-1 text-left transition-colors ${
                          isSelected ? "bg-blue-500/10 border border-blue-500/30 text-[var(--fc-text)] shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]" : "border border-transparent text-[var(--fc-text)]/60 hover:bg-[var(--fc-surface-raised)]"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[var(--fc-text)] font-bold text-sm shrink-0 shadow-md ${bgColor}`}>
                          {portName.includes("LID") ? <HoloIcon icon={Folder} variant="emerald" isActive={true} className="w-4 h-4" /> : initial}
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col">
                          <div className={`font-bold text-xs truncate ${isSelected ? "text-[var(--fc-text)]" : "text-[var(--fc-text)]/80"}`}>{portName}</div>
                          <div className={`text-[10px] font-medium ${isSelected ? "text-[var(--fc-text)]/70" : "text-[var(--fc-text)]/40"}`}>{items.length} cuentas</div>
                        </div>
                        {isSelected && <HoloIcon icon={ChevronRight} variant="cyan" isActive={true} className="w-3.5 h-3.5" />}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="p-3 border-t border-white/5">
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full p-2 bg-[var(--fc-surface-raised)] hover:bg-white/10 border border-white/5 rounded-md text-[11px] font-bold text-[var(--fc-text)] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    + Nuevo Portfolio
                  </motion.button>
                </div>
              </div>

              {/* Right Content: Accounts */}
              <div className="flex-1 flex flex-col bg-[var(--fc-surface)] overflow-hidden min-h-0">
                <div className="px-5 pt-4 pb-3 flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-[var(--fc-text)] tracking-tight">{selectedPortfolio}</h3>
                    <p className="text-[11px] text-[var(--fc-text)]/50">Gestiona las cuentas asignadas a este portfolio.</p>
                  </div>
                  <motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
                    <HoloIcon icon={Settings} variant="cyan" isActive={true} className="w-4 h-4 cursor-pointer" />
                  </motion.button>
                </div>
                
                <div className="px-5 pb-3 mb-2 border-b border-white/5 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-[var(--fc-text)]/70">
                    {displayedAccounts.length} {displayedAccounts.length === 1 ? 'cuenta encontrada' : 'cuentas encontradas'}
                  </span>
                </div>

                <div className="overflow-y-auto flex-1 px-5 pb-5 custom-scrollbar">
                  {displayedAccounts.length === 0 && selectedAccountId !== "all" ? (
                    <div className="text-center py-8 text-[var(--fc-text)]/40 flex flex-col items-center gap-3">
                      <HoloIcon icon={Search} variant="cyan" isActive={false} className="w-6 h-6 opacity-30" />
                      <div className="text-xs font-bold">No hay cuentas coincidentes</div>
                      <div className="text-[10px] max-w-[180px]">Intenta buscar con otro término o selecciona otro portfolio.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {/* ── 'All accounts' option ── */}
                      {accounts.length > 1 && search === "" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          onClick={() => { onSelectAccount("all"); setIsOpen(false); }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                            selectedAccountId === "all" 
                              ? "bg-blue-500/10 border border-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.15)]" 
                              : "bg-white/[0.015] border border-white/5 hover:bg-[var(--fc-surface-raised)]"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                            <HoloIcon icon={Command} variant="cyan" isActive={true} className="w-4 h-4" />
                          </div>
                          <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
                            <div className={`font-bold text-[13px] ${selectedAccountId === "all" ? "text-cyan-400" : "text-[var(--fc-text)]"}`}>Vista Global (Todas)</div>
                            <div className="text-[10px] text-[var(--fc-text)]/50 font-medium">Agrega la data de las {accounts.length} cuentas</div>
                          </div>
                          {selectedAccountId === "all" && (
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                          )}
                        </motion.div>
                      )}

                      {/* ── Individual accounts ── */}
                      {displayedAccounts.map((acc, idx) => {
                        const isSelected = selectedAccountId === acc.id;
                        return (
                          <motion.div
                            key={acc.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => { onSelectAccount(acc.id); setIsOpen(false); }}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                              isSelected 
                                ? "bg-blue-500/10 border border-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.15)]" 
                                : "bg-white/[0.015] border border-white/5 hover:bg-[var(--fc-surface-raised)]"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg bg-[var(--fc-surface-raised)] flex items-center justify-center shrink-0 border border-[var(--fc-border)]">
                              <HoloIcon icon={CreditCard} variant="pink" isActive={isSelected} className="w-4 h-4" />
                            </div>
                            <div className="flex-1 overflow-hidden flex flex-col gap-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className={`font-bold text-[13px] truncate ${isSelected ? "text-cyan-400" : "text-[var(--fc-text)]"}`}>
                                  {acc.name.split(" — ")[0]}
                                </span>
                                {acc.id === topSpendId && (acc.spend || 0) > 0 && (
                                  <span className="shrink-0 text-[9px] font-bold text-emerald-400 bg-[var(--fc-surface)] border border-emerald-500/40 rounded px-1.5 py-0.5 tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                    TOP
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--fc-text)]/50 flex gap-3 items-center font-medium">
                                <span>ID: <span className="text-[var(--fc-text)]/80">{acc.id.replace("act_", "")}</span></span>
                                {(acc.spend || 0) > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-white/30" />
                                    <span>Inv: <span className="text-emerald-400 font-bold">{fmtSpend(acc.spend || 0)}</span></span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
