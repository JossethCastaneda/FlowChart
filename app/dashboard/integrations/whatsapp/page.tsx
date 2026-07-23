"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/layout/LanguageContext";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  Copy,
  Check,
  MessageSquare,
  Plus,
  Wifi,
  WifiOff,
  ShieldCheck,
  Zap,
  X,
  MoreVertical,
  Pencil,
  Info,
  Trash2,
  Save,
  Phone,
  ChevronDown,
  Signal,
  Globe,
  Mail,
  MapPin,
  AlignLeft,
} from "lucide-react";

// ── Env vars ────────────────────────────────────────────────────────────────
const APP_ID    = process.env.NEXT_PUBLIC_META_APP_ID || "";
// Convención PLATAFORMA_FUNCION_MODULO → NEXT_PUBLIC_META_CONFIG_WHATSAPP (fallback al legacy).
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_WHATSAPP || process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || "";

// ─── Translations ────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  es: {
    title: "WhatsApp Business",
    subtitle: "API Cloud — plantillas, webhooks y mensajería directa",
    wabaInfo: "WABA: {wabaId} · {connectedCount} línea{s} enlazada{s}",
    update: "Actualizar",
    newAccount: "Nueva cuenta de WhatsApp",
    disconnect: "Desconectar",
    connectMeta: "Conectar con Meta",
    verifying: "Verificando conexión...",
    sdkLoading: "Cargando SDK de Facebook, espera un momento.",
    missingVars: "Faltan variables NEXT_PUBLIC_META_APP_ID / NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID.",
    connectError: "Error al conectar. Intenta de nuevo.",
    networkError: "Error de red. Verifica tu conexión.",
    notConnectedTitle: "No conectado",
    notConnectedDesc: "Conecta tu cuenta de WhatsApp Business para enviar mensajes y plantillas.",
    wabaConnectedMsg: "Conectado a WABA",
    enabledLines: "Cuentas Habilitadas",
    linesLinkedCount: "{connectedCount} de {totalCount} líneas enlazadas con Zefirus",
    noLinesDesc: "No hay líneas de WhatsApp disponibles en esta cuenta WABA.",
    linkBtn: "Enlazar",
    testChat: "Prueba de Chat",
    testChatDesc: "Envía un mensaje de prueba para verificar que la línea funcione.",
    recipientNum: "Número destinatario",
    useTemplate: "Usar plantilla",
    templateNoteOk: "Recomendado -- funciona sin depender de ventana 24h",
    templateNoteWarn: "Solo si el destinatario interactuo en las ultimas 24h",
    cancel: "Cancelar",
    sendTest: "Enviar prueba",
    sending: "Enviando...",
    sentSuccess: "Enviado - ID: {id}",
    sendError: "Error al enviar",
    editProfile: "Editar perfil",
    editProfileDesc: "Actualiza la información de tu perfil comercial de WhatsApp.",
    about: "Acerca de",
    aboutPlaceholder: "Describe tu negocio brevemente...",
    address: "Dirección",
    addressPlaceholder: "Dirección física de tu negocio",
    description: "Descripción",
    descriptionPlaceholder: "Descripción larga de tu empresa o servicio...",
    email: "Email",
    emailPlaceholder: "contacto@tuempresa.com",
    vertical: "Vertical",
    website: "Website",
    websitePlaceholder: "https://tuempresa.com",
    sendImage: "Enviar Imagen",
    imageNote: "Tamaño recomendado de imagen: 640x640 píxeles",
    imageUrl: "URL de imagen",
    imageDesc: "Agrega una descripción. *Opcional",
    save: "Guardar",
    saving: "Guardando...",
    infoTitle: "Información de línea",
    disconnectLine: "Desvincular línea",
    close: "Cerrar",
    alias: "Alias",
    aliasPlaceholder: "Alias...",
    noAlias: "Sin alias",
    qualityRating: "Calidad",
    state: "Estado",
    phone: "Teléfono",
    profile: "Perfil",
    connectedStatus: "Conectada",
    disconnectedStatus: "Desconectada",
    pendingStatus: "Pendiente",
    unknownStatus: "Desconocido",
    highQuality: "Alta",
    mediumQuality: "Media",
    lowQuality: "Baja",
    reasonInfo: "Ver directrices para mejorar el envío de mensajes."
  },
  en: {
    title: "WhatsApp Business",
    subtitle: "Cloud API — templates, webhooks and direct messaging",
    wabaInfo: "WABA: {wabaId} · {connectedCount} line{s} linked",
    update: "Update",
    newAccount: "New WhatsApp Account",
    disconnect: "Disconnect",
    connectMeta: "Connect with Meta",
    verifying: "Verifying connection...",
    sdkLoading: "Facebook SDK is still loading.",
    missingVars: "Missing NEXT_PUBLIC_META_APP_ID / NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID variables.",
    connectError: "Connection error.",
    networkError: "Network error.",
    notConnectedTitle: "Not Connected",
    notConnectedDesc: "Connect your WhatsApp Business account to send messages and templates.",
    wabaConnectedMsg: "Connected to WABA",
    enabledLines: "Enabled Lines",
    linesLinkedCount: "{connectedCount} of {totalCount} lines linked with Zefirus",
    noLinesDesc: "No WhatsApp lines available in this WABA account.",
    linkBtn: "Link",
    testChat: "Test Chat",
    testChatDesc: "Send a test message to verify the line is working.",
    recipientNum: "Recipient number",
    useTemplate: "Use template",
    templateNoteOk: "Recommended -- works without depending on a 24h window",
    templateNoteWarn: "Only if the recipient interacted in the last 24h",
    cancel: "Cancel",
    sendTest: "Send test",
    sending: "Sending...",
    sentSuccess: "Sent - ID: {id}",
    sendError: "Error sending",
    editProfile: "Edit profile",
    editProfileDesc: "Update your WhatsApp business profile information.",
    about: "About",
    aboutPlaceholder: "Describe your business briefly...",
    address: "Address",
    addressPlaceholder: "Physical address of your business",
    description: "Description",
    descriptionPlaceholder: "Long description of your company or service...",
    email: "Email",
    emailPlaceholder: "contact@yourcompany.com",
    vertical: "Vertical",
    website: "Website",
    websitePlaceholder: "https://yourcompany.com",
    sendImage: "Send Image",
    imageNote: "Recommended image size: 640x640 pixels",
    imageUrl: "Image URL",
    imageDesc: "Add a description. *Optional",
    save: "Save",
    saving: "Saving...",
    infoTitle: "WhatsApp line info",
    disconnectLine: "Disconnect line",
    close: "Close",
    alias: "Alias",
    aliasPlaceholder: "Alias...",
    noAlias: "No alias",
    qualityRating: "Quality",
    state: "Status",
    phone: "Phone",
    profile: "Profile",
    connectedStatus: "Connected",
    disconnectedStatus: "Disconnected",
    pendingStatus: "Pending",
    unknownStatus: "Unknown",
    highQuality: "High",
    mediumQuality: "Medium",
    lowQuality: "Low",
    reasonInfo: "See guidelines to improve message sending."
  }
};


// ── Types ────────────────────────────────────────────────────────────────────
interface WaLine {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: string;
  status: string;
  codeVerificationStatus: string;
  isLinked: boolean;
  projectId: string | null;
  alias?: string;
  // Extra fields from API (may be undefined)
  wabaId?: string;
  isCloudApi?: boolean;
  profileInfo?: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    vertical?: string;
    websites?: string[];
    profilePictureUrl?: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface WabaStatus {
  connected: boolean;
  wabaId?: string;
  phoneNumber?: string;
  connectedAt?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function qualityColor(q: string, lang: 'es' | 'en') {
  if (q === "GREEN" || q === "HIGH")    return { color: "var(--emerald)", dot: "var(--emerald)", label: lang === "es" ? "Alta" : "High" };
  if (q === "YELLOW" || q === "MEDIUM") return { color: "var(--amber)", dot: "var(--amber)", label: lang === "es" ? "Media" : "Medium" };
  if (q === "RED" || q === "LOW")       return { color: "var(--red)", dot: "var(--red)", label: lang === "es" ? "Baja" : "Low" };
  return { color: "var(--text-secondary)", dot: "var(--text-muted)", label: "N/A" };
}

function statusInfo(s: string, lang: 'es' | 'en') {
  const norm = s?.toUpperCase() || "";
  if (norm === "APPROVED" || norm === "CONNECTED" || norm === "VERIFIED")
    return { color: "var(--emerald)", icon: <CheckCircle2 size={11} />, label: lang === "es" ? "Conectada" : "Connected" };
  if (norm.includes("BANNED") || norm.includes("RESTRICTED"))
    return { color: "var(--red)", icon: <XCircle size={11} />, label: norm };
  if (norm === "PENDING")
    return { color: "var(--amber)", icon: <AlertCircle size={11} />, label: lang === "es" ? "Pendiente" : "Pending" };
  return { color: "var(--text-secondary)", icon: <XCircle size={11} />, label: s || "Desconocido" };
}

// ── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copiar"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: copied ? "var(--emerald)" : "var(--text-secondary)", padding: "2px 4px",
        display: "inline-flex", alignItems: "center",
        transition: "color 0.2s",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ── FB SDK ───────────────────────────────────────────────────────────────────
function loadFbSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (w.FB) { resolve(); return; }
    const prevInit = w.fbAsyncInit;
    w.fbAsyncInit = function () {
      if (prevInit) prevInit();
      w.FB!.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: "v25.0" });
      resolve();
    };
    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true; js.defer = true;
      document.head.appendChild(js);
    }
  });
}

// ── WA Icon ──────────────────────────────────────────────────────────────────
const WaIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      fill="#25D366"
    />
  </svg>
);

// ── Avatar ────────────────────────────────────────────────────────────────────
function PhoneAvatar({ name, linked, profilePic }: { name: string; linked: boolean; profilePic?: string }) {
  if (profilePic) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        border: linked ? "2px solid rgba(37,211,102,0.4)" : "2px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <img src={profilePic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  const initials = name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "WA";
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
      background: linked ? "linear-gradient(135deg,#075E54,#128C7E)" : "rgba(100,116,139,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: linked ? "#fff" : "var(--text-muted)",
      border: linked ? "2px solid rgba(37,211,102,0.3)" : "2px solid rgba(255,255,255,0.06)",
    }}>
      {initials}
    </div>
  );
}

// ── Test Chat Modal ───────────────────────────────────────────────────────────
function TestChatModal({ line, onClose }: { line: WaLine; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [recipient, setRecipient] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) return;
    setSending(true); setResult(null);
    try {
      const res = await fetch("/api/whatsapp/test-call", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: line.id, recipient: recipient.replace(/\D/g, ""), useTemplate }),
      });
      const data = await res.json();
      if (res.ok && data.success) setResult({ ok: true, msg: `${lang === "es" ? "Enviado" : "Sent"} - ID: ${data.data?.messageId || "—"}` });
      else setResult({ ok: false, msg: data.error || t.sendError });
    } catch { setResult({ ok: false, msg: "t.networkError" }); }
    setSending(false);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "var(--panel-bg)",  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "linear-gradient(135deg,rgba(7,94,84,0.5),rgba(18,140,126,0.3))", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={14} style={{ color: "#25D366" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t.testChat}</p>
              <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: 0 }}>{line.displayPhoneNumber} · {line.verifiedName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSend} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{t.recipientNum}</label>
            <input type="text" required autoFocus placeholder="ej. 5215512345678" value={recipient} onChange={(e) => setRecipient(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 8, fontSize: 13, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "var(--foreground)" }}>
              <div onClick={() => setUseTemplate(!useTemplate)} style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, background: useTemplate ? "#25D366" : "rgba(255,255,255,0.06)", border: `1px solid ${useTemplate ? "#25D366" : "rgba(255,255,255,0.12)"}`, position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ position: "absolute", top: 2, left: useTemplate ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "var(--surface)", transition: "left 0.2s" }} />
              </div>
              {t.useTemplate} <code style={{ fontSize: 10, color: "var(--text-secondary)" }}>hello_world</code>
            </label>
            <p style={{ fontSize: 10, color: useTemplate ? "var(--emerald)" : "var(--amber)", margin: 0 }}>
              {useTemplate ? t.templateNoteOk : t.templateNoteWarn}
            </p>
          </div>
          {result && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: result.ok ? "rgba(16,185,129,0.06)" : "rgba(229,72,77,0.06)", border: `1px solid ${result.ok ? "rgba(16,185,129,0.2)" : "rgba(229,72,77,0.2)"}`, color: result.ok ? "var(--emerald)" : "var(--red)", fontSize: 12 }}>
              {result.msg}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>{t.cancel}</button>
            <button type="submit" disabled={sending || !recipient.trim()} style={{ flex: 2, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#25D366,#128C7E)", border: "none", color: "var(--foreground)", cursor: sending || !recipient.trim() ? "not-allowed" : "pointer", opacity: sending || !recipient.trim() ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
              {sending && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
              <Send size={12} /> {t.sendTest}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Profile Modal (Acerca de, Dirección, etc.) ───────────────────────────
const VERTICALS = ["AUTOMOTIVE","BEAUTY_SPA_AND_SALON","CLOTHING_AND_APPAREL","EDUCATION","ENTERTAINMENT","EVENT_PLANNING_AND_SERVICE","FINANCE_AND_BANKING","FOOD_AND_GROCERY","PUBLIC_SERVICE","HOTEL_AND_LODGING","MEDICAL_AND_HEALTH","NONPROFIT","PROFESSIONAL_SERVICES","SHOPPING_AND_RETAIL","TRAVEL_AND_TRANSPORTATION","RESTAURANT","NOT_A_BIZ","UNDEFINED"];

function EditProfileModal({ line, onClose, onSave }: { line: WaLine; onClose: () => void; onSave: (data: Partial<WaLine["profileInfo"]>) => void }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [about, setAbout] = useState(line.profileInfo?.about || "");
  const [address, setAddress] = useState(line.profileInfo?.address || "");
  const [description, setDescription] = useState(line.profileInfo?.description || "");
  const [email, setEmail] = useState(line.profileInfo?.email || "");
  const [vertical, setVertical] = useState(line.profileInfo?.vertical || "UNDEFINED");
  const [website, setWebsite] = useState(line.profileInfo?.websites?.[0] || "");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data: Partial<WaLine["profileInfo"]> = { about, address, description, email, vertical, websites: website ? [website] : [] };
    try {
      await fetch(`/api/whatsapp/profile/${line.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      onSave(data);
      onClose();
    } catch {
      // fail silently for now, save locally
      onSave(data);
      onClose();
    }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 12,
    background: "var(--surface-hover)", border: "1px solid var(--border)",
    color: "var(--foreground)", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "var(--panel-bg)",  display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 32px 100px rgba(0,0,0,0.7)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={15} style={{ color: "#25D366" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t.editProfile}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{line.displayPhoneNumber}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={16} /></button>
        </div>

        {/* Body - scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* About */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <AlignLeft size={11} /> {t.about}
              </label>
              <input type="text" value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t.aboutPlaceholder} style={inputStyle} />
            </div>

            {/* Address */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={11} /> {t.address}
              </label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.addressPlaceholder} style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <AlignLeft size={11} /> {t.description}
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPlaceholder} rows={3}
                style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <Mail size={11} /> {t.email}
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} style={inputStyle} />
            </div>

            {/* Vertical */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <ChevronDown size={11} /> {t.vertical}
              </label>
              <select value={vertical} onChange={(e) => setVertical(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Website */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <Globe size={11} /> {t.website}
              </label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={t.websitePlaceholder} style={inputStyle} />
            </div>

            {/* Image section */}
            <div style={{ padding: "14px", borderRadius: 10, background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 4px" }}>{t.sendImage}</p>
              <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "0 0 10px" }}>{t.imageNote}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder={t.imageUrl} style={{ ...inputStyle, fontSize: 11 }} />
                <textarea placeholder={t.imageDesc} rows={2} style={{ ...inputStyle, fontSize: 11, resize: "vertical" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>{t.cancel}</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Info Modal (+Info / 3 dots) ───────────────────────────────────────────────
function InfoModal({ line, wabaId, onClose, onUnlink }: { line: WaLine; wabaId?: string; onClose: () => void; onUnlink: () => void }) {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const q = qualityColor(line.qualityRating, lang);
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!confirm(`¿Desvincular esta línea de Zefirus? Dejará de recibir mensajes.`)) return;
    setUnlinking(true);
    await onUnlink();
    setUnlinking(false);
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "var(--panel-bg)",  display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 32px 100px rgba(0,0,0,0.7)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PhoneAvatar name={line.verifiedName || line.displayPhoneNumber} linked={line.isLinked} profilePic={line.profileInfo?.profilePictureUrl} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{line.verifiedName || "Sin nombre"}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{line.displayPhoneNumber}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={16} /></button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* WABA info section */}
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", margin: "0 0 12px", letterSpacing: "0.05em" }}>WABA info</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <InfoRow
              icon={<div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", border: "1px solid rgba(0,129,251,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={14} style={{ color: "var(--cyan)" }} /></div>}
              label="WABA"
              value={wabaId || line.wabaId || "—"}
            />
            <InfoRow
              icon={<div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Signal size={14} style={{ color: "#25D366" }} /></div>}
              label="Is Cloud API"
              value={line.isCloudApi !== false ? "true" : "false"}
            />
          </div>

          {/* WhatsApp line info */}
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", margin: "0 0 12px", letterSpacing: "0.05em" }}>Whatsapp line info</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <InfoRow
              icon={<div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={14} style={{ color: "#25D366" }} /></div>}
              label="WhatsApp Phone Id"
              value={line.id}
              copyable
            />
            <InfoRow
              icon={<div style={{ width: 32, height: 32, borderRadius: "50%", background: `${q.dot}18`, border: `1px solid ${q.dot}30`, display: "flex", alignItems: "center", justifyContent: "center" }}><Signal size={14} style={{ color: q.dot }} /></div>}
              label="Quality rating"
              value={null}
              badge={{ label: q.label, color: q.color }}
            />
          </div>

          {/* Quality reason note */}
          {(line.qualityRating === "YELLOW" || line.qualityRating === "MEDIUM" || line.qualityRating === "RED" || line.qualityRating === "LOW") && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid rgba(224,168,60,0.15)", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
              <Info size={12} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                Reason: See our guidelines on how best to send messages to your customers.
              </p>
            </div>
          )}

          {/* Disconnect button */}
          {line.isLinked && (
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              style={{ width: "100%", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", border: "none", color: "var(--red)", cursor: unlinking ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {unlinking ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
              {t.disconnectLine}
            </button>
          )}

          <div style={{ textAlign: "center", marginTop: 4 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--cyan)", fontFamily: "inherit" }}>{t.close}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, copyable, badge }: { icon: React.ReactNode; label: string; value: string | null; copyable?: boolean; badge?: { label: string; color: string } }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {icon}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 1px" }}>{label}</p>
        {badge ? (
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: `${badge.color}18`, border: `1px solid ${badge.color}30`, color: badge.color, fontSize: 11, fontWeight: 600 }}>
            {badge.label}
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{value}</span>
            {copyable && value && value !== "—" && <CopyButton text={value} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WhatsAppIntegrationPage() {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const router = useRouter();

  const [wabaStatus, setWabaStatus]       = useState<WabaStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting]       = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sdkReady, setSdkReady]           = useState(false);
  const [connectError, setConnectError]   = useState<string | null>(null);

  const [lines, setLines]               = useState<WaLine[]>([]);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesError, setLinesError]     = useState<string | null>(null);

  // Modals
  const [testLine, setTestLine]         = useState<WaLine | null>(null);
  const [editLine, setEditLine]         = useState<WaLine | null>(null);
  const [infoLine, setInfoLine]         = useState<WaLine | null>(null);

  // Alias / inline editing
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [aliasInput, setAliasInput]     = useState("");

  const [wsInfo, setWsInfo]             = useState<{ name?: string; wabaId?: string }>({});

  // ── Fetch status ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const data = await res.json();
        const wa = data.modules?.whatsapp_business;
        if (wa) {
          setWabaStatus({ connected: !!wa.connected, wabaId: wa.wabaId, phoneNumber: wa.phoneNumber, connectedAt: wa.connectedAt });
          if (wa.wabaId) setWsInfo((p) => ({ ...p, wabaId: wa.wabaId }));
        }
      }
    } catch { /* silent */ }
    setLoadingStatus(false);
  }, []);

  // ── Fetch lines ─────────────────────────────────────────────────────────────
  const fetchLines = useCallback(async () => {
    setLoadingLines(true); setLinesError(null);
    try {
      const res = await fetch("/api/whatsapp/phone-numbers");
      const data = await res.json();
      if (res.ok && data.success) {
        setLines(data.data.phoneNumbers || []);
        setProjects(data.data.projects || []);
      } else setLinesError(data.error || (lang === "es" ? "No se pudieron obtener las líneas." : "Could not retrieve WhatsApp lines."));
    } catch {
      setLinesError(lang === "es" ? "Error de red al obtener las líneas." : "Network error retrieving WhatsApp lines.");
    }
    setLoadingLines(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    fetch("/api/workspace").then((r) => r.json()).then((d) => {
      const ws = d.data?.[0] || d.workspace || d;
      setWsInfo((p) => ({ ...p, name: ws.name }));
    }).catch(() => {});
    loadFbSdk().then(() => setSdkReady(true));
  }, [fetchStatus]);

  useEffect(() => { if (wabaStatus.connected) fetchLines(); else setLines([]); }, [wabaStatus.connected, fetchLines]);

  // ── Connect via Embedded Signup ─────────────────────────────────────────────
  const handleConnect = useCallback(() => {
    const w = window as any;
    if (!sdkReady || !w.FB) { setConnectError(t.sdkLoading); return; }
    if (!APP_ID || !CONFIG_ID) { setConnectError(t.missingVars); return; }
    setConnectError(null); setConnecting(true);
    const setup: Record<string, unknown> = {};
    if (wsInfo.name) setup.business = { name: wsInfo.name };
    if (wsInfo.wabaId) setup.whatsAppBusinessAccount = { ids: [wsInfo.wabaId] };
    const pmData = { wabaId: undefined as string | undefined, phoneNumberId: undefined as string | undefined };
    let authCode: string | undefined; let cancelStep: string | undefined; let posted = false;
    const doPost = async (code: string, wabaId?: string, phoneNumberId?: string) => {
      if (posted) return; posted = true;
      try {
        const res = await fetch("/api/connect/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, ...(wabaId && { wabaId }), ...(phoneNumberId && { phoneNumberId }) }) });
        const data = await res.json();
        if (!res.ok) setConnectError(data.error || t.connectError);
        else { await fetchStatus(); fetchLines(); }
      } catch { setConnectError(t.networkError); }
      setConnecting(false);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com") return;
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          pmData.wabaId = data.data?.waba_id; pmData.phoneNumberId = data.data?.phone_number_id;
          if (authCode) { window.removeEventListener("message", onMessage); doPost(authCode, pmData.wabaId, pmData.phoneNumberId); }
        } else if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "CANCEL") cancelStep = data.data?.current_step;
      } catch { /* not JSON */ }
    };
    window.addEventListener("message", onMessage);
    const win = window as any;
    win.FB.login((response: FbLoginResponse) => {
      const code = response?.authResponse?.code;
      if (!code) {
        window.removeEventListener("message", onMessage); setConnecting(false);
        const msgs: Record<string, string> = { ASSET_SELECTION: "Cancelaste antes de seleccionar la cuenta WABA.", PHONE_REGISTRATION: "Cancelaste durante el registro.", PHONE_VERIFICATION: "Cancelaste durante la verificación." };
        setConnectError(cancelStep ? msgs[cancelStep] ?? `Cancelaste en: ${cancelStep}.` : "Conexión cancelada."); return;
      }
      authCode = code;
      if (pmData.wabaId || pmData.phoneNumberId) { window.removeEventListener("message", onMessage); doPost(code, pmData.wabaId, pmData.phoneNumberId); }
      else setTimeout(() => { window.removeEventListener("message", onMessage); doPost(code, pmData.wabaId, pmData.phoneNumberId); }, 3000);
    }, { config_id: CONFIG_ID, response_type: "code", override_default_response_type: true, extras: { setup, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3", version: "v4", features: [{ name: "app_only_install" }] } });
  }, [sdkReady, fetchStatus, fetchLines, wsInfo, t]);



  // ── Disconnect WABA ──────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!confirm(`¿${t.disconnect} WhatsApp Business? Las notificaciones y mensajes dejarán de enviarse.`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/connect/whatsapp", { method: "DELETE" });
      if (res.ok) {
        setWabaStatus({ connected: false });
        setLines([]);
      } else {
        const data = await res.json().catch(() => ({}));
        setConnectError(data.error || "Error al desconectar WhatsApp Business.");
      }
    } catch {
      setConnectError(t.networkError);
    }
    setDisconnecting(false);
  };

  // ── Link / Unlink line ───────────────────────────────────────────────────────
  const handleLink = async (phoneNumberId: string, projectId: string | null) => {
    const res = await fetch("/api/whatsapp/phone-numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumberId, projectId }) });
    const data = await res.json();
    if (res.ok && data.success) setLines((prev) => prev.map((l) => l.id === phoneNumberId ? { ...l, isLinked: true, projectId } : l));
    else alert(data.error || "Error al enlazar");
  };

  const handleUnlink = async (phoneNumberId: string) => {
    const res = await fetch("/api/whatsapp/phone-numbers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumberId }) });
    const data = await res.json();
    if (res.ok && data.success) setLines((prev) => prev.map((l) => l.id === phoneNumberId ? { ...l, isLinked: false, projectId: null } : l));
    else alert(data.error || "Error al desvincular");
  };

  const handleAliasSave = (phoneNumberId: string) => {
    setLines((prev) => prev.map((l) => l.id === phoneNumberId ? { ...l, alias: aliasInput } : l));
    setEditingAlias(null);
  };

  const connectedCount = lines.filter((l) => l.isLinked).length;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .wa-row:hover { background: rgba(37,211,102,0.03) !important; }
        .wa-row-unlinked:hover { background: rgba(255,255,255,0.025) !important; }
        .wa-icon-btn:hover { color: var(--text-secondary) !important; }
        .wa-connect-btn:hover:not(:disabled) { background: linear-gradient(135deg,#25D366,#128C7E) !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,211,102,0.25) !important; }
        .wa-action-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .wa-table-wrap { overflow-x: auto; }
        .wa-table { min-width: 820px; width: 100%; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 0, animation: "fadeIn 0.3s ease" }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#075E54,#128C7E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(37,211,102,0.25)" }}>
              <WaIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t.title}</h1>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                {wabaStatus.connected ? t.wabaInfo.replace("{wabaId}", wabaStatus.wabaId || "—").replace("{connectedCount}", String(connectedCount)).replace("{s}", connectedCount !== 1 ? "s" : "") : t.subtitle}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {wabaStatus.connected && (
              <>
                <button onClick={fetchLines} disabled={loadingLines} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: loadingLines ? "wait" : "pointer" }}>
                  <RefreshCw size={13} style={{ animation: loadingLines ? "spin 1s linear infinite" : "none" }} /> {t.update}
                </button>
                <button onClick={handleConnect} disabled={connecting || !sdkReady} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.2)", color: "#25D366", cursor: "pointer" }}>
                  <Plus size={13} /> {t.newAccount}
                </button>
                <button onClick={handleDisconnect} disabled={disconnecting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)", color: "var(--red)", cursor: "pointer" }}>
                  {disconnecting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <XCircle size={13} />}
                  {t.disconnect}
                </button>
              </>
            )}
            {!wabaStatus.connected && !loadingStatus && (
              <button onClick={handleConnect} disabled={connecting || !sdkReady} className="wa-connect-btn" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", cursor: connecting || !sdkReady ? "wait" : "pointer", opacity: connecting || !sdkReady ? 0.6 : 1, transition: "all 0.25s", fontFamily: "inherit" }}>
                {connecting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <WaIcon size={16} />}
                {connecting ? "Conectando..." : t.connectMeta}
              </button>
            )}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {connectError && (
          <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)", color: "var(--red)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {connectError}
            <button onClick={() => setConnectError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer" }}><X size={12} /></button>
          </div>
        )}

        {/* ── Loading status ───────────────────────────────────────────────── */}
        {loadingStatus && (
          <div style={{ height: 180, borderRadius: 14, background: "var(--surface-hover)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-secondary)", fontSize: 13 }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> {t.verifying}
          </div>
        )}

        {/* ── Not connected ────────────────────────────────────────────────── */}
        {!loadingStatus && !wabaStatus.connected && (
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>

            {/* Hero */}
            <div style={{ padding: "40px 40px 28px", background: "var(--surface-hover)", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
              <div style={{ width: 68, height: 68, borderRadius: 20, background: "linear-gradient(135deg,#075E54,#128C7E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(37,211,102,0.28)" }}>
                <WaIcon size={34} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>Conecta tu WhatsApp Business</h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 440 }}>Usaremos el inicio de sesión de Meta. El proceso toma menos de un minuto.</p>
              </div>
            </div>

            {/* Guide */}
            <div style={{ padding: "24px 32px 28px" }}>

              {/* Tip callout */}
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid rgba(224,168,60,0.18)", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
                <AlertCircle size={14} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.65 }}>
                  Meta muestra campos como <em>Catálogo, Página, Instagram, Píxel y Cuenta publicitaria</em> pero <strong style={{ color: "var(--foreground)" }}>todos son opcionales</strong>.
                  Solo selecciona tu <strong style={{ color: "#25D366" }}>Cuenta de WhatsApp Business</strong> y presiona <em>Siguiente</em> en el resto.
                </p>
              </div>

              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {[
                  { step: "1", text: "Acepta las condiciones → Continuar" },
                  { step: "2", text: "Selecciona tu Cuenta de WhatsApp Business", highlight: true },
                  { step: "3", text: "Catálogo, Página, Instagram, Píxel → dejar vacíos → Siguiente" },
                  { step: "4", text: "Completa el registro del número si se solicita" },
                ].map(({ step, text, highlight }) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: highlight ? "rgba(37,211,102,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${highlight ? "rgba(37,211,102,0.4)" : "rgba(255,255,255,0.08)"}`, color: highlight ? "#25D366" : "var(--text-muted)" }}>
                      {step}
                    </div>
                    <p style={{ fontSize: 12, color: highlight ? "var(--foreground)" : "var(--text-secondary)", margin: 0, fontWeight: highlight ? 600 : 400 }}>{text}</p>
                  </div>
                ))}
              </div>

              {/* Button */}
              <button
                onClick={handleConnect}
                disabled={connecting || !sdkReady}
                className="wa-connect-btn"
                style={{ width: "100%", padding: "13px", borderRadius: 11, fontSize: 14, fontWeight: 700, background: connecting ? "rgba(37,211,102,0.25)" : "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.4)", color: "#25D366", cursor: connecting || !sdkReady ? "wait" : "pointer", opacity: connecting || !sdkReady ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", transition: "all 0.25s" }}
              >
                {connecting
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Abriendo Meta...</>
                  : <><WaIcon size={18} /> {t.connectMeta}</>
                }
              </button>
              {!sdkReady && !connecting && (
                <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Cargando SDK de Facebook...</p>
              )}
            </div>

            {/* Features footer */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", borderTop: "1px solid var(--border)" }}>
              {[
                { icon: <Wifi size={14} style={{ color: "#25D366" }} />, title: "Cloud API", desc: "API oficial de Meta" },
                { icon: <ShieldCheck size={14} style={{ color: "var(--cyan)" }} />, title: "Seguro", desc: "Tokens cifrados AES-256" },
                { icon: <MessageSquare size={14} style={{ color: "var(--purple)" }} />, title: "Notificaciones", desc: "Alertas de tareas en WA" },
                { icon: <Zap size={14} style={{ color: "var(--amber)" }} />, title: "Plantillas", desc: "Mensajes proactivos" },
              ].map((f, i) => (
                <div key={i} style={{ padding: "16px 20px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>{f.icon}<span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{f.title}</span></div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ── Connected: BotMaker-style table ─────────────────────────────── */}
        {!loadingStatus && wabaStatus.connected && (
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>

            {/* Table header — sticky blue like BotMaker */}
            <div className="wa-table-wrap">
              <table className="wa-table" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--cyan)" }}>
                    {["Perfil", "Teléfono", "Estado", "Calidad", "Type", "Test WhatsApp", "Alias", "+Info"].map((h) => (
                      <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.04em", textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid rgba(59,130,246,0.3)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingLines && (
                    <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}><Loader2 size={16} style={{ animation: "spin 1s linear infinite", display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />Cargando líneas desde Meta...</td></tr>
                  )}
                  {linesError && (
                    <tr><td colSpan={8} style={{ padding: "16px 20px" }}>
                      <div style={{ color: "var(--red)", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <AlertCircle size={13} /> {linesError}
                        <button onClick={fetchLines} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                          <RefreshCw size={11} /> Reintentar
                        </button>
                      </div>
                    </td></tr>
                  )}
                  {!loadingLines && !linesError && lines.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                      <WifiOff size={22} style={{ color: "var(--text-secondary)", display: "block", margin: "0 auto 12px" }} />
                      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>No hay números en esta WABA</p>
                      <p style={{ margin: 0, fontSize: 11 }}>Agrega un número en Meta Business Manager y reconecta.</p>
                    </td></tr>
                  )}
                  {!loadingLines && lines.map((line, idx) => {
                    const q  = qualityColor(line.qualityRating, lang);
                    const st = statusInfo(line.status, lang);
                    const isEditing = editingAlias === line.id;
                    const isEvenRow = idx % 2 === 0;

                    return (
                      <tr
                        key={line.id}
                        className={line.isLinked ? "wa-row" : "wa-row-unlinked"}
                        style={{ background: isEvenRow ? "rgba(255,255,255,0.01)" : "transparent", transition: "background 0.15s", borderBottom: "1px solid var(--border-neutral)" }}
                      >
                        {/* Perfil (avatar) */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <PhoneAvatar name={line.verifiedName || line.displayPhoneNumber} linked={line.isLinked} profilePic={line.profileInfo?.profilePictureUrl} />
                        </td>

                        {/* Teléfono */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 12, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{line.displayPhoneNumber}</span>
                            <CopyButton text={line.displayPhoneNumber} />
                          </div>
                        </td>

                        {/* Estado */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, boxShadow: `0 0 4px ${st.color}` }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
                          </div>
                        </td>

                        {/* Calidad */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {(line.qualityRating === "YELLOW" || line.qualityRating === "MEDIUM" || line.qualityRating === "RED" || line.qualityRating === "LOW") && (
                              <AlertCircle size={11} style={{ color: q.color }} />
                            )}
                            <span style={{ fontSize: 11, fontWeight: 600, color: q.color }}>{q.label}</span>
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: "var(--surface)", border: "1px solid rgba(96,165,250,0.15)", color: "var(--cyan)" }}>
                            Cloud
                          </span>
                        </td>

                        {/* Test WhatsApp */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          {line.isLinked ? (
                            <button onClick={() => setTestLine(line)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.25)", color: "#25D366", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                              <WaIcon size={12} /> Chat
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>—</span>
                          )}
                        </td>

                        {/* Alias */}
                        <td style={{ padding: "10px 14px", minWidth: 160 }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <input autoFocus value={aliasInput} onChange={(e) => setAliasInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAliasSave(line.id); if (e.key === "Escape") setEditingAlias(null); }}
                                placeholder={t.aliasPlaceholder}
                                style={{ flex: 1, padding: "4px 8px", borderRadius: 5, fontSize: 11, background: "var(--surface-hover)", border: "1px solid rgba(59,130,246,0.3)", color: "var(--foreground)", outline: "none", fontFamily: "inherit", minWidth: 0 }} />
                              <button onClick={() => handleAliasSave(line.id)} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, color: "var(--cyan)", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center" }}><Check size={11} /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingAlias(line.id); setAliasInput(line.alias || line.verifiedName || ""); }}
                              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 0", fontFamily: "inherit" }} title="Editar alias">
                              <span style={{ fontSize: 12, color: line.alias ? "var(--foreground)" : "var(--text-secondary)" }}>
                                {line.alias || line.verifiedName || t.noAlias}
                              </span>
                            </button>
                          )}
                        </td>

                        {/* +Info (3 dots) */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {/* Edit button (pencil / edit profile) */}
                            <button
                              onClick={() => setEditLine(line)}
                              title="Editar perfil"
                              className="wa-icon-btn"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 5, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s" }}
                            >
                              <Pencil size={13} />
                            </button>

                            {/* 3 dots info */}
                            <button
                              onClick={() => setInfoLine(line)}
                              title="Ver info WABA"
                              className="wa-icon-btn"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 5, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s" }}
                            >
                              <MoreVertical size={13} />
                            </button>

                            {/* Link / Unlink */}
                            {!line.isLinked ? (
                              <button onClick={() => handleLink(line.id, null)}
                                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--emerald-dim)", border: "1px solid rgba(37,211,102,0.2)", color: "#25D366", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                                <Plus size={10} /> {t.linkBtn}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loadingLines && lines.length > 0 && (
              <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#25D366", boxShadow: "0 0 6px #25D36660", animation: "pulse-dot 2s ease-in-out infinite" }} />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {t.linesLinkedCount.replace("{connectedCount}", String(connectedCount)).replace("{totalCount}", String(lines.length))}
                  </span>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)" }}>
                  <Wifi size={11} /> Cloud API v20.0
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {testLine && <TestChatModal line={testLine} onClose={() => setTestLine(null)} />}

      {editLine && (
        <EditProfileModal
          line={editLine}
          onClose={() => setEditLine(null)}
          onSave={(data) => {
            setLines((prev) => prev.map((l) => l.id === editLine.id ? { ...l, profileInfo: { ...l.profileInfo, ...data } } : l));
          }}
        />
      )}

      {infoLine && (
        <InfoModal
          line={infoLine}
          wabaId={wabaStatus.wabaId}
          onClose={() => setInfoLine(null)}
          onUnlink={async () => { await handleUnlink(infoLine.id); setInfoLine(null); }}
        />
      )}
    </>
  );
}
