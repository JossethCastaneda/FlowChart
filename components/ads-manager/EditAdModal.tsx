"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Save, Loader2, AlertCircle, Image, Eye } from "lucide-react";
import { useMetaUpdate } from "@/hooks/useMetaUpdate";
import { AdPreview, AdCreativeData } from "./AdPreview";
import { inputStyle, selectStyle, toggleStyle } from "./EditCampaignModal";

/** Devuelve el hostname de una URL, o undefined si aún no es válida (input parcial). */
function safeHostname(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return undefined;
  }
}

function FormGroup({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
        {hint && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--text-muted)", fontWeight: 400, textTransform: "none", fontStyle: "italic" }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Más información" },
  { value: "SHOP_NOW", label: "Comprar" },
  { value: "SEND_MESSAGE", label: "Enviar mensaje" },
  { value: "CONTACT_US", label: "Contáctanos" },
  { value: "SIGN_UP", label: "Registrarse" },
  { value: "DOWNLOAD", label: "Descargar" },
  { value: "BOOK_TRAVEL", label: "Reservar" },
  { value: "SUBSCRIBE", label: "Suscribirse" },
  { value: "GET_QUOTE", label: "Obtener cotización" },
  { value: "APPLY_NOW", label: "Aplicar ahora" },
  { value: "GET_OFFER", label: "Ver oferta" },
  { value: "OPEN_LINK", label: "Abrir enlace" },
];

interface EditAdModalProps {
  ad: any;
  adAccountId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditAdModal({ ad, adAccountId, onClose, onSaved }: EditAdModalProps) {
  const { updateAd, loading } = useMetaUpdate();
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "creative" | "preview">("general");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Extract creative data from the ad object
  const existingCreative = ad.creative || {};
  const existingStorySpec = existingCreative.object_story_spec || {};
  const existingLinkData = existingStorySpec.link_data || existingStorySpec.video_data || {};

  // -- General --
  const [name, setName] = useState(ad.name || "");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">(ad.status === "ACTIVE" ? "ACTIVE" : "PAUSED");

  // -- Creative fields --
  const [message, setMessage] = useState(existingLinkData.message || existingCreative.body || "");
  const [headline, setHeadline] = useState(existingLinkData.name || existingCreative.title || "");
  const [description, setDescription] = useState(existingLinkData.description || existingCreative.description || "");
  const [ctaType, setCtaType] = useState(existingLinkData.call_to_action?.type || existingCreative.call_to_action_type || "LEARN_MORE");
  const [ctaUrl, setCtaUrl] = useState(existingLinkData.call_to_action?.value?.link || existingLinkData.link || "");
  const [imageUrl, setImageUrl] = useState(existingCreative.image_url || existingCreative.thumbnail_url || "");

  // Creative has changed if any creative field differs from original
  const creativeChanged =
    message !== (existingLinkData.message || existingCreative.body || "") ||
    headline !== (existingLinkData.name || existingCreative.title || "") ||
    description !== (existingLinkData.description || "") ||
    ctaType !== (existingLinkData.call_to_action?.type || existingCreative.call_to_action_type || "LEARN_MORE") ||
    ctaUrl !== (existingLinkData.call_to_action?.value?.link || existingLinkData.link || "");

  // -- Live preview data --
  const previewData: AdCreativeData = {
    pageName: existingStorySpec.page_id ? `Página ${existingStorySpec.page_id}` : "Tu Página",
    pageAvatar: undefined,
    message,
    headline,
    description,
    ctaType,
    ctaUrl,
    // new URL() lanza con input parcial mientras el usuario teclea la URL → crasheaba el
    // render de todo el modal. Parseo defensivo: si aún no es válida, sin displayUrl.
    displayUrl: safeHostname(ctaUrl),
    imageUrl: imageUrl || existingCreative.thumbnail_url,
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setLocalError(null);
    if (!name.trim()) { setLocalError("El nombre es obligatorio"); return; }

    const fields: any = { name };
    if (status !== ad.status) fields.status = status;

    // If creative changed, build new creative spec
    if (creativeChanged && existingStorySpec.page_id) {
      const pageId = existingStorySpec.page_id;
      const newCreative: any = {
        name: `${name} - Creativo`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message,
            name: headline,
            description,
            link: ctaUrl || existingLinkData.link,
            call_to_action: {
              type: ctaType,
              value: { link: ctaUrl || existingLinkData.link },
            },
          },
        },
      };
      // Keep image hash if no new image uploaded
      if (existingCreative.image_hash) {
        newCreative.object_story_spec.link_data.image_hash = existingCreative.image_hash;
      } else if (imageUrl && imageUrl.startsWith("http")) {
        newCreative.object_story_spec.link_data.picture = imageUrl;
      }
      fields.creative = newCreative;
      fields.adAccountId = adAccountId;
    }

    const result = await updateAd(ad.id, fields);
    if (result.success) {
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } else {
      setLocalError(result.error || "Error desconocido");
    }
  };

  const TABS = [
    { key: "general", label: "General", icon: <Save className="w-3.5 h-3.5" /> },
    { key: "creative", label: "Creativo", icon: <Image className="w-3.5 h-3.5" /> },
    { key: "preview", label: "Vista Previa", icon: <Eye className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "var(--panel-bg)", 
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          // Wider when showing preview
          maxWidth: activeTab === "preview" ? 760 : 560,
          maxHeight: "92vh",
          boxShadow: "0 24px 64px -12px rgba(0,0,0,0.8)",
          display: "flex", flexDirection: "column",
          animation: "fadeInScale 0.2s ease",
          transition: "max-width 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Image className="w-4 h-4" style={{ color: "var(--emerald)" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Editar Anuncio</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>ID: {ad.id}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {creativeChanged && activeTab === "creative" && (
              <div style={{ fontSize: 10, color: "var(--amber)", background: "var(--surface)", padding: "3px 8px", borderRadius: 20, border: "1px solid rgba(224,168,60,0.3)" }}>
                Creativo modificado
              </div>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, display: "flex", alignItems: "center", borderRadius: 6 }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "10px 12px",
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === tab.key ? "var(--cyan)" : "transparent"}`,
                color: activeTab === tab.key ? "var(--cyan)" : "var(--text-secondary)",
                fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: -1, transition: "color 0.15s",
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "preview" && (
                <span style={{ marginLeft: 4, fontSize: 9, background: "var(--cyan-dim)", color: "var(--cyan)", padding: "1px 5px", borderRadius: 10 }}>
                  LIVE
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {activeTab === "general" && (
            <>
              <FormGroup label="Nombre del anuncio">
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Nombre del anuncio" />
              </FormGroup>
              <FormGroup label="Estado">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ACTIVE", "PAUSED"] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(s)} style={{ ...toggleStyle, background: status === s ? (s === "ACTIVE" ? "rgba(52,183,124,0.15)" : "rgba(224,168,60,0.1)") : "rgba(255,255,255,0.09)", borderColor: status === s ? (s === "ACTIVE" ? "var(--emerald)" : "var(--amber)") : "var(--border)", color: status === s ? (s === "ACTIVE" ? "var(--emerald)" : "var(--amber)") : "var(--text-secondary)" }}>
                      {s === "ACTIVE" ? "? Activo" : "? Pausado"}
                    </button>
                  ))}
                </div>
              </FormGroup>
              {/* Ad info read-only */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormGroup label="ID del creativo">
                  <div style={{ ...inputStyle as any, color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{existingCreative.id || "—"}</div>
                </FormGroup>
                <FormGroup label="Conjunto">
                  <div style={{ ...inputStyle as any, color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{ad.adset_id || "—"}</div>
                </FormGroup>
              </div>
            </>
          )}

          {activeTab === "creative" && (
            <>
              {!existingStorySpec.page_id && (
                <div style={{ padding: "10px 12px", background: "var(--surface)", border: "1px solid rgba(224,168,60,0.2)", borderRadius: 8, fontSize: 11, color: "rgba(224,168,60,0.9)", lineHeight: 1.5, marginBottom: 4 }}>
                  ?? Los datos del creativo no están disponibles completamente desde la API. Los cambios de creativo pueden no aplicarse correctamente si la información de la página no está disponible.
                </div>
              )}

              <FormGroup label="Texto principal (body)">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Escribe el texto principal del anuncio..."
                  style={{ ...inputStyle as any, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
              </FormGroup>

              <FormGroup label="Título (headline)">
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Título del anuncio" style={inputStyle} />
              </FormGroup>

              <FormGroup label="Descripción">
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional)" style={inputStyle} />
              </FormGroup>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormGroup label="URL de destino">
                  <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
                </FormGroup>
                <FormGroup label="Llamada a la acción">
                  <select value={ctaType} onChange={(e) => setCtaType(e.target.value)} style={selectStyle}>
                    {CTA_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <FormGroup label="URL de imagen" hint="Solo para previsualización">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... (opcional)" style={inputStyle} />
              </FormGroup>

              <div style={{ padding: "10px 12px", background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.08)", borderRadius: 8, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                ?? Los creativos en Meta son <strong style={{ color: "var(--foreground)" }}>inmutables</strong>. Al guardar con cambios de creativo, se creará automáticamente un nuevo creativo y se asignará al anuncio.
              </div>
            </>
          )}

          {activeTab === "preview" && (
            <AdPreview creative={previewData} />
          )}

          {localError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.3)", borderRadius: 8, fontSize: 12, color: "var(--red)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {activeTab === "creative" && creativeChanged
              ? "?? Se creará un nuevo creativo al guardar"
              : activeTab === "preview" ? "Vista previa en tiempo real"
              : ""}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading || saved} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: saved ? "rgba(52,183,124,0.2)" : "rgba(0,129,251,0.2)", border: `1px solid ${saved ? "var(--emerald)" : "var(--cyan)"}`, borderRadius: 8, color: saved ? "var(--emerald)" : "var(--cyan)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? "? Guardado" : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
