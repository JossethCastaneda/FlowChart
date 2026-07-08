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
    <div className="relative" style={{ minWidth: "260px", zIndex: 60 }} ref={containerRef}>
      {/* ── Selector Button ── */}
      <motion.button
        whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(59,130,246, 0.4)" }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 14px",
          background: isOpen ? "rgba(255, 255, 255, 0.05)" : "rgba(10, 15, 30, 0.6)",
          border: isOpen ? "1px solid rgba(59,130,246, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "10px", color: "var(--foreground)", fontSize: "14px", fontWeight: 600,
          textAlign: "left", cursor: "pointer", 
          boxShadow: isOpen ? "0 0 20px rgba(59,130,246, 0.15)" : "0 4px 12px rgba(0,0,0,0.2)",
          transition: "border 0.2s ease, background 0.2s ease"
        }}
      >
        <div style={{ background: "linear-gradient(135deg, var(--emerald), #2b9a67)", padding: "4px", borderRadius: "6px", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)" }}>
           <HoloIcon icon={Folder} variant="emerald" isActive={true} className="w-4 h-4" />
        </div>
        <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          {selectedAccountId === "all" ? `Todas las cuentas (${accounts.length})` : selectedAccount ? selectedAccount.name.split(" — ")[0] : "Seleccionar Cuenta"}
        </span>
        <div style={{
           background: "var(--surface-hover)", color: "var(--foreground)", padding: "2px 8px", 
           borderRadius: "12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em"
        }}>
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
            style={{
              position: "absolute", top: "100%", left: 0, marginTop: "8px",
              background: "var(--surface)", 
              border: "1px solid var(--border)", borderRadius: "14px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset",
              zIndex: 70, width: "750px", display: "flex", flexDirection: "column",
              color: "var(--foreground)", overflow: "hidden"
            }}
          >
            {/* Top Search Bar */}
            <div style={{ padding: "16px 20px", border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "8px", transition: "all 0.2s"
              }}>
                <HoloIcon icon={Search} variant="cyan" isActive={true} className="w-4 h-4" />
                <input
                  type="text" autoFocus
                  placeholder="Buscar una cuenta por nombre o ID..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "none", border: "none", color: "var(--foreground)", fontSize: "14px",
                    outline: "none", width: "100%", fontWeight: 500
                  }}
                />
                <div style={{ display: "flex", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--surface-hover)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--hairline)" }}>⌘</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--surface-hover)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--hairline)" }}>K</span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ display: "flex", height: "480px" }}>
              
              {/* Left Sidebar: Portfolios */}
              <div style={{ width: "280px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--surface-hover)" }}>
                <div style={{ padding: "20px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  Portfolios
                  <div style={{ background: "var(--surface-hover)", color: "var(--foreground)", borderRadius: "50%", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", cursor: "help" }}>?</div>
                </div>
                
                <div style={{ overflowY: "auto", flex: 1, padding: "0 12px" }} className="custom-scrollbar">
                  {Object.entries(portfolios).map(([portName, items], idx) => {
                    const isSelected = selectedPortfolio === portName;
                    const bgColors = ["linear-gradient(135deg, var(--emerald), #2b9a67)", "linear-gradient(135deg, var(--amber), var(--amber))", "linear-gradient(135deg, var(--amber), var(--amber))", "linear-gradient(135deg, var(--purple), var(--purple))", "linear-gradient(135deg, var(--cyan), var(--cyan))"];
                    const bgColor = portName.includes("LID") ? bgColors[0] : bgColors[idx % bgColors.length];
                    const initial = portName.charAt(0).toUpperCase();
                    
                    return (
                      <motion.button
                        key={portName}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedPortfolio(portName)}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px",
                          borderRadius: "10px", background: isSelected ? "rgba(59,130,246, 0.1)" : "transparent",
                          border: isSelected ? "1px solid rgba(59,130,246, 0.3)" : "1px solid transparent",
                          color: isSelected ? "white" : "rgba(255,255,255,0.6)",
                          cursor: "pointer", marginBottom: "6px", textAlign: "left",
                          boxShadow: isSelected ? "inset 0 0 20px rgba(59,130,246, 0.05)" : "none"
                        }}
                        whileHover={{ backgroundColor: isSelected ? "rgba(59,130,246, 0.15)" : "rgba(255,255,255,0.05)" }}
                      >
                        <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", fontWeight: 800, fontSize: "16px", flexShrink: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
                          {portName.includes("LID") ? <HoloIcon icon={Folder} variant="emerald" isActive={true} className="w-5 h-5" /> : initial}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ fontWeight: 700, fontSize: "14px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", color: isSelected ? "white" : "var(--foreground)" }}>{portName}</div>
                          <div style={{ fontSize: "11px", color: isSelected ? "rgba(255,255,255,0.7)" : "var(--text-muted)", fontWeight: 500 }}>{items.length} cuentas</div>
                        </div>
                        {isSelected && <HoloIcon icon={ChevronRight} variant="cyan" isActive={true} className="w-4 h-4" />}
                      </motion.button>
                    );
                  })}
                </div>

                <div style={{ padding: "16px", borderTop: "1px solid var(--hairline)" }}>
                  <motion.button 
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }} whileTap={{ scale: 0.98 }}
                    style={{ width: "100%", padding: "10px", background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    + Nuevo Portfolio
                  </motion.button>
                </div>
              </div>

              {/* Right Content: Accounts */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--surface)" }}>
                <div style={{ padding: "24px 28px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{selectedPortfolio}</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Gestiona las cuentas asignadas a este portfolio.</p>
                  </div>
                  <motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
                    <HoloIcon icon={Settings} variant="cyan" isActive={true} className="w-5 h-5" style={{ cursor: "pointer" }} />
                  </motion.button>
                </div>
                
                <div style={{ padding: "0 28px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--hairline)", marginBottom: "16px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
                    {displayedAccounts.length} {displayedAccounts.length === 1 ? 'cuenta encontrada' : 'cuentas encontradas'}
                  </span>
                </div>

                <div style={{ overflowY: "auto", flex: 1, padding: "0 28px 28px" }} className="custom-scrollbar">
                  {displayedAccounts.length === 0 && selectedAccountId !== "all" ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                      <HoloIcon icon={Search} variant="cyan" isActive={false} className="w-8 h-8 opacity-20" />
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>No hay cuentas coincidentes</div>
                      <div style={{ fontSize: "12px", maxWidth: "200px" }}>Intenta buscar con otro término o selecciona otro portfolio.</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {/* ── 'All accounts' option ── */}
                      {accounts.length > 1 && search === "" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          onClick={() => { onSelectAccount("all"); setIsOpen(false); }}
                          whileHover={{ scale: 1.01, backgroundColor: "var(--surface-hover)" }}
                          whileTap={{ scale: 0.99 }}
                          style={{
                            display: "flex", alignItems: "center", gap: "16px", padding: "16px",
                            borderRadius: "12px", cursor: "pointer",
                            background: selectedAccountId === "all" ? "rgba(59,130,246, 0.08)" : "rgba(255,255,255,0.015)",
                            border: selectedAccountId === "all" ? "1px solid rgba(59,130,246, 0.5)" : "1px solid rgba(255,255,255,0.05)",
                            boxShadow: selectedAccountId === "all" ? "0 4px 20px rgba(59,130,246, 0.15)" : "none"
                          }}
                        >
                          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(162,93,220,0.2))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(59,130,246,0.3)" }}>
                            <HoloIcon icon={Command} variant="cyan" isActive={true} className="w-5 h-5" />
                          </div>
                          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ fontWeight: 800, fontSize: "15px", color: selectedAccountId === "all" ? "var(--cyan)" : "white" }}>Vista Global (Todas las cuentas)</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Agrega la data de las {accounts.length} cuentas combinadas</div>
                          </div>
                          {selectedAccountId === "all" && (
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 10px var(--cyan)" }} />
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
                            whileHover={{ scale: 1.01, backgroundColor: isSelected ? "rgba(59,130,246, 0.1)" : "var(--surface-hover)" }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => { onSelectAccount(acc.id); setIsOpen(false); }}
                            style={{
                              display: "flex", alignItems: "center", gap: "16px", padding: "16px",
                              borderRadius: "12px", cursor: "pointer",
                              background: isSelected ? "rgba(59,130,246, 0.08)" : "rgba(255,255,255,0.015)",
                              border: isSelected ? "1px solid rgba(59,130,246, 0.5)" : "1px solid rgba(255,255,255,0.05)",
                              boxShadow: isSelected ? "0 4px 20px rgba(59,130,246, 0.15)" : "none"
                            }}
                          >
                            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--hairline)" }}>
                              <HoloIcon icon={CreditCard} variant="pink" isActive={isSelected} className="w-5 h-5" />
                            </div>
                            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                                <span style={{ fontWeight: 700, fontSize: "14px", color: isSelected ? "var(--cyan)" : "white", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                  {acc.name.split(" — ")[0]}
                                </span>
                                {acc.id === topSpendId && (acc.spend || 0) > 0 && (
                                  <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 800, color: "var(--emerald)", background: "var(--surface)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: "6px", padding: "2px 8px", letterSpacing: "0.05em", boxShadow: "0 0 10px rgba(16,185,129,0.2)" }}>
                                    TOP GASTO
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "14px", alignItems: "center", fontWeight: 500 }}>
                                <span>ID: <span style={{ color: "var(--foreground)" }}>{acc.id.replace("act_", "")}</span></span>
                                {(acc.spend || 0) > 0 && (
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--text-muted)" }} />
                                    <span>Inversión: <span style={{ color: "var(--emerald)", fontWeight: 700 }}>{fmtSpend(acc.spend || 0)}</span></span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 10px var(--cyan)" }} />
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
