import React, { useState, useRef, useEffect } from "react";
import { Plus, Copy, Edit2, Trash2, Tag, MoreHorizontal, ChevronDown, Download, Upload, Maximize2, FlaskConical, Play, Pause, Type, Search, DollarSign, Gauge, Settings, FileSpreadsheet, FileText, Table2 } from "lucide-react";

export interface TableActionBarProps {
  children?: React.ReactNode;
  selectedCount: number;
  selectedIds: string[];
  level: "campaigns" | "adsets" | "ads";
  // Duplicate menu
  onDuplicateQuick: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onShowClipboard: () => void;
  // Edit menu
  onActivate: () => void;
  onDeactivate: () => void;
  onBulkRename: () => void;
  onSearchReplace: () => void;
  onEditBudget: () => void;
  onEditSpendCap: () => void;
  // Delete
  onDelete: () => void;
  // More menu
  onCreateRule: () => void;
  onManageRules: () => void;
  onImportBulk: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onDownloadTemplate: () => void;
  // Clipboard state
  clipboardCount?: number;
}

export function TableActionBar({
  children,
  selectedCount,
  selectedIds,
  level,
  onDuplicateQuick, onCopy, onPaste, onShowClipboard,
  onActivate, onDeactivate, onBulkRename, onSearchReplace, onEditBudget, onEditSpendCap,
  onDelete,
  onCreateRule, onManageRules, onImportBulk, onExportCSV, onExportExcel, onExportPDF, onDownloadTemplate,
  clipboardCount = 0,
}: TableActionBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [exportSub, setExportSub] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setExportSub(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "d" && hasSelection) { e.preventDefault(); onDuplicateQuick(); }
        if (e.key === "c" && hasSelection) { e.preventDefault(); onCopy(); }
        if (e.key === "v" && clipboardCount > 0) { e.preventDefault(); onPaste(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasSelection, clipboardCount, onDuplicateQuick, onCopy, onPaste]);

  const toggleMenu = (menu: string) => setOpenMenu(openMenu === menu ? null : menu);

  const levelLabel = level === "campaigns" ? "campaña" : level === "adsets" ? "conjunto" : "anuncio";
  const levelLabelPlural = level === "campaigns" ? "campañas" : level === "adsets" ? "conjuntos" : "anuncios";

  const buttonStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px",
    background: "transparent", border: "1px solid var(--border)", borderRadius: "4px",
    color: "rgba(255,255,255,0.9)", fontSize: "10px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s",
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle, color: "rgba(148,163,184,0.55)", cursor: "not-allowed", borderColor: "rgba(148,163,184,0.12)",
  };

  const iconButtonStyle: React.CSSProperties = { ...buttonStyle, padding: "4px 6px" };

  const menuStyle: React.CSSProperties = {
    position: "absolute", top: "100%", left: 0, marginTop: "4px",
    background: "rgba(15, 23, 42, 0.98)", backdropFilter: "blur(10px)",
    border: "1px solid var(--border-strong)", borderRadius: "6px",
    padding: "6px 0", minWidth: "240px", zIndex: 100,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  };

  const menuItemStyle = (disabled = false): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 16px", fontSize: "13px",
    color: disabled ? "rgba(148,163,184,0.55)" : "white",
    background: "transparent", border: "none", width: "100%", textAlign: "left",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const menuSectionTitleStyle: React.CSSProperties = {
    padding: "8px 16px 4px", fontSize: "11px", fontWeight: 700, color: "white",
  };
  const menuDividerStyle: React.CSSProperties = { height: "1px", background: "var(--border)", margin: "4px 0" };

  const handleMenuItem = (action: () => void, requiresSelection = true) => {
    if (requiresSelection && !hasSelection) return;
    setOpenMenu(null);
    setExportSub(false);
    action();
  };

  const tooltip = (text: string) => hasSelection ? `${text} ${selectedCount} ${selectedCount > 1 ? levelLabelPlural : levelLabel}` : `Selecciona ${levelLabelPlural} primero`;

  return (
    <div
      ref={menuRef}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 0", borderBottom: "1px solid var(--border)", gap: "8px", flexWrap: "nowrap",
      }}
    >
      {/* Left side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
        <button style={{
          display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
          background: "#008a47", border: "none", borderRadius: "4px",
          color: "white", fontSize: "10px", fontWeight: 600, cursor: "pointer",
        }}>
          <Plus className="w-3 h-3" /> Crear
        </button>

        {/* ── DUPLICAR ── */}
        <div style={{ position: "relative" }}>
          <button style={hasSelection ? buttonStyle : disabledButtonStyle} onClick={() => hasSelection && toggleMenu("duplicar")} title={tooltip("Duplicar")}>
            <Copy className="w-3.5 h-3.5" /> Duplicar <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {openMenu === "duplicar" && (
            <div style={menuStyle}>
              <button style={menuItemStyle(!hasSelection)} onClick={() => handleMenuItem(onDuplicateQuick)}>
                <span>Duplicar rápidamente</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>Ctrl + D</span>
              </button>
              <div style={menuDividerStyle} />
              <button style={menuItemStyle(!hasSelection)} onClick={() => handleMenuItem(onCopy)}>
                <span>Copiar</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>Ctrl + C</span>
              </button>
              <button style={menuItemStyle(clipboardCount === 0)} onClick={() => handleMenuItem(onPaste, false)}>
                <span>Pegar {clipboardCount > 0 ? `(${clipboardCount})` : ""}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>Ctrl + V</span>
              </button>
              <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onShowClipboard, false)}>
                Ver elementos copiados {clipboardCount > 0 && <span style={{ background: "rgba(0,212,255,0.15)", color: "var(--cyan)", padding: "1px 6px", borderRadius: "8px", fontSize: "10px", fontWeight: 700 }}>{clipboardCount}</span>}
              </button>
            </div>
          )}
        </div>

        {/* ── EDITAR ── */}
        <div style={{ position: "relative" }}>
          <button style={hasSelection ? buttonStyle : disabledButtonStyle} onClick={() => hasSelection && toggleMenu("editar")} title={tooltip("Editar")}>
            <Edit2 className="w-3.5 h-3.5" /> Editar <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {openMenu === "editar" && (
            <div style={menuStyle}>
              <div style={menuSectionTitleStyle}>General</div>
              <button style={menuItemStyle()} onClick={() => handleMenuItem(onActivate)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Play className="w-3 h-3" style={{ color: "#34d399" }} /> Activar</span>
              </button>
              <button style={menuItemStyle()} onClick={() => handleMenuItem(onDeactivate)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Pause className="w-3 h-3" style={{ color: "#fbbf24" }} /> Desactivar</span>
              </button>
              <button style={menuItemStyle()} onClick={() => handleMenuItem(onBulkRename)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Type className="w-3 h-3" /> Nombre</span>
              </button>
              <button style={menuItemStyle()} onClick={() => handleMenuItem(onSearchReplace)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Search className="w-3 h-3" /> Buscar y reemplazar</span>
              </button>

              <div style={menuDividerStyle} />
              <div style={menuSectionTitleStyle}>Presupuesto</div>
              <button style={menuItemStyle()} onClick={() => handleMenuItem(onEditBudget)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><DollarSign className="w-3 h-3" /> Presupuesto de la campaña</span>
              </button>

              <div style={menuDividerStyle} />
              <div style={menuSectionTitleStyle}>Detalles de la campaña</div>
              <button style={menuItemStyle()} onClick={() => handleMenuItem(onEditSpendCap)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Gauge className="w-3 h-3" /> Límite de gasto</span>
              </button>
            </div>
          )}
        </div>

        {/* ── DELETE ── */}
        <button
          style={hasSelection ? iconButtonStyle : { ...iconButtonStyle, ...disabledButtonStyle }}
          onClick={() => hasSelection && onDelete()}
          title={tooltip("Eliminar")}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <button style={buttonStyle}>
          <FlaskConical className="w-3.5 h-3.5" /> Prueba A/B
        </button>

        <button style={iconButtonStyle}>
          <Tag className="w-3.5 h-3.5" />
        </button>

        {/* ── MÁS ── */}
        <div style={{ position: "relative" }}>
          <button style={buttonStyle} onClick={() => toggleMenu("mas")}>
            Más <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {openMenu === "mas" && (
            <div style={menuStyle}>
              <div style={menuSectionTitleStyle}>Reglas automáticas</div>
              <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onCreateRule, false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Plus className="w-3 h-3" /> Crear una regla nueva</span>
              </button>
              <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onManageRules, false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Settings className="w-3 h-3" /> Administrar reglas</span>
              </button>

              <div style={menuDividerStyle} />
              <div style={menuSectionTitleStyle}>Importar y exportar</div>
              <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onImportBulk, false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Upload className="w-3 h-3" /> Importar anuncios masivo</span>
              </button>

              {/* Export sub-menu */}
              <div style={{ position: "relative" }}>
                <button
                  style={menuItemStyle(false)}
                  onClick={() => setExportSub(!exportSub)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Download className="w-3 h-3" /> Exportar</span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ transform: "rotate(-90deg)" }} />
                </button>
                {exportSub && (
                  <div style={{
                    position: "absolute", top: 0, left: "100%", marginLeft: "4px",
                    background: "rgba(15,23,42,0.98)", backdropFilter: "blur(10px)",
                    border: "1px solid var(--border-strong)", borderRadius: "6px",
                    padding: "6px 0", minWidth: "180px", zIndex: 101,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}>
                    <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onExportCSV, false)}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Table2 className="w-3 h-3" style={{ color: "#34d399" }} /> Exportar CSV</span>
                    </button>
                    <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onExportExcel, false)}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileSpreadsheet className="w-3 h-3" style={{ color: "#22c55e" }} /> Exportar Excel</span>
                    </button>
                    <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onExportPDF, false)}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileText className="w-3 h-3" style={{ color: "#a78bfa" }} /> Reporte PDF</span>
                    </button>
                  </div>
                )}
              </div>

              <button style={menuItemStyle(false)} onClick={() => handleMenuItem(onDownloadTemplate, false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileSpreadsheet className="w-3 h-3" /> Descargar plantilla Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {children}
      </div>
    </div>
  );
}
