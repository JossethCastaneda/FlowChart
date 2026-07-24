"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Image as ImageIcon, AlertTriangle, Loader2, PauseCircle, Eye, Send } from "lucide-react";

interface AdSet { id: string; name: string; campaign_id?: string; campaign_name?: string }
interface Page { id: string; name: string; picture?: string }
interface Props {
  adAccountId: string;
  adsets: AdSet[];
  onClose: () => void;
  onCreated: (id: string) => void;
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

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", background: "var(--surface-hover)",
  border: "1px solid var(--hairline)", borderRadius: 6, color: "var(--foreground)",
  fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 5, fontWeight: 500 };

export function CreateAdModal({ adAccountId, adsets, onClose, onCreated }: Props) {
  // State
  const [adsetId, setAdsetId] = useState(adsets[0]?.id || "");
  const [name, setName] = useState("");
  const [pageId, setPageId] = useState("");
  const [message, setMessage] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Pages
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    setLoadingPages(true);
    fetch("/api/meta/pages?module=ads")
      .then(r => r.json())
      .then(d => {
        const list: Page[] = (d.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          picture: p.picture,
        }));
        setPages(list);
        if (list.length > 0 && !pageId) setPageId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingPages(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPage = useMemo(() => pages.find(p => p.id === pageId), [pages, pageId]);

  const canSubmit = !!adsetId && !!name.trim() && !!pageId && (!!message || !!headline || !!imageUrl);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/meta/ads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          adsetId,
          name: name.trim(),
          pageId,
          message: message || undefined,
          headline: headline || undefined,
          description: description || undefined,
          link: link || undefined,
          imageUrl: imageUrl || undefined,
          callToAction: cta,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        onCreated(data.object_id);
      } else {
        setError(data.user_message || data.error || "No se pudo crear el anuncio.");
      }
    } catch {
      setError("Error de red al crear el anuncio.");
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "4vh 16px", background: "var(--overlay-dark)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, background: "var(--surface)", border: "1px solid rgba(52,199,89,0.25)", borderRadius: 10, animation: "fadeInScale 0.2s ease-out" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--hairline)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
            <Send style={{ width: 16, height: 16, color: "#34c759" }} /> Crear anuncio
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
          {/* AdSet selector */}
          <div>
            <label style={lbl}>Conjunto de anuncios *</label>
            <select style={{ ...inp, cursor: "pointer" }} value={adsetId} onChange={e => setAdsetId(e.target.value)}>
              {adsets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.campaign_name ? ` (${a.campaign_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Page selector */}
          <div>
            <label style={lbl}>Página de Facebook * (identidad del anuncio)</label>
            {loadingPages ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", padding: 8 }}>
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Cargando páginas…
              </div>
            ) : pages.length > 0 ? (
              <select style={{ ...inp, cursor: "pointer" }} value={pageId} onChange={e => setPageId(e.target.value)}>
                {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 11, color: "var(--amber)", padding: 8 }}>
                No se encontraron páginas vinculadas. Conecta una en Integraciones.
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={lbl}>Nombre del anuncio *</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Ad — Promo verano — Imagen 1" autoFocus />
          </div>

          {/* Divider: Creative */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <ImageIcon style={{ width: 13, height: 13 }} /> Contenido del anuncio
            <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          </div>

          {/* Message (primary text) */}
          <div>
            <label style={lbl}>Texto principal</label>
            <textarea
              style={{ ...inp, minHeight: 80, resize: "vertical" }}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="El texto que aparecerá sobre la imagen/video…"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Título</label>
              <input style={inp} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Título principal del anuncio" />
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <input style={inp} value={description} onChange={e => setDescription(e.target.value)} placeholder="Texto secundario debajo del título" />
            </div>
          </div>

          {/* URL */}
          <div>
            <label style={lbl}>URL de destino</label>
            <input style={inp} type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://tu-sitio.com/landing" />
          </div>

          {/* Image URL */}
          <div>
            <label style={lbl}>URL de imagen</label>
            <input style={inp} type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" />
            {imageUrl && (
              <div style={{ marginTop: 8, borderRadius: 6, overflow: "hidden", border: "1px solid var(--hairline)", maxHeight: 200 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Preview" style={{ width: "100%", objectFit: "cover", maxHeight: 200 }} onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>

          {/* CTA */}
          <div>
            <label style={lbl}>Llamada a la acción</label>
            <select style={{ ...inp, cursor: "pointer" }} value={cta} onChange={e => setCta(e.target.value)}>
              {CTA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Preview toggle */}
          {(message || headline || imageUrl) && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                background: "var(--row-hover)", border: "1px solid var(--hairline)", borderRadius: 6,
                color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Eye style={{ width: 14, height: 14 }} /> {showPreview ? "Ocultar preview" : "Ver preview"}
            </button>
          )}

          {showPreview && (
            <div style={{ background: "var(--row-hover)", borderRadius: 10, border: "1px solid var(--hairline)", padding: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>
                  {selectedPage?.name?.[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{selectedPage?.name || "Página"}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Patrocinado</div>
                </div>
              </div>
              {message && <div style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 10, lineHeight: 1.5 }}>{message}</div>}
              {imageUrl && (
                <div style={{ borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Ad" style={{ width: "100%", maxHeight: 240, objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              {(headline || description || link) && (
                <div style={{ background: "var(--surface-hover)", borderRadius: 6, padding: 12, border: "1px solid var(--hairline)" }}>
                  {link && <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, textTransform: "uppercase" }}>{(() => { try { return new URL(link).hostname; } catch { return link; } })()}</div>}
                  {headline && <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{headline}</div>}
                  {description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{description}</div>}
                  <div style={{ marginTop: 8, display: "inline-block", padding: "6px 16px", borderRadius: 4, background: "rgba(0,129,251,0.1)", border: "1px solid rgba(0,129,251,0.3)", color: "var(--cyan)", fontSize: 12, fontWeight: 600 }}>
                    {CTA_OPTIONS.find(o => o.value === cta)?.label || cta}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safety warning */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <PauseCircle style={{ width: 16, height: 16, color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "var(--amber)" }}>
              El anuncio se crea <strong>en pausa</strong>. No se publica ni gasta hasta que actives toda la cadena (campaña → conjunto → anuncio) en Meta.
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)" }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "var(--red)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: "1px solid var(--hairline)" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: "inherit" }}>
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !canSubmit}
            style={{
              padding: "9px 22px",
              background: canSubmit && !saving ? "linear-gradient(135deg, #34c759, #30b050)" : "rgba(52,199,89,0.3)",
              border: "1px solid rgba(52,199,89,0.4)",
              color: "#fff",
              cursor: canSubmit && !saving ? "pointer" : "not-allowed",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 6,
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              opacity: saving || !canSubmit ? 0.6 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <PauseCircle style={{ width: 14, height: 14 }} />}
            Crear en pausa
          </button>
        </div>
      </div>
    </div>
  );
}
