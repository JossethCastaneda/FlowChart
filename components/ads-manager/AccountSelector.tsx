import React, { useState } from "react";
import { ChevronDown, Search, Folder, CreditCard, ChevronRight, Settings } from "lucide-react";

interface AdAccount {
  id: string;
  name: string;
  portfolio?: string;
}

interface AccountSelectorProps {
  accounts: AdAccount[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
}

export function AccountSelector({ accounts, selectedAccountId, onSelectAccount }: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("LID Marketing");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Filter all accounts by search
  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.id.toLowerCase().includes(search.toLowerCase())
  );

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
  const displayedAccounts = portfolios[selectedPortfolio]?.filter(acc => 
    acc.name.toLowerCase().includes(search.toLowerCase()) ||
    acc.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="relative" style={{ minWidth: "240px", zIndex: 60 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "8px 12px",
          background: "rgba(10, 15, 30, 0.7)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "white",
          fontSize: "13px",
          fontWeight: 600,
          textAlign: "left",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--cyan-dim)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <div style={{ background: "var(--emerald)", padding: "2px", borderRadius: "4px" }}>
           <Folder className="w-3.5 h-3.5 text-white" />
        </div>
        <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          {selectedAccount ? selectedAccount.name.split(" — ")[0] : "Seleccionar Cuenta"}
        </span>
        <div style={{
           background: "rgba(255,255,255,0.1)", color: "white", padding: "2px 6px", 
           borderRadius: "10px", fontSize: "10px", fontWeight: 700
        }}>
           78
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 60 }}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              background: "rgba(5, 8, 18, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-strong)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 70,
              width: "700px",
              display: "flex",
              flexDirection: "column",
              color: "white",
              overflow: "hidden"
            }}
          >
            {/* Top Search Bar */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-strong)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  background: "rgba(0,0,0,0.3)"
                }}
              >
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar una cuenta publicitaria"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    fontSize: "13px",
                    outline: "none",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* Content Area */}
            <div style={{ display: "flex", height: "450px" }}>
              
              {/* Left Sidebar: Portfolios */}
              <div style={{ width: "280px", borderRight: "1px solid var(--border-strong)", display: "flex", flexDirection: "column", background: "rgba(5,8,18,0.7)" }}>
                <div style={{ padding: "16px 20px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", color: "rgba(148,163,184,0.8)" }}>
                  Portfolios comerciales
                  <div style={{ background: "rgba(255,255,255,0.1)", color: "white", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>i</div>
                </div>
                
                <div style={{ overflowY: "auto", flex: 1, padding: "0 8px" }} className="custom-scrollbar">
                  {Object.entries(portfolios).map(([portName, items]) => {
                    const isSelected = selectedPortfolio === portName;
                    // Mock colors based on name for realism
                    const initial = portName.charAt(0).toUpperCase();
                    const bgColors = ["#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#e2e8f0"];
                    const bgColor = portName.includes("LID") ? bgColors[0] : portName.includes("A") ? bgColors[1] : portName.includes("B") ? bgColors[2] : bgColors[4];
                    
                    return (
                      <button
                        key={portName}
                        onClick={() => setSelectedPortfolio(portName)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: isSelected ? "rgba(0,129,251,0.15)" : "transparent",
                          color: isSelected ? "white" : "rgba(255,255,255,0.7)",
                          border: "none",
                          cursor: "pointer",
                          marginBottom: "4px",
                          textAlign: "left",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent" }}
                      >
                        <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "18px", flexShrink: 0 }}>
                          {portName.includes("LID") ? <Folder className="w-5 h-5" /> : initial}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px" }}>
                          <div style={{ fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{portName}</div>
                          <div style={{ fontSize: "11px", color: isSelected ? "rgba(255,255,255,0.7)" : "rgba(148,163,184,0.5)" }}>{items.length} cuentas publicitarias</div>
                        </div>
                        {isSelected && <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </button>
                    );
                  })}
                </div>

                <div style={{ padding: "16px", borderTop: "1px solid var(--border-strong)", marginTop: "auto" }}>
                  <button style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  >
                    Crear un portfolio comercial
                  </button>
                </div>
              </div>

              {/* Right Content: Accounts */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(10, 15, 30, 0.4)" }}>
                <div style={{ padding: "24px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "white" }}>{selectedPortfolio}</h3>
                    <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.6)", margin: 0 }}>Portfolio comercial</p>
                  </div>
                  <Settings className="w-5 h-5 text-slate-500 hover:text-white" style={{ cursor: "pointer", transition: "all 0.2s" }} />
                </div>
                
                <div style={{ padding: "0 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{portfolios[selectedPortfolio]?.length || 0} cuentas publicitarias</span>
                  <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", border: "1px solid var(--border-strong)", borderRadius: "6px", background: "transparent", fontSize: "12px", fontWeight: 600, color: "white", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    + Agregar <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div style={{ overflowY: "auto", flex: 1, padding: "0 24px 24px" }} className="custom-scrollbar">
                  {displayedAccounts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px", color: "rgba(148,163,184,0.6)", fontSize: "12px" }}>
                      No se encontraron cuentas para tu búsqueda.
                    </div>
                  ) : (
                    displayedAccounts.map((acc) => {
                      const isSelected = selectedAccountId === acc.id;
                      
                      return (
                        <div
                          key={acc.id}
                          onClick={() => {
                            onSelectAccount(acc.id);
                            setIsOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            padding: "16px",
                            borderRadius: "10px",
                            background: isSelected ? "rgba(0,129,251,0.08)" : "transparent",
                            border: isSelected ? "1px solid rgba(0,129,251,0.4)" : "1px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            marginBottom: "8px"
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent" }}
                        >
                          <div style={{ 
                            width: "20px", height: "20px", borderRadius: "50%", 
                            border: isSelected ? "1px solid var(--cyan)" : "1px solid rgba(148,163,184,0.4)",
                            background: isSelected ? "var(--cyan)" : "transparent", 
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                          }}>
                            {isSelected && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white" }} />}
                          </div>
                          
                          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <CreditCard className="w-4 h-4 text-slate-400" />
                          </div>

                          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ fontWeight: 600, fontSize: "14px", color: isSelected ? "var(--cyan)" : "white", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                              {acc.name.split(" — ")[0]}
                            </div>
                            <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.6)", display: "flex", gap: "6px" }}>
                              ID de la cuenta publicitaria: 
                              <span style={{ color: "rgba(255,255,255,0.8)" }}>{acc.id.replace("act_", "")}</span>
                            </div>
                          </div>

                          <div style={{ 
                            width: "24px", height: "24px", borderRadius: "50%", 
                            border: "1px solid var(--cyan)", display: "flex", alignItems: "center", 
                            justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "var(--cyan)",
                            background: "rgba(0,129,251,0.1)"
                          }}>
                            78
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
