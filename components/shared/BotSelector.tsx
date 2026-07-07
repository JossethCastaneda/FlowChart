"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Search, Bot } from "lucide-react";

interface CachedAsset {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  metadata: any;
}

interface BotSelectorProps {
  selectedBotId: string;
  onSelectBot: (id: string) => void;
  platformFilter?: string; // ej. "meta", "whatsapp"
}

export function BotSelector({ selectedBotId, onSelectBot, platformFilter }: BotSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bots, setBots] = useState<CachedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = "/api/integrations/assets?type=bot";
    if (platformFilter) url += `&provider=${platformFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.assets) setBots(data.assets);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [platformFilter]);

  const selectedBot = bots.find((b) => b.externalId === selectedBotId);

  const displayedBots = bots.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.externalId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" style={{ minWidth: "200px", zIndex: 61 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "8px 12px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--foreground)",
          fontSize: "13px",
          fontWeight: 600,
          textAlign: "left",
          cursor: loading ? "wait" : "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.borderColor = "var(--cyan-dim)";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <div style={{ background: "var(--surface-hover)", padding: "2px", borderRadius: "4px" }}>
          <Bot className="w-3.5 h-3.5 text-[var(--foreground)]" />
        </div>
        <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          {loading
            ? "Cargando bots..."
            : selectedBot
            ? selectedBot.name
            : "Bot (id)..."}
        </span>
        <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
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
              background: "var(--surface)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-strong)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 70,
              width: "300px",
              display: "flex",
              flexDirection: "column",
              color: "var(--foreground)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-strong)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  background: "var(--surface-hover)",
                }}
              >
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar bot por nombre o id..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--foreground)",
                    fontSize: "13px",
                    outline: "none",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: "auto", maxHeight: "250px", padding: "8px" }} className="custom-scrollbar">
              {displayedBots.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px", color: "var(--text-secondary)", fontSize: "12px" }}>
                  No se encontraron bots.
                </div>
              ) : (
                displayedBots.map((bot) => {
                  const isSelected = selectedBotId === bot.externalId;
                  return (
                    <button
                      key={bot.externalId}
                      onClick={() => {
                        onSelectBot(bot.externalId);
                        setIsOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: isSelected ? "rgba(0,129,251,0.15)" : "transparent",
                        color: "var(--foreground)",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "6px",
                          background: "var(--surface-hover)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Bot className="w-4 h-4 text-[var(--text-secondary)]" />
                      </div>
                      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {bot.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>ID: {bot.externalId}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
