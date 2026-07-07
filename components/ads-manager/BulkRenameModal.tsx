"use client";
import React, { useState, useMemo } from "react";
import { X, Search, Type, ArrowRight } from "lucide-react";

interface BulkRenameModalProps {
  items: { id: string; name: string }[];
  onClose: () => void;
  onApply: (updates: { id: string; newName: string }[]) => Promise<void>;
}

type Mode = "prefix" | "suffix" | "replace";

export function BulkRenameModal({ items, onClose, onApply }: BulkRenameModalProps) {
  const [mode, setMode] = useState<Mode>("prefix");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    return items.map((item) => {
      let newName = item.name;
      if (mode === "prefix" && prefix) {
        newName = prefix + item.name;
      } else if (mode === "suffix" && suffix) {
        newName = item.name + suffix;
      } else if (mode === "replace" && searchText) {
        if (wholeWord) {
          const flags = caseSensitive ? "g" : "gi";
          const regex = new RegExp(`\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, flags);
          newName = item.name.replace(regex, replaceText);
        } else if (caseSensitive) {
          newName = item.name.split(searchText).join(replaceText);
        } else {
          const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          newName = item.name.replace(regex, replaceText);
        }
      }
      return { id: item.id, oldName: item.name, newName, changed: newName !== item.name };
    });
  }, [items, mode, prefix, suffix, searchText, replaceText, caseSensitive, wholeWord]);

  const affectedCount = preview.filter((p) => p.changed).length;

  const handleApply = async () => {
    const updates = preview.filter((p) => p.changed).map((p) => ({ id: p.id, newName: p.newName }));
    if (updates.length === 0) return;
    setLoading(true);
    await onApply(updates);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "12px", background: "var(--surface-hover)",
    border: "1px solid var(--border)", borderRadius: "6px", color: "var(--foreground)", outline: "none",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--panel-bg)", backdropFilter: "blur(8px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101,
        width: "520px", maxWidth: "90vw", background: "rgba(8,14,28,0.98)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(59,130,246,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
            Renombrar {items.length} elemento{items.length > 1 ? "s" : ""}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "14px" }}>
            {([
              { key: "prefix" as Mode, label: "Agregar prefijo" },
              { key: "suffix" as Mode, label: "Agregar sufijo" },
              { key: "replace" as Mode, label: "Buscar y reemplazar" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setMode(t.key)}
                style={{
                  padding: "6px 12px", fontSize: "11px", fontWeight: 600, borderRadius: "5px", cursor: "pointer",
                  background: mode === t.key ? "rgba(59,130,246,0.1)" : "transparent",
                  border: `1px solid ${mode === t.key ? "rgba(59,130,246,0.2)" : "transparent"}`,
                  color: mode === t.key ? "var(--cyan)" : "var(--text-muted)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Inputs */}
          {mode === "prefix" && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", display: "block" }}>Prefijo</label>
              <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Ej: [Q1]_" style={inputStyle} autoFocus />
            </div>
          )}
          {mode === "suffix" && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", display: "block" }}>Sufijo</label>
              <input value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="Ej: _v2" style={inputStyle} autoFocus />
            </div>
          )}
          {mode === "replace" && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", display: "block" }}>Buscar</label>
                  <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Texto a buscar" style={inputStyle} autoFocus />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", display: "block" }}>Reemplazar con</label>
                  <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Texto nuevo" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", cursor: "pointer" }}>
                  <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} /> Sensible a mayúsculas
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", cursor: "pointer" }}>
                  <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> Solo palabras completas
                </label>
              </div>
            </div>
          )}

          {/* Preview */}
          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "6px" }}>
            Preview — {affectedCount} de {items.length} afectado{affectedCount !== 1 ? "s" : ""}
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto", borderRadius: "6px", border: "1px solid var(--hairline)" }} className="custom-scrollbar">
            {preview.map((p) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
                border: "1px solid var(--hairline)",
                opacity: p.changed ? 1 : 0.4,
              }}>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.oldName}
                </span>
                <ArrowRight className="w-3 h-3" style={{ color: p.changed ? "var(--cyan)" : "rgba(148,163,184,0.65)", flexShrink: 0 }} />
                <span style={{ fontSize: "10px", color: p.changed ? "white" : "rgba(148,163,184,0.65)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: p.changed ? 600 : 400 }}>
                  {p.newName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--hairline)", borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={affectedCount === 0 || loading}
            style={{
              padding: "7px 14px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", cursor: affectedCount > 0 ? "pointer" : "not-allowed",
              background: affectedCount > 0 ? "rgba(59,130,246,0.1)" : "rgba(148,163,184,0.05)",
              border: `1px solid ${affectedCount > 0 ? "rgba(59,130,246,0.25)" : "rgba(148,163,184,0.18)"}`,
              color: affectedCount > 0 ? "var(--cyan)" : "rgba(148,163,184,0.65)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Aplicando..." : `Aplicar a ${affectedCount} elemento${affectedCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
